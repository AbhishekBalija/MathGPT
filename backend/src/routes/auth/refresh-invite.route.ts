/**
 * Refresh Invite Token Endpoint
 *
 * POST /auth/refresh-invite
 *
 * Generates a new invite token for approved users whose token has expired.
 * Sends a new invite email with the fresh token.
 */

import { z } from "zod";
import { MongoClient, Collection } from "mongodb";
import { randomBytes } from "crypto";
import { route } from "../../lib/http";
import { logger } from "../../lib/logger";
import { runInBackground } from "../../lib/background";
import { sendWaitlistInvite } from "../../events/waitlist-invite";

// Waitlist document type
interface WaitlistEntry {
  email: string;
  source: string;
  createdAt: Date;
  notified: boolean;
  inviteToken?: string;
  inviteExpiresAt?: Date;
  approved: boolean;
  approvedAt?: Date;
  registered: boolean;
}

// Request schema
const refreshInviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// MongoDB connection cache
let client: MongoClient | null = null;
let waitlistCollection: Collection<WaitlistEntry> | null = null;

async function getWaitlistCollection(): Promise<Collection<WaitlistEntry>> {
  if (waitlistCollection) {
    return waitlistCollection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (!client) {
    client = new MongoClient(uri);
    try {
      await client.connect();
    } catch (error) {
      client = null;
      throw new Error(
        `Failed to connect to MongoDB: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  const dbName = process.env.MONGODB_DATABASE || "MathGPTDB";
  const db = client.db(dbName);
  waitlistCollection = db.collection<WaitlistEntry>("waitlist");
  return waitlistCollection;
}

// POST /auth/refresh-invite
export const refreshInviteRoute = route(async (req) => {
  try {
    const data = refreshInviteSchema.parse(req.body);
    const normalizedEmail = data.email.toLowerCase().trim();

    logger.info("Invite token refresh requested", { email: normalizedEmail });

    const waitlist = await getWaitlistCollection();

    // Find the waitlist entry
    const entry = await waitlist.findOne({ email: normalizedEmail });

    // Check various conditions
    if (!entry) {
      return {
        status: 403 as const,
        body: {
          error:
            "This email is not on our waitlist. Please join the waitlist first.",
          code: "NOT_ON_WAITLIST",
        },
      };
    }

    if (entry.registered) {
      return {
        status: 403 as const,
        body: {
          error: "This email is already registered. Please log in instead.",
          code: "ALREADY_REGISTERED",
        },
      };
    }

    if (!entry.approved) {
      return {
        status: 403 as const,
        body: {
          error:
            "Your invite is still pending approval. We'll email you once approved!",
          code: "NOT_APPROVED",
        },
      };
    }

    // Rate limit: Only allow refresh every 5 minutes
    const REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
    if (entry.inviteExpiresAt) {
      // Calculate when the last token was generated (7 days before expiry)
      const TOKEN_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
      const lastGenerated = new Date(
        entry.inviteExpiresAt.getTime() - TOKEN_VALIDITY_MS
      );
      const timeSinceLastGenerated = Date.now() - lastGenerated.getTime();

      if (timeSinceLastGenerated < REFRESH_COOLDOWN_MS) {
        const waitSeconds = Math.ceil(
          (REFRESH_COOLDOWN_MS - timeSinceLastGenerated) / 1000
        );
        return {
          status: 429 as const,
          body: {
            error: `Please wait ${Math.ceil(
              waitSeconds / 60
            )} minute(s) before requesting a new invite.`,
            retryAfter: waitSeconds,
          },
        };
      }
    }

    // Generate new token
    const newToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update the waitlist entry with new token
    await waitlist.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          inviteToken: newToken,
          inviteExpiresAt: expiresAt,
        },
      }
    );

    // Send new invite email
    runInBackground("waitlist-invite-sent", () =>
      sendWaitlistInvite({
        email: normalizedEmail,
        inviteToken: newToken,
        expiresAt: expiresAt.toISOString(),
        timestamp: new Date().toISOString(),
      })
    );

    logger.info("New invite token generated and email sent", {
      email: normalizedEmail,
    });

    return {
      status: 200 as const,
      body: {
        success: true,
        message:
          "A new invite has been sent to your email. Please check your inbox!",
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400 as const,
        body: { error: error.issues[0]?.message || "Invalid request" },
      };
    }

    logger.error("Failed to refresh invite token", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      status: 400 as const,
      body: { error: "Failed to send new invite. Please try again." },
    };
  }
});
