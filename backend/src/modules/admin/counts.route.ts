/**
 * GET /admin/counts - the numbers next to Failed solves, Reports and
 * Feedback in the admin nav. Failed solves count problems, not tries.
 * Mounted behind requireUser and requireAdmin.
 */

import { route } from "../../lib/http";
import { feedbackRepository } from "../feedback/feedback.repository";
import { solutionReportRepository } from "../solutions/solution-report.repository";
import { failedRepository } from "./failed/failed.repository";

export const adminCountsRoute = route(async () => {
  const [failedOpen, reportsBlocked, feedbackOpen] = await Promise.all([
    failedRepository.countOpenGroups(),
    solutionReportRepository.countBlocked(),
    feedbackRepository.countOpen(),
  ]);

  return { status: 200, body: { failedOpen, reportsBlocked, feedbackOpen } };
});
