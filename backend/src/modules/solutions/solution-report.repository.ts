import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { isUuid } from "../../lib/ids";
import { solutionCache, solutionReports, type CacheStatus } from "../../db/schema";

export interface NewReport {
  solutionId: string;
  userId: string;
  reason?: string;
  // Copies, so the report still makes sense after the Solution is deleted
  problemText: string;
  answerText: string;
  cacheKey: string | null;
}

export interface ReportForAdmin {
  id: string;
  problemText: string | null;
  answerText: string | null;
  reason: string | null;
  cacheKey: string | null;
  // Null when the Solution never went into the shared cache
  cacheStatus: CacheStatus | null;
  createdAt: Date;
}

export const solutionReportRepository = {
  async create(report: NewReport): Promise<void> {
    await db.insert(solutionReports).values({ ...report, reason: report.reason ?? null });
  },

  /** Newest first, with the current status of the cache entry it blocked. */
  async listForAdmin(limit: number): Promise<ReportForAdmin[]> {
    return db
      .select({
        id: solutionReports.id,
        problemText: solutionReports.problemText,
        answerText: solutionReports.answerText,
        reason: solutionReports.reason,
        cacheKey: solutionReports.cacheKey,
        cacheStatus: solutionCache.status,
        createdAt: solutionReports.createdAt,
      })
      .from(solutionReports)
      .leftJoin(solutionCache, eq(solutionCache.key, solutionReports.cacheKey))
      .orderBy(desc(solutionReports.createdAt))
      .limit(limit);
  },

  async findById(id: string): Promise<{ id: string; cacheKey: string | null } | null> {
    if (!isUuid(id)) return null;
    const [row] = await db
      .select({ id: solutionReports.id, cacheKey: solutionReports.cacheKey })
      .from(solutionReports)
      .where(eq(solutionReports.id, id));
    return row ?? null;
  },
};
