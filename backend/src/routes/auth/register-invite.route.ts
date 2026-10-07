/**
 * Invite-Based Registration Endpoint
 *
 * POST /auth/register-invite
 *
 * Registers a new user using a valid invite token from the waitlist.
 * Token must be valid, not expired, and match the email.
 */

import { z } from "zod";
import { MongoClient, Collection } from "mongodb";
import { timingSafeEqual } from "crypto";
import { AuthService } from "../../services/auth/auth.service";
import { route } from "../../lib/http";
import { logger } from "../../lib/logger";
import { runInBackground } from "../../lib/background";
import { sendWelcomeEmail } from "../../events/auth/send-welcome-email";
import type { EmailSender } from "../../modules/email/email-sender";

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

// Password validation
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*(),.?":{}|<>]/,
    "Password must contain at least one special character"
  );

// Request schema
const registerInviteSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  inviteToken: z.string().min(1, "Invite token is required"),
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

// POST /auth/register-invite
export function createRegisterInviteRoute(emailSender: EmailSender) {
  return route(async (req) => {
    try {
      const data = registerInviteSchema.parse(req.body);
      const normalizedEmail = data.email.toLowerCase().trim();

      logger.info("Invite registration attempt");

      // Get waitlist collection and validate invite
      const waitlist = await getWaitlistCollection();

      // First, check if email exists on waitlist (without modifying)
      const existingEntry = await waitlist.findOne({ email: normalizedEmail });

      // Check if email is on waitlist
      if (!existingEntry) {
        logger.warn("Email not on waitlist");
        return {
          status: 403 as const,
          body: {
            error: "You need an invite to register. Join our waitlist first!",
          },
        };
      }

      // Check if already registered
      if (existingEntry.registered) {
        return {
          status: 409 as const,
          body: { error: "This email is already registered. Please log in." },
        };
      }

      // Check if approved
      if (!existingEntry.approved) {
        return {
          status: 403 as const,
          body: {
            error:
              "Your invite is pending approval. Please wait for your invite email.",
          },
        };
      }

      // Validate invite token using constant-time comparison to prevent timing attacks
      const storedToken = existingEntry.inviteToken || "";
      const providedToken = data.inviteToken;

      // Ensure tokens have the same length for timingSafeEqual
      const tokensMatch =
        storedToken.length === providedToken.length &&
        timingSafeEqual(Buffer.from(storedToken), Buffer.from(providedToken));

      if (!tokensMatch) {
        logger.warn("Invalid invite token");
        return {
          status: 403 as const,
          body: {
            error:
              "Invalid invite token. Please use the link from your invite email.",
          },
        };
      }

      // Check if token expired
      if (
        existingEntry.inviteExpiresAt &&
        new Date() > existingEntry.inviteExpiresAt
      ) {
        logger.warn("Expired invite token");
        return {
          status: 403 as const,
          body: {
            error:
              "Your invite has expired. Click 'Request New Invite' to get a fresh one!",
            code: "INVITE_EXPIRED",
          },
        };
      }

      // Atomically mark as registered BEFORE calling AuthService to prevent race condition
      // This uses findOneAndUpdate with all conditions to ensure only one request succeeds
      const updateResult = await waitlist.findOneAndUpdate(
        {
          email: normalizedEmail,
          registered: false, // Only update if not already registered
          approved: true,
          inviteToken: data.inviteToken,
          $or: [
            { inviteExpiresAt: { $exists: false } },
            { inviteExpiresAt: { $gt: new Date() } },
          ],
        },
        { $set: { registered: true } },
        { returnDocument: "after" }
      );

      if (!updateResult) {
        logger.warn(
          "Failed to mark as registered - possibly already registered or conditions not met",
          { email: normalizedEmail }
        );
        return {
          status: 409 as const,
          body: {
            error:
              "This email is already registered or your invite is no longer valid. Please log in or contact support.",
          },
        };
      }

      // Register the user
      const user = await AuthService.register({
        email: normalizedEmail,
        password: data.password,
        name: data.name,
      });

      if (!user.success) {
        // Roll back the waitlist update if registration fails
        try {
          await waitlist.updateOne(
            { email: normalizedEmail },
            { $set: { registered: false } }
          );
        } catch (rollbackError) {
          logger.error("CRITICAL: Failed to rollback waitlist registration", {
            error:
              rollbackError instanceof Error
                ? rollbackError.message
                : "Unknown error",
          });
          // Continue to return the registration error to the user
        }
        logger.warn("Registration failed, rolled back waitlist update", {
          reason: user.error,
        });
        return {
          status: 409 as const,
          body: { error: user.error ?? "Registration failed" },
        };
      }

      // Validate required fields before returning
      if (!user.accessToken || !user.refreshToken || !user.user) {
        logger.error("Registration succeeded but missing required fields");
        return {
          status: 400 as const,
          body: { error: "Registration incomplete. Please contact support." },
        };
      }

      // Send welcome email
      runInBackground("send-welcome-email", () =>
        sendWelcomeEmail(emailSender, {
          userId: user.user.id.toString(),
          email: user.user.email,
          name: user.user.name,
        })
      );

      logger.info("Invite registration successful");

      return {
        status: 200 as const,
        body: {
          message: "User registered successfully",
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          user: {
            id: user.user.id.toString(),
            email: user.user.email,
          },
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          status: 400 as const,
          body: { error: error.issues[0]?.message || "Invalid request" },
        };
      }

      logger.error("Registration error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        status: 400 as const,
        body: { error: "Registration failed. Please try again." },
      };
    }
  });
}
