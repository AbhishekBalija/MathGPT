/**
 * DELETE /api/solution/:id - delete one of the current User's Solutions.
 * Mounted behind requireUser. Someone else's Solution is a plain 404, so the
 * response never confirms that the id exists.
 */

import { pathParam, route } from "../lib/http";
import { logger } from "../lib/logger";
import { getCurrentUser } from "../modules/auth/auth.middleware";
import { solutionRepository } from "../modules/solutions/solution.repository";

export const deleteSolutionRoute = route(async (req) => {
  const user = getCurrentUser(req);
  const solutionId = pathParam(req, "id");

  const deleted = await solutionRepository.deleteForUser(user.id, solutionId);
  if (!deleted) {
    return { status: 404, body: { error: "Solution not found" } };
  }

  logger.info("Solution deleted", { solutionId, userId: user.id });
  return {
    status: 200,
    body: { success: true, message: "Solution deleted successfully" },
  };
});
