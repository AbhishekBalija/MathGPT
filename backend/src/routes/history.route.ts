/**
 * GET /api/history - the current User's Solutions, newest first (no Steps).
 * Mounted behind requireUser.
 */

import { route } from "../lib/http";
import { logger } from "../lib/logger";
import { getCurrentUser } from "../modules/auth/auth.middleware";
import { solutionRepository } from "../modules/solutions/solution.repository";

const HISTORY_LIMIT = 50;

export const historyRoute = route(async (req) => {
  const user = getCurrentUser(req);

  const items = await solutionRepository.historyForUser(user.id, HISTORY_LIMIT);
  logger.info("User history loaded", { userId: user.id, count: items.length });

  return {
    status: 200,
    body: {
      success: true,
      history: items.map((item) => ({
        id: item.id,
        problem: item.problem,
        problemType: item.problemType,
        finalAnswer: item.finalAnswer,
        createdAt: item.createdAt.toISOString(),
      })),
    },
  };
});
