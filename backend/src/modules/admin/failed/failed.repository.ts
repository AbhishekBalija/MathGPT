import { count, eq, sql } from "drizzle-orm";
import { db } from "../../../db/client";
import { errorLogs } from "../../../db/schema";

/**
 * A failed problem is one student plus one problem. Retries of the same
 * problem (even with different spacing) are one problem with several tries.
 * Matches `normalize` in solver/cache/solution-cache.ts: trim, collapse
 * whitespace, "−" becomes "-".
 */
// Collapse first, then trim: Postgres trim() only strips spaces, not newlines or tabs
export const normalizedProblem = sql<string>`trim(regexp_replace(replace(${errorLogs.problemText}, '−', '-'), '\\s+', ' ', 'g'))`;
export const studentKey = sql<string>`coalesce(${errorLogs.userId}::text, '')`;

export const failedRepository = {
  /** How many failed problems are still open. */
  async countOpenGroups(): Promise<number> {
    const groups = db
      .select({ student: studentKey, problem: normalizedProblem })
      .from(errorLogs)
      .where(eq(errorLogs.resolved, false))
      .groupBy(studentKey, normalizedProblem)
      .as("groups");
    const [row] = await db.select({ total: count() }).from(groups);
    return row?.total ?? 0;
  },
};

