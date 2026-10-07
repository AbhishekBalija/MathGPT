/**
 * Analytics Events and Error Logs in Postgres, for the admin dashboard.
 *
 * Ids from URLs and query strings that are not valid UUIDs are treated as
 * "not found" (or as matching nothing) and never reach the database.
 */

import { and, count, desc, eq, gte, type SQL } from "drizzle-orm";
import { db } from "../../db/client";
import { isUuid as isId } from "../../lib/ids";
import { analyticsEvents, errorLogs } from "../../db/schema";

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type ErrorLog = typeof errorLogs.$inferSelect;

export interface NewErrorLog {
  errorCode: string;
  errorMessage: string;
  problemText: string;
  userId?: string;
  processingTimeMs?: number;
}

export interface ErrorFilter {
  errorCode?: string;
  userId?: string;
  includeResolved: boolean;
  limit: number;
}

export const analyticsRepository = {
  async recordEvent(
    eventName: string,
    properties: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    await db.insert(analyticsEvents).values({
      eventName,
      properties,
      userId: userId && isId(userId) ? userId : null,
    });
  },

  /** Most frequent first. */
  async eventCountsByName(): Promise<Array<{ eventName: string; count: number }>> {
    return db
      .select({ eventName: analyticsEvents.eventName, count: count() })
      .from(analyticsEvents)
      .groupBy(analyticsEvents.eventName)
      .orderBy(desc(count()));
  },

  async recentEvents(eventName: string, limit: number): Promise<AnalyticsEvent[]> {
    return db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.eventName, eventName))
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(limit);
  },

  async recordError(error: NewErrorLog): Promise<void> {
    await db.insert(errorLogs).values({
      ...error,
      userId: error.userId && isId(error.userId) ? error.userId : null,
    });
  },

  /** Newest first. Filters combine; unresolved only unless asked otherwise. */
  async listErrors(filter: ErrorFilter): Promise<ErrorLog[]> {
    if (filter.userId !== undefined && !isId(filter.userId)) {
      return [];
    }

    const conditions: SQL[] = [];
    if (filter.errorCode) conditions.push(eq(errorLogs.errorCode, filter.errorCode));
    if (filter.userId) conditions.push(eq(errorLogs.userId, filter.userId));
    if (!filter.includeResolved) conditions.push(eq(errorLogs.resolved, false));

    return db
      .select()
      .from(errorLogs)
      .where(and(...conditions))
      .orderBy(desc(errorLogs.createdAt))
      .limit(filter.limit);
  },

  async errorStats(): Promise<{
    total: number;
    unresolved: number;
    byCode: Array<{ errorCode: string; count: number }>;
    last24Hours: number;
  }> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [[total], [unresolved], byCode, [recent]] = await Promise.all([
      db.select({ count: count() }).from(errorLogs),
      db.select({ count: count() }).from(errorLogs).where(eq(errorLogs.resolved, false)),
      db
        .select({ errorCode: errorLogs.errorCode, count: count() })
        .from(errorLogs)
        .groupBy(errorLogs.errorCode)
        .orderBy(desc(count())),
      db.select({ count: count() }).from(errorLogs).where(gte(errorLogs.createdAt, dayAgo)),
    ]);

    return {
      total: total?.count ?? 0,
      unresolved: unresolved?.count ?? 0,
      byCode,
      last24Hours: recent?.count ?? 0,
    };
  },

  /**
   * Marks an Error Log resolved. Resolving it again changes nothing, so the
   * record keeps who handled it first and when. Null if it does not exist.
   */
  async resolveError(id: string, adminId: string): Promise<ErrorLog | null> {
    if (!isId(id)) {
      return null;
    }
    const [updated] = await db
      .update(errorLogs)
      .set({ resolved: true, resolvedBy: adminId, resolvedAt: new Date() })
      .where(and(eq(errorLogs.id, id), eq(errorLogs.resolved, false)))
      .returning();
    if (updated) {
      return updated;
    }
    const [existing] = await db.select().from(errorLogs).where(eq(errorLogs.id, id));
    return existing ?? null;
  },
};
