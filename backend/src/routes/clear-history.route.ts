/**
 * DELETE /api/history (and the older DELETE /api/clear-history) - delete
 * every Solution of the current User. Mounted behind requireUser.
 */

import { route } from "../lib/http";
import { logger } from "../lib/logger";
import { getCurrentUser } from "../modules/auth/auth.middleware";
import { solutionRepository } from "../modules/solutions/solution.repository";

export const clearHistoryRoute = route(async (req) => {
  const user = getCurrentUser(req);

  const deletedCount = await solutionRepository.deleteAllForUser(user.id);
  logger.info("History cleared", { userId: user.id, deletedCount });

  return {
    status: 200,
    body: {
      success: true,
      message: `Deleted ${deletedCount} solution(s)`,
      deletedCount,
    },
  };
});
