/**
 * Admin List Waitlist Endpoint
 *
 * GET /admin/waitlist
 *
 * Lists all waitlist entries with their status (pending, approved, registered).
 */

import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { MongoClient, Collection } from "mongodb";
import { requireAuth } from "../../middlewares/auth.middleware";

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
  name: "AdminListWaitlist",
  description: "List all waitlist entries",
  path: "/admin/waitlist",
  method: "GET",
  flows: ["WaitlistFlow"],
  emits: [],
  responseSchema: {
    200: z.object({
      entries: z.array(
        z.object({
          email: z.string(),
          source: z.string(),
          status: z.enum(["pending", "approved", "registered"]),
          createdAt: z.string(),
          approvedAt: z.string().optional(),
          inviteExpiresAt: z.string().optional(),
          inviteExpired: z.boolean().optional(),
        })
      ),
      total: z.number(),
      counts: z.object({
        pending: z.number(),
        approved: z.number(),
        registered: z.number(),
      }),
    }),
    401: z.object({
      error: z.string(),
    }),
    403: z.object({
      error: z.string(),
    }),
    500: z.object({
      error: z.string(),
    }),
  },
};

export const handler: Handlers["AdminListWaitlist"] = async (
  req,
  { logger }
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

    logger.info("Admin listing waitlist", { adminId: user.id });

    const waitlist = await getWaitlistCollection();
    const entries = await waitlist.find().sort({ createdAt: -1 }).toArray();

    const now = new Date();
    const formattedEntries = entries.map((entry) => {
      let status: "pending" | "approved" | "registered" = "pending";
      if (entry.registered) {
        status = "registered";
      } else if (entry.approved) {
        status = "approved";
      }

      const inviteExpired =
        entry.inviteExpiresAt && now > entry.inviteExpiresAt ? true : false;

      return {
        email: entry.email,
        source: entry.source,
        status,
        createdAt: entry.createdAt.toISOString(),
        approvedAt: entry.approvedAt?.toISOString(),
        inviteExpiresAt: entry.inviteExpiresAt?.toISOString(),
        inviteExpired,
      };
    });

    const counts = {
      pending: formattedEntries.filter((e) => e.status === "pending").length,
      approved: formattedEntries.filter((e) => e.status === "approved").length,
      registered: formattedEntries.filter((e) => e.status === "registered")
        .length,
    };

    return {
      status: 200 as const,
      body: {
        entries: formattedEntries,
        total: formattedEntries.length,
        counts,
      },
    };
  } catch (error) {
    logger.error("Failed to list waitlist", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      status: 500 as const,
      body: { error: "Failed to fetch waitlist" },
    };
  }
};
