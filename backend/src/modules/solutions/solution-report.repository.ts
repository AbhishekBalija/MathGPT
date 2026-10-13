import { db } from "../../db/client";
import { solutionReports } from "../../db/schema";

export const solutionReportRepository = {
  async create(solutionId: string, userId: string, reason: string | undefined): Promise<void> {
    await db.insert(solutionReports).values({ solutionId, userId, reason: reason ?? null });
  },
};
