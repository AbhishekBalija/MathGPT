/**
 * GET /admin/reports/:id - one "something looks wrong" report, with the full
 * Solution, who sent it and whether code checked the answer.
 * Mounted behind requireUser and requireAdmin.
 */

import { pathParam, route } from "../../lib/http";
import { solutionReportRepository } from "../solutions/solution-report.repository";

export const adminReportDetailRoute = route(async (req) => {
  const report = await solutionReportRepository.findDetail(pathParam(req, "id"));
  if (!report) {
    return { status: 404, body: { error: "Report not found" } };
  }

  return {
    status: 200,
    body: {
      id: report.id,
      problemText: report.problemText,
      answerText: report.answerText,
      reason: report.reason,
      cacheStatus: report.cacheStatus,
      checkedByCode: report.checkedByCode,
      solution: report.solution,
      solvedAt: report.solvedAt?.toISOString() ?? null,
      student: report.student,
      createdAt: report.createdAt.toISOString(),
    },
  };
});
