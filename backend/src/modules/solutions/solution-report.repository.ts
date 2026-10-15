import { count, desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { isUuid } from "../../lib/ids";
import { solutionCache, solutionReports, solutions, users, type CacheStatus } from "../../db/schema";
import type { SolutionV2Content } from "./solution-v2.schema";

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

export interface ReportDetail extends ReportForAdmin {
  // The answer was confirmed by code before it was shared
  checkedByCode: boolean;
  // Null once the student deleted the Solution, or for old-format Solutions
  solution: SolutionV2Content | null;
  solvedAt: Date | null;
  student: { id: string; name: string };
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

  /** One report with the full Solution, who sent it and how its answer was checked. */
  async findDetail(id: string): Promise<ReportDetail | null> {
    if (!isUuid(id)) return null;
    const [row] = await db
      .select({
        id: solutionReports.id,
        problemText: solutionReports.problemText,
        answerText: solutionReports.answerText,
        reason: solutionReports.reason,
        cacheKey: solutionReports.cacheKey,
        cacheStatus: solutionCache.status,
        checkMethod: solutionCache.checkMethod,
        createdAt: solutionReports.createdAt,
        solution: solutions.content,
        solvedAt: solutions.createdAt,
        studentId: users.id,
        studentName: users.name,
      })
      .from(solutionReports)
      .innerJoin(users, eq(users.id, solutionReports.userId))
      .leftJoin(solutionCache, eq(solutionCache.key, solutionReports.cacheKey))
      .leftJoin(solutions, eq(solutions.id, solutionReports.solutionId))
      .where(eq(solutionReports.id, id));
    if (!row) return null;

    const { checkMethod, studentId, studentName, ...report } = row;
    return { ...report, checkedByCode: checkMethod === "code", student: { id: studentId, name: studentName } };
  },

  async findById(id: string): Promise<{ id: string; cacheKey: string | null } | null> {
    if (!isUuid(id)) return null;
    const [row] = await db
      .select({ id: solutionReports.id, cacheKey: solutionReports.cacheKey })
      .from(solutionReports)
      .where(eq(solutionReports.id, id));
    return row ?? null;
  },

  /** Reports whose answer is still blocked from the shared cache. */
  async countBlocked(): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(solutionReports)
      .innerJoin(solutionCache, eq(solutionCache.key, solutionReports.cacheKey))
      .where(eq(solutionCache.status, "blocked"));
    return row?.total ?? 0;
  },
};
