/**
 * POST /admin/reports/:id/unblock - the report was a mistake, so the answer
 * it blocked can be served from the shared cache again.
 * Mounted behind requireUser and requireAdmin.
 */

import { pathParam, route } from "../../lib/http";
import { logger } from "../../lib/logger";
import { getCurrentUser } from "../auth/auth.middleware";
import { solutionCache } from "../solver/cache/solution-cache";
import { solutionReportRepository } from "../solutions/solution-report.repository";

export const adminUnblockReportRoute = route(async (req) => {
  const admin = getCurrentUser(req);
  const reportId = pathParam(req, "id");

  const report = await solutionReportRepository.findById(reportId);
  if (!report) {
    return { status: 404, body: { error: "Report not found" } };
  }

  const cacheStatus = report.cacheKey ? await solutionCache.unblock(report.cacheKey) : null;
  if (!cacheStatus) {
    return { status: 409, body: { error: "This report has no blocked answer to unblock" } };
  }

  logger.info("Reported answer unblocked", { reportId, cacheStatus, adminId: admin.id });
  return { status: 200, body: { cacheStatus } };
});
