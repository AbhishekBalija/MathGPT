/**
 * Admin Token Stats API
 *
 * GET /admin/token-stats - Get token usage stats and estimated costs
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import { requireAdmin } from "../../middlewares/auth.middleware";
import { solutionRepository } from "../../modules/solutions/solution.repository";
import { route } from "../../lib/http";
import { logger } from "../../lib/logger";

// Gemini 2.5 Flash pricing (per 1M tokens)
const GEMINI_FLASH_INPUT_PRICE = 0.075; // $0.075 per 1M input tokens
const GEMINI_FLASH_OUTPUT_PRICE = 0.3; // $0.30 per 1M output tokens (using higher estimate)

// GET /admin/token-stats
export const adminTokenStatsRoute = route(async (req) => {
  // Require admin authentication
  let admin;
  try {
    admin = await requireAdmin(req.headers || {});
  } catch (error) {
    const isUnauthorized =
      error instanceof Error && error.message === "Unauthorized";
    return {
      status: isUnauthorized ? 401 : 403,
      body: {
        error: isUnauthorized ? "Unauthorized" : "Admin access required",
      },
    };
  }

  logger.info("Admin fetching token stats", { adminId: admin.id });

  try {
    const tokenStats = await solutionRepository.tokenTotals();

    // Calculate estimated cost
    const inputCost =
      (tokenStats.totalInputTokens / 1_000_000) * GEMINI_FLASH_INPUT_PRICE;
    const outputCost =
      (tokenStats.totalOutputTokens / 1_000_000) * GEMINI_FLASH_OUTPUT_PRICE;
    const estimatedCost = Math.round((inputCost + outputCost) * 100) / 100; // Round to 2 decimals

    const avgTokensPerSolution =
      tokenStats.solutionCount > 0
        ? Math.round(tokenStats.totalTokens / tokenStats.solutionCount)
        : 0;

    return {
      status: 200,
      body: {
        totalInputTokens: tokenStats.totalInputTokens,
        totalOutputTokens: tokenStats.totalOutputTokens,
        totalTokens: tokenStats.totalTokens,
        estimatedCost,
        solutionCount: tokenStats.solutionCount,
        avgTokensPerSolution,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to fetch token stats", { error: errorMsg });
    return { status: 500, body: { error: "Failed to fetch token stats" } };
  }
});
