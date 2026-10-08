/**
 * Admin Stats API
 *
 * GET /admin/stats - Get dashboard statistics
 *
 * REQUIRES ADMIN AUTHENTICATION (requireUser + requireAdmin middleware)
 */

import { getCurrentUser } from "../auth/auth.middleware";
import { userRepository } from "../users/user.repository";
import { solutionRepository } from "../solutions/solution.repository";
import { route } from "../../lib/http";
import { logger } from "../../lib/logger";

// GET /admin/stats
export const adminStatsRoute = route(async (req) => {
  // Mounted behind requireUser and requireAdmin
  const admin = getCurrentUser(req);

  try {
    // Fetch stats in parallel
    const [totalUsers, totalSolutions, solutionsByType, recentUsers] = await Promise.all([
      userRepository.count(),
      solutionRepository.countAll(),
      solutionRepository.countByProblemType(),
      userRepository.findRecent(5),
    ]);

    logger.info("Admin stats loaded", { adminId: admin.id });

    return {
      status: 200,
      body: {
        totalUsers,
        totalSolutions,
        solutionsByType,
        recentUsers: recentUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to load admin stats", { error: errorMsg });
    return {
      status: 500,
      body: { error: "Failed to load stats" },
    };
  }
});
