/**
 * POST /api/solutions/:id/report - the current User says one of their
 * Solutions looks wrong. Mounted behind requireUser.
 *
 * The report is saved for the admin, and if the Solution came from or went
 * into the shared cache, that entry is blocked so no other student gets it.
 * Someone else's Solution is a plain 404, so the response never confirms
 * that the id exists.
 */

import { z } from "zod";
import { pathParam, routeWithBody } from "../lib/http";
import { logger } from "../lib/logger";
import { getCurrentUser } from "../modules/auth/auth.middleware";
import { solutionCache } from "../modules/solver/cache/solution-cache";
import { solutionReportRepository } from "../modules/solutions/solution-report.repository";
import { solutionRepository } from "../modules/solutions/solution.repository";

const reportSchema = z.object({
  reason: z.string().trim().max(500, "Please keep the reason under 500 characters").optional(),
});

export const reportSolutionRoute = routeWithBody(reportSchema, async (req, body) => {
  const user = getCurrentUser(req);
  const solutionId = pathParam(req, "id");

  const solution = await solutionRepository.findForUser(user.id, solutionId);
  if (!solution) {
    return { status: 404, body: { error: "Solution not found" } };
  }

  await solutionReportRepository.create(solution.id, user.id, body.reason || undefined);
  if (solution.cacheKey) {
    await solutionCache.block(solution.cacheKey);
  }

  logger.info("Solution reported", { solutionId: solution.id, userId: user.id, blockedCache: Boolean(solution.cacheKey) });
  return { status: 200, body: { success: true } };
});
