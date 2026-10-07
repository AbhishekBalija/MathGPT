/**
 * Waitlist API Endpoint
 *
 * POST /api/waitlist
 *
 * Allows users to join the waitlist by providing their email.
 * Stores emails in MongoDB and triggers confirmation email.
 */

import { z } from "zod";
import { MongoClient, Collection } from "mongodb";
import { route } from "../lib/http";
import { logger } from "../lib/logger";
import { runInBackground } from "../lib/background";
import { sendWaitlistEmail } from "../events/waitlist-email";

// Waitlist entry schema
const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  source: z.string().optional().default("landing"),
});

// Waitlist document type
interface WaitlistEntry {
  email: string;
  source: string;
  createdAt: Date;
  notified: boolean;
  // Invite system fields
  inviteToken?: string;
  inviteExpiresAt?: Date;
  approved: boolean;
  approvedAt?: Date;
  registered: boolean;
}

// MongoDB connection cache
let client: MongoClient | null = null;
let waitlistCollection: Collection<WaitlistEntry> | null = null;
let connectionPromise: Promise<Collection<WaitlistEntry>> | null = null;

async function getWaitlistCollection(): Promise<Collection<WaitlistEntry>> {
  if (waitlistCollection) {
    return waitlistCollection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      connectionPromise = null;
      throw new Error("MONGODB_URI environment variable is not set");
    }

    try {
      if (!client) {
        client = new MongoClient(uri);
        await client.connect();
        console.log("MongoDB connected successfully (waitlist)");
      }

      const db = client.db("MathGPTDB");
      waitlistCollection = db.collection<WaitlistEntry>("waitlist");

      // Create index for email uniqueness
      await waitlistCollection.createIndex({ email: 1 }, { unique: true });

      return waitlistCollection;
    } catch (error) {
      // Reset all cached state on error
      if (client) {
        try {
          await client.close();
        } catch {
          // Ignore close errors
        }
      }
      client = null;
      waitlistCollection = null;
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

// POST /api/waitlist
export const joinWaitlistRoute = route(async (req) => {
  try {
    const { email, source } = waitlistSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    logger.info("Waitlist signup attempt", { source });

    const waitlist = await getWaitlistCollection();

    // Check if already on waitlist
    const existing = await waitlist.findOne({ email: normalizedEmail });
    if (existing) {
      logger.info("Email already on waitlist", { source });
      return {
        status: 200 as const,
        body: {
          success: true,
          message:
            "You're already on the waitlist! We'll notify you when we launch.",
          isNew: false,
        },
      };
    }

    // Add to waitlist - use try-catch to handle race condition (TOCTOU)
    try {
      await waitlist.insertOne({
        email: normalizedEmail,
        source,
        createdAt: new Date(),
        notified: false,
        approved: false,
        registered: false,
      });
    } catch (err: any) {
      // Handle duplicate key error (code 11000) - concurrent request won the race
      if (err.code === 11000) {
        logger.info("Concurrent duplicate detected", { source });
        return {
          status: 200 as const,
          body: {
            success: true,
            message:
              "You're already on the waitlist! We'll notify you when we launch.",
            isNew: false,
          },
        };
      }
      throw err;
    }

    // Emit event for email sending
    runInBackground("waitlist-joined", () =>
      sendWaitlistEmail({
        email: normalizedEmail,
        source,
        timestamp: new Date().toISOString(),
      })
    );

    logger.info("New waitlist signup", { source });

    return {
      status: 200 as const,
      body: {
        success: true,
        message: "You're on the list! We'll email you when NeoMath launches.",
        isNew: true,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400 as const,
        body: { error: error.issues[0]?.message || "Invalid email" },
      };
    }

    logger.error("Waitlist signup error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      status: 500 as const,
      body: { error: "Failed to join waitlist. Please try again." },
    };
  }
});
