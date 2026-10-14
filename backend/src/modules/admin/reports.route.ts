/**
 * GET /admin/reports - "Something looks wrong" reports from students,
 * newest first, with whether the answer is still blocked in the shared cache.
 * Query: limit. Mounted behind requireUser and requireAdmin.
 */

import { z } from "zod";
import { queryParam, route } from "../../lib/http";
import { solutionReportRepository } from "../solutions/solution-report.repository";

// Bad or missing values fall back to the default instead of reaching the database
const limitSchema = z.coerce.number().int().min(1).max(200).catch(50);

export const adminReportsRoute = route(async (req) => {
  const reports = await solutionReportRepository.listForAdmin(limitSchema.parse(queryParam(req, "limit") ?? 50));

  return {
    status: 200,
    body: {
      reports: reports.map((report) => ({
        id: report.id,
        problemText: report.problemText,
        answerText: report.answerText,
        reason: report.reason,
        cacheStatus: report.cacheStatus,
        createdAt: report.createdAt.toISOString(),
      })),
    },
  };
});
