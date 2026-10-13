import { db } from "../../db/client";
import { solutionReports } from "../../db/schema";

export interface NewReport {
  solutionId: string;
  userId: string;
  reason?: string;
  // Copies, so the report still makes sense after the Solution is deleted
  problemText: string;
  answerText: string;
  cacheKey: string | null;
}

export const solutionReportRepository = {
  async create(report: NewReport): Promise<void> {
    await db.insert(solutionReports).values({ ...report, reason: report.reason ?? null });
  },
};
