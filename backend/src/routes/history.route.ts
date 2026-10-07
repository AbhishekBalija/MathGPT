/**
 * User History API
 *
 * GET /api/history - Get user's solution history
 *
 * REQUIRES AUTHENTICATION
 */

import { requireAuth } from "../middlewares/auth.middleware";
import { SolutionService } from "../services/solution/solution.service";
import { route } from "../lib/http";
import { logger } from "../lib/logger";

// GET /api/history
export const historyRoute = route(async (req) => {
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

  logger.info("Loading user history", { userId: user.id });

  try {
    const solutions = await SolutionService.getUserHistory(user.id, 50);

    // Map to the simpler history format (getHistoryByUserId already does this)
    const history = solutions.map((s) => ({
      id: s.id,
      problem: s.problem,
      problemType: s.problemType,
      finalAnswer: s.finalAnswer,
      createdAt: s.createdAt.toISOString(),
    }));

    logger.info("User history loaded", {
      userId: user.id,
      count: history.length,
    });

    return {
      status: 200,
      body: { success: true, history },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to load user history", {
      error: errorMsg,
      userId: user.id,
    });
    return {
      status: 500,
      body: { error: "Failed to load history" },
    };
  }
});
