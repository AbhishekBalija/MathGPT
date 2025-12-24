/**
 * Admin Invite User Endpoint
 *
 * POST /admin/invite-user
 *
 * Approves a waitlist user and sends them an invite email with registration token.
 * Token expires after 24 hours.
 */

import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { MongoClient, Collection } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../../middlewares/auth.middleware";

// Waitlist document type (matches waitlist.step.ts)
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
const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
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
    await client.connect();
  }

  const db = client.db("MathGPTDB");
  waitlistCollection = db.collection<WaitlistEntry>("waitlist");
  return waitlistCollection;
}

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminInviteUser",
  description: "Approve waitlist user and send invite email",
  path: "/admin/invite-user",
  method: "POST",
  flows: ["WaitlistFlow"],
  emits: [{ topic: "waitlist-invite-sent", label: "Send Invite Email" }],
  bodySchema: inviteUserSchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      expiresAt: z.string(),
    }),
    400: z.object({
      error: z.string(),
    }),
    401: z.object({
      error: z.string(),
    }),
    403: z.object({
      error: z.string(),
    }),
    404: z.object({
      error: z.string(),
    }),
    500: z.object({
      error: z.string(),
    }),
  },
};

export const handler: Handlers["AdminInviteUser"] = async (
  req,
  { emit, logger }
) => {
  try {
    // Require admin authentication
    let user;
    try {
      user = await requireAuth(
        req.headers as Record<string, string | string[] | undefined>
      );
      if (!user.isAdmin) {
        return {
          status: 403 as const,
          body: { error: "Admin access required" },
        };
      }
    } catch {
      return {
        status: 401 as const,
        body: { error: "Authentication required" },
      };
    }

    const { email } = inviteUserSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    logger.info("Admin inviting user", {
      adminId: user.id,
    });

    const waitlist = await getWaitlistCollection();

    // Find the waitlist entry
    const entry = await waitlist.findOne({ email: normalizedEmail });
    if (!entry) {
      return {
        status: 404 as const,
        body: { error: "Email not found on waitlist" },
      };
    }

    if (entry.registered) {
      return {
        status: 400 as const,
        body: { error: "User has already registered" },
      };
    }

    // Generate invite token with 24-hour expiry
    const inviteToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Update waitlist entry
    const updateResult = await waitlist.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          inviteToken,
          inviteExpiresAt: expiresAt,
          approved: true,
          approvedAt: new Date(),
        },
      }
    );

    // Verify update succeeded
    if (updateResult.matchedCount === 0 || updateResult.modifiedCount === 0) {
      logger.error("Failed to update waitlist entry");
      return {
        status: 500 as const,
        body: { error: "Failed to update waitlist entry" },
      };
    }

    // Emit event to send invite email
    emit({
      topic: "waitlist-invite-sent",
      data: {
        email: normalizedEmail,
        inviteToken,
        expiresAt: expiresAt.toISOString(),
        timestamp: new Date().toISOString(),
      },
    });

    logger.info("User invited successfully", {
      expiresAt: expiresAt.toISOString(),
    });

    return {
      status: 200 as const,
      body: {
        success: true,
        message: `Invite sent to ${normalizedEmail}`,
        expiresAt: expiresAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400 as const,
        body: { error: error.issues[0]?.message || "Invalid request" },
      };
    }

    logger.error("Failed to invite user", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      status: 500 as const,
      body: { error: "Failed to send invite" },
    };
  }
};
