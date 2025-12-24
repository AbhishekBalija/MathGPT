/**
 * Public Stats API Endpoint
 *
 * GET /api/public-stats
 *
 * Returns public statistics for social proof on landing page.
 * No authentication required.
 */

import { ApiRouteConfig } from "motia";
import { z } from "zod";
import { MongoClient, Collection } from "mongodb";

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

export const config: ApiRouteConfig = {
  type: "api",
  name: "PublicStats",
  description: "Get public user and waitlist counts for social proof",
  path: "/api/public-stats",
  method: "GET",
  emits: [],
  flows: ["public-flow"],
  responseSchema: {
    200: z.object({
      userCount: z.number(),
      waitlistCount: z.number(),
    }),
    500: z.object({
      error: z.string(),
    }),
  },
};

export async function handler(
  _req: unknown,
  {
    logger,
  }: {
    logger: {
      info: (msg: string, data?: unknown) => void;
      error: (msg: string, data?: unknown) => void;
    };
  }
) {
  try {
    const mongoClient = await getMongoClient();
    const db = mongoClient.db("MathGPTDB");

    // Fetch counts in parallel
    const [userCount, waitlistCount] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("waitlist").countDocuments(),
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
}
