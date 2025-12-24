/**
 * Solution Repository
 *
 * Handles all database operations for math solutions.
 * Stores solutions with their steps, allows querying by user/chat.
 */

import { MongoClient, ObjectId, Collection } from "mongodb";
import type { Solution, SolutionStep, ProblemType } from "../types/solve.types";

/**
 * Database model for stored solutions
 * Extends the Solution type with MongoDB-specific fields
 */
export interface SolutionDocument {
  _id: ObjectId;
  /** The original problem statement */
  problem: string;
  /** Classified problem type */
  problemType: ProblemType;
  /** Array of solution steps */
  steps: SolutionStep[];
  /** Final answer */
  finalAnswer: string;
  /** Brief summary */
  summary: string;
  /** Processing time in ms */
  processingTimeMs: number;
  /** Token usage for cost tracking */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  /** Optional chat ID for history grouping */
  chatId?: string;
  /** User who requested this solution */
  userId?: string;
  /** When the solution was created */
  createdAt: Date;
  /** When last updated (e.g., verified) */
  updatedAt: Date;
}

/**
 * Data needed to create a new solution
 */
export interface SolutionCreate {
  problem: string;
  problemType: ProblemType;
  steps: SolutionStep[];
  finalAnswer: string;
  summary: string;
  processingTimeMs: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  chatId?: string;
  userId?: string;
}

// Singleton pattern for MongoDB connection
let client: MongoClient | null = null;
let solutionsCollection: Collection<SolutionDocument> | null = null;

async function getCollection(): Promise<Collection<SolutionDocument>> {
  if (solutionsCollection) {
    return solutionsCollection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log("MongoDB connected successfully (solutions)");
  }

  const db = client.db("MathGPTDB");
  solutionsCollection = db.collection<SolutionDocument>("solutions");

  // Create indexes for common queries
  await solutionsCollection.createIndex({ chatId: 1 });
  await solutionsCollection.createIndex({ userId: 1 });
  await solutionsCollection.createIndex({ createdAt: -1 });
  await solutionsCollection.createIndex({ problemType: 1 });

  return solutionsCollection;
}

export const solutionRepository = {
  /**
   * Save a new solution to the database
   */
  async create(data: SolutionCreate): Promise<SolutionDocument> {
    const solutions = await getCollection();
    const now = new Date();

    // DEBUG: Log tokenUsage
    console.log(
      "[DEBUG] solution.repository.create - tokenUsage:",
      JSON.stringify(data.tokenUsage)
    );

    const doc: Omit<SolutionDocument, "_id"> = {
      problem: data.problem,
      problemType: data.problemType,
      steps: data.steps,
      finalAnswer: data.finalAnswer,
      summary: data.summary,
      processingTimeMs: data.processingTimeMs,
      tokenUsage: data.tokenUsage,
      chatId: data.chatId,
      userId: data.userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await solutions.insertOne(doc as SolutionDocument);
    return {
      ...doc,
      _id: result.insertedId,
    } as SolutionDocument;
  },

  /**
   * Find a solution by its ID
   */
  async findById(id: string): Promise<SolutionDocument | null> {
    const solutions = await getCollection();
    try {
      return solutions.findOne({ _id: new ObjectId(id) });
    } catch {
      return null; // Invalid ObjectId format
    }
  },

  /**
   * Find all solutions for a specific chat
   */
  async findByChatId(chatId: string): Promise<SolutionDocument[]> {
    const solutions = await getCollection();
    return solutions.find({ chatId }).sort({ createdAt: -1 }).toArray();
  },

  /**
   * Find all solutions for a specific user
   */
  async findByUserId(userId: string, limit = 50): Promise<SolutionDocument[]> {
    const solutions = await getCollection();
    return solutions
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  /**
   * Get solution history for a user (summary only, not full steps)
   */
  async getHistoryByUserId(
    userId: string,
    limit = 20
  ): Promise<
    Array<{
      id: string;
      problem: string;
      problemType: ProblemType;
      finalAnswer: string;
      createdAt: Date;
    }>
  > {
    const solutions = await getCollection();
    const docs = await solutions
      .find({ userId })
      .project({
        problem: 1,
        problemType: 1,
        finalAnswer: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      problem: doc.problem,
      problemType: doc.problemType as ProblemType,
      finalAnswer: doc.finalAnswer,
      createdAt: doc.createdAt,
    }));
  },

  /**
   * Count solutions by problem type (for analytics)
   */
  async countByProblemType(): Promise<Record<string, number>> {
    const solutions = await getCollection();
    const pipeline = [{ $group: { _id: "$problemType", count: { $sum: 1 } } }];
    const results = await solutions.aggregate(pipeline).toArray();

    return results.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);
  },

  /**
   * Get user stats (total solutions, problem types solved)
   */
  async getUserStats(userId: string): Promise<{
    totalSolutions: number;
    problemTypes: Record<string, number>;
    lastSolvedAt: Date | null;
  }> {
    const solutions = await getCollection();

    const [total, typeBreakdown, lastSolution] = await Promise.all([
      solutions.countDocuments({ userId }),
      solutions
        .aggregate([
          { $match: { userId } },
          { $group: { _id: "$problemType", count: { $sum: 1 } } },
        ])
        .toArray(),
      solutions.findOne({ userId }, { sort: { createdAt: -1 } }),
    ]);

    return {
      totalSolutions: total,
      problemTypes: typeBreakdown.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {} as Record<string, number>),
      lastSolvedAt: lastSolution?.createdAt || null,
    };
  },

  /**
   * Delete a solution
   */
  async delete(id: string): Promise<boolean> {
    const solutions = await getCollection();
    try {
      const result = await solutions.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount === 1;
    } catch {
      return false;
    }
  },

  /**
   * Delete all solutions for a user (for account deletion)
   */
  async deleteByUserId(userId: string): Promise<number> {
    const solutions = await getCollection();
    const result = await solutions.deleteMany({ userId });
    return result.deletedCount;
  },

  /**
   * Get aggregate token stats for admin dashboard
   */
  async getTokenStats(): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    solutionCount: number;
  }> {
    const solutions = await getCollection();
    const pipeline = [
      {
        $group: {
          _id: null,
          totalInputTokens: {
            $sum: { $ifNull: ["$tokenUsage.inputTokens", 0] },
          },
          totalOutputTokens: {
            $sum: { $ifNull: ["$tokenUsage.outputTokens", 0] },
          },
          totalTokens: { $sum: { $ifNull: ["$tokenUsage.totalTokens", 0] } },
          solutionCount: { $sum: 1 },
        },
      },
    ];
    const results = await solutions.aggregate(pipeline).toArray();

    if (results.length === 0) {
      return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        solutionCount: 0,
      };
    }

    return {
      totalInputTokens: results[0].totalInputTokens || 0,
      totalOutputTokens: results[0].totalOutputTokens || 0,
      totalTokens: results[0].totalTokens || 0,
      solutionCount: results[0].solutionCount || 0,
    };
  },
};
