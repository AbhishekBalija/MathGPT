/**
 * All reads and writes of Solutions in Postgres.
 *
 * Every per-User method filters by `userId` inside the query itself, so a
 * Solution that belongs to someone else is simply "not found". Ids that are
 * not valid UUIDs are also "not found" and never reach the database.
 */

import { and, count, desc, eq, max, sql, sum } from "drizzle-orm";
import { db } from "../../db/client";
import { isUuid as isId } from "../../lib/ids";
import type { DbExecutor } from "../../db/transaction";
import { solutions, type SolutionRow } from "../../db/schema";
import type { ProblemType, Solution } from "../../types/solve.types";

export type StoredSolution = SolutionRow;

export interface HistoryItem {
  id: string;
  problem: string;
  problemType: ProblemType;
  finalAnswer: string;
  createdAt: Date;
}

// Turns [{ problemType: "algebra", count: 2 }] into { algebra: 2 }
function toCountMap(rows: Array<{ problemType: string; count: number }>): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row.problemType, row.count]));
}

export const solutionRepository = {
  /** Stores a Solution under the id and time the solver gave it. */
  async create(
    userId: string,
    solution: Solution,
    chatId?: string,
    executor: DbExecutor = db
  ): Promise<StoredSolution> {
    const [row] = await executor
      .insert(solutions)
      .values({
        id: solution.id,
        userId,
        chatId: chatId ?? null,
        problem: solution.problem,
        problemType: solution.problemType,
        steps: solution.steps,
        finalAnswer: solution.finalAnswer,
        summary: solution.summary,
        processingTimeMs: solution.processingTimeMs,
        inputTokens: solution.tokenUsage?.inputTokens ?? 0,
        outputTokens: solution.tokenUsage?.outputTokens ?? 0,
        totalTokens: solution.tokenUsage?.totalTokens ?? 0,
        // Same timestamp the solve response showed, so History matches it
        createdAt: new Date(solution.createdAt),
      })
      .returning();
    if (!row) {
      throw new Error("Insert returned no row");
    }
    return row;
  },

  async findForUser(userId: string, id: string): Promise<StoredSolution | null> {
    if (!isId(id)) {
      return null;
    }
    const [row] = await db
      .select()
      .from(solutions)
      .where(and(eq(solutions.id, id), eq(solutions.userId, userId)));
    return row ?? null;
  },

  /** Newest first, without the Steps. */
  async historyForUser(userId: string, limit: number): Promise<HistoryItem[]> {
    return db
      .select({
        id: solutions.id,
        problem: solutions.problem,
        problemType: solutions.problemType,
        finalAnswer: solutions.finalAnswer,
        createdAt: solutions.createdAt,
      })
      .from(solutions)
      .where(eq(solutions.userId, userId))
      .orderBy(desc(solutions.createdAt))
      .limit(limit);
  },

  async statsForUser(userId: string): Promise<{
    totalSolutions: number;
    problemTypes: Record<string, number>;
    lastSolvedAt: Date | null;
  }> {
    const [byType, [summary]] = await Promise.all([
      db
        .select({ problemType: solutions.problemType, count: count() })
        .from(solutions)
        .where(eq(solutions.userId, userId))
        .groupBy(solutions.problemType),
      db
        .select({ total: count(), lastSolvedAt: max(solutions.createdAt) })
        .from(solutions)
        .where(eq(solutions.userId, userId)),
    ]);

    return {
      totalSolutions: summary?.total ?? 0,
      problemTypes: toCountMap(byType),
      lastSolvedAt: summary?.lastSolvedAt ?? null,
    };
  },

  /** True when the Solution existed and belonged to this User. */
  async deleteForUser(userId: string, id: string): Promise<boolean> {
    if (!isId(id)) {
      return false;
    }
    const deleted = await db
      .delete(solutions)
      .where(and(eq(solutions.id, id), eq(solutions.userId, userId)))
      .returning({ id: solutions.id });
    return deleted.length === 1;
  },

  /** Clears a User's whole History. Returns how many were deleted. */
  async deleteAllForUser(userId: string): Promise<number> {
    const deleted = await db
      .delete(solutions)
      .where(eq(solutions.userId, userId))
      .returning({ id: solutions.id });
    return deleted.length;
  },

  async countForUser(userId: string, executor: DbExecutor = db): Promise<number> {
    const [row] = await executor
      .select({ total: count() })
      .from(solutions)
      .where(eq(solutions.userId, userId));
    return row?.total ?? 0;
  },

  /** For admin statistics: every saved Solution. */
  async countAll(): Promise<number> {
    const [row] = await db.select({ total: count() }).from(solutions);
    return row?.total ?? 0;
  },

  /** For admin statistics: how many Solutions of each Problem Type. */
  async countByProblemType(): Promise<Record<string, number>> {
    const rows = await db
      .select({ problemType: solutions.problemType, count: count() })
      .from(solutions)
      .groupBy(solutions.problemType);
    return toCountMap(rows);
  },

  /** For admin cost tracking: token totals across all Solutions. */
  async tokenTotals(): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    solutionCount: number;
  }> {
    const [row] = await db
      .select({
        // sum() is null on an empty table and a string otherwise; float8 stays exact up to 2^53
        totalInputTokens: sql<number>`coalesce(${sum(solutions.inputTokens)}, 0)::float8`,
        totalOutputTokens: sql<number>`coalesce(${sum(solutions.outputTokens)}, 0)::float8`,
        totalTokens: sql<number>`coalesce(${sum(solutions.totalTokens)}, 0)::float8`,
        solutionCount: count(),
      })
      .from(solutions);

    return {
      totalInputTokens: row?.totalInputTokens ?? 0,
      totalOutputTokens: row?.totalOutputTokens ?? 0,
      totalTokens: row?.totalTokens ?? 0,
      solutionCount: row?.solutionCount ?? 0,
    };
  },
};
