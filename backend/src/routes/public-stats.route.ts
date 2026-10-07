/**
 * Public Stats API Endpoint
 *
 * GET /api/public-stats
 *
 * Returns public statistics for social proof on landing page.
 * No authentication required.
 */

import { route } from "../lib/http";
import { logger } from "../lib/logger";
import { userRepository } from "../modules/users/user.repository";

// GET /api/public-stats
export const publicStatsRoute = route(async () => {
  try {
    const userCount = await userRepository.count();

    logger.info("Public stats fetched", { userCount });

    return {
      status: 200 as const,
      body: { userCount },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to fetch public stats", { error: errorMsg });

    return {
      status: 500 as const,
      body: { error: "Failed to fetch stats" },
    };
  }
});
