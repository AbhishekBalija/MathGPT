/**
 * Analytics Repository
 *
 * Handles MongoDB operations for:
 * - Analytics events (solution_saved, etc.)
 * - Error logs (for admin dashboard)
 */

import { MongoClient, ObjectId, Collection } from "mongodb";

/**
 * Analytics Event document
 */
export interface AnalyticsEventDocument {
  _id: ObjectId;
  eventName: string;
  properties: {
    problemType?: string;
    stepsCount?: number;
    processingTimeMs?: number;
    userId?: string;
    errorCode?: string;
    errorMessage?: string;
  };
  userId?: string;
  createdAt: Date;
}

/**
 * Error Log document (for Admin Dashboard)
 */
export interface ErrorLogDocument {
  _id: ObjectId;
  errorCode: string;
  errorMessage: string;
  problemText: string;
  userId?: string;
  processingTimeMs?: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

// Singleton pattern for MongoDB connection
let client: MongoClient | null = null;
let analyticsCollection: Collection<AnalyticsEventDocument> | null = null;
let errorsCollection: Collection<ErrorLogDocument> | null = null;

async function getAnalyticsCollection(): Promise<
  Collection<AnalyticsEventDocument>
> {
  if (analyticsCollection) return analyticsCollection;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is not set");

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log("MongoDB connected successfully (analytics)");
  }

  const db = client.db("MathGPTDB");
  analyticsCollection = db.collection<AnalyticsEventDocument>("analytics");

  // Create indexes
  await analyticsCollection.createIndex({ eventName: 1 });
  await analyticsCollection.createIndex({ userId: 1 });
  await analyticsCollection.createIndex({ createdAt: -1 });

  return analyticsCollection;
}

async function getErrorsCollection(): Promise<Collection<ErrorLogDocument>> {
  if (errorsCollection) return errorsCollection;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is not set");

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }

  const db = client.db("MathGPTDB");
  errorsCollection = db.collection<ErrorLogDocument>("error_logs");

  // Create indexes
  await errorsCollection.createIndex({ errorCode: 1 });
  await errorsCollection.createIndex({ userId: 1 });
  await errorsCollection.createIndex({ resolved: 1 });
  await errorsCollection.createIndex({ createdAt: -1 });

  return errorsCollection;
}

export const analyticsRepository = {
  // ==================
  // Analytics Events
  // ==================

  /**
   * Log an analytics event
   */
  async logEvent(
    eventName: string,
    properties: AnalyticsEventDocument["properties"],
    userId?: string
  ): Promise<AnalyticsEventDocument> {
    const collection = await getAnalyticsCollection();
    const doc: Omit<AnalyticsEventDocument, "_id"> = {
      eventName,
      properties,
      userId,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(doc as AnalyticsEventDocument);
    return { ...doc, _id: result.insertedId } as AnalyticsEventDocument;
  },

  /**
   * Get events by type with optional date range
   */
  async getEventsByType(
    eventName: string,
    startDate?: Date,
    endDate?: Date,
    limit = 100
  ): Promise<AnalyticsEventDocument[]> {
    const collection = await getAnalyticsCollection();
    const query: Record<string, unknown> = { eventName };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, Date>).$gte = startDate;
      if (endDate) (query.createdAt as Record<string, Date>).$lte = endDate;
    }

    return collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  /**
   * Get aggregated stats by event type
   */
  async getAggregatedStats(): Promise<
    Array<{ eventName: string; count: number }>
  > {
    const collection = await getAnalyticsCollection();
    return collection
      .aggregate([
        { $group: { _id: "$eventName", count: { $sum: 1 } } },
        { $project: { eventName: "$_id", count: 1, _id: 0 } },
        { $sort: { count: -1 } },
      ])
      .toArray() as Promise<Array<{ eventName: string; count: number }>>;
  },

  /**
   * Get events for a specific user
   */
  async getEventsByUser(
    userId: string,
    limit = 50
  ): Promise<AnalyticsEventDocument[]> {
    const collection = await getAnalyticsCollection();
    return collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  // ==================
  // Error Logs (Admin)
  // ==================

  /**
   * Log an error for admin dashboard
   */
  async logError(
    errorCode: string,
    errorMessage: string,
    problemText: string,
    userId?: string,
    processingTimeMs?: number
  ): Promise<ErrorLogDocument> {
    const collection = await getErrorsCollection();
    const doc: Omit<ErrorLogDocument, "_id"> = {
      errorCode,
      errorMessage,
      problemText,
      userId,
      processingTimeMs,
      resolved: false,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(doc as ErrorLogDocument);
    return { ...doc, _id: result.insertedId } as ErrorLogDocument;
  },

  /**
   * Get recent errors for admin dashboard
   */
  async getRecentErrors(
    limit = 50,
    includeResolved = false
  ): Promise<ErrorLogDocument[]> {
    const collection = await getErrorsCollection();
    const query = includeResolved ? {} : { resolved: false };
    return collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  /**
   * Get errors by error code
   */
  async getErrorsByCode(
    errorCode: string,
    limit = 50
  ): Promise<ErrorLogDocument[]> {
    const collection = await getErrorsCollection();
    return collection
      .find({ errorCode })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  /**
   * Get errors for a specific user
   */
  async getErrorsByUser(
    userId: string,
    limit = 20
  ): Promise<ErrorLogDocument[]> {
    const collection = await getErrorsCollection();
    return collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  /**
   * Get error by ID
   */
  async getErrorById(id: string): Promise<ErrorLogDocument | null> {
    const collection = await getErrorsCollection();
    try {
      return collection.findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  },

  /**
   * Mark error as resolved
   */
  async markErrorResolved(
    id: string,
    resolvedBy: string
  ): Promise<ErrorLogDocument | null> {
    const collection = await getErrorsCollection();
    try {
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            resolved: true,
            resolvedBy,
            resolvedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );
      return result;
    } catch {
      return null;
    }
  },

  /**
   * Get error statistics for dashboard
   */
  async getErrorStats(): Promise<{
    total: number;
    unresolved: number;
    byCode: Array<{ errorCode: string; count: number }>;
    last24Hours: number;
  }> {
    const collection = await getErrorsCollection();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, unresolved, byCode, last24Hours] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ resolved: false }),
      collection
        .aggregate([
          { $group: { _id: "$errorCode", count: { $sum: 1 } } },
          { $project: { errorCode: "$_id", count: 1, _id: 0 } },
          { $sort: { count: -1 } },
        ])
        .toArray() as Promise<Array<{ errorCode: string; count: number }>>,
      collection.countDocuments({ createdAt: { $gte: yesterday } }),
    ]);

    return { total, unresolved, byCode, last24Hours };
  },
};
