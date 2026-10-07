/**
 * Clear All History API
 *
 * DELETE /api/history - Delete all solutions for the authenticated user
 *
 * REQUIRES AUTHENTICATION
 */

import { requireAuth } from "../middlewares/auth.middleware";
import { solutionRepository } from "../repositories/solution.repository";
import { route } from "../lib/http";
import { logger } from "../lib/logger";

// DELETE /api/clear-history
export const clearHistoryRoute = route(async (req) => {
  // Require authentication
  let user;
  try {
    user = await requireAuth(req.headers || {});
  } catch {
    return {
      status: 401,
      body: { error: "Authentication required" },
    };
  }

  logger.info("Clearing all history", { userId: user.id });

  try {
    const deletedCount = await solutionRepository.deleteByUserId(user.id);

    logger.info("All history cleared", { userId: user.id, deletedCount });

    return {
      status: 200,
      body: {
        success: true,
        message: `Deleted ${deletedCount} solution(s)`,
        deletedCount,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to clear history", {
      error: errorMsg,
      userId: user.id,
    });
    return {
      status: 500,
      body: { error: "Failed to clear history" },
    };
  }
});
