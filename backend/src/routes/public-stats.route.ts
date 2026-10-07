/**
 * Public Stats API Endpoint
 *
 * GET /api/public-stats
 *
 * Returns public statistics for social proof on landing page.
 * No authentication required.
 */

import { MongoClient, Collection } from "mongodb";
import { route } from "../lib/http";
import { logger } from "../lib/logger";

// MongoDB connection cache (reused across invocations)
let client: MongoClient | null = null;
let connectionPromise: Promise<MongoClient> | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (client) {
    return client;
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
      client = new MongoClient(uri);
      await client.connect();
      console.log("MongoDB connected successfully (public-stats)");
      return client;
    } catch (error) {
      client = null;
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

// GET /api/public-stats
export const publicStatsRoute = route(async (req) => {
  try {
    const mongoClient = await getMongoClient();
    const db = mongoClient.db("MathGPTDB");

    // Fetch counts in parallel
    // waitlistCount only counts entries that haven't registered yet
    const [userCount, waitlistCount] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("waitlist").countDocuments({ registered: { $ne: true } }),
    ]);

    logger.info("Public stats fetched", { userCount, waitlistCount });

    return {
      status: 200 as const,
      body: {
        userCount,
        waitlistCount,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to fetch public stats", { error: errorMsg });

    return {
      status: 500 as const,
      body: { error: "Failed to fetch stats" },
    };
  }
});
