/**
 * Admin Stats API
 *
 * GET /admin/stats - Get dashboard statistics
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.middleware";
import { userRepository } from "../../repositories/user.repository";
import { solutionRepository } from "../../repositories/solution.repository";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminGetStats",
  description: "Get dashboard statistics (requires admin)",
  path: "/admin/stats",
  method: "GET",
  emits: [],
  flows: ["admin-flow"],
  responseSchema: {
    200: z.object({
      totalUsers: z.number(),
      totalSolutions: z.number(),
      solutionsByType: z.record(z.string(), z.number()),
      recentUsers: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
          createdAt: z.string(),
        })
      ),
    }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export async function handler(
  req: {
    headers?: Record<string, string | string[] | undefined>;
  },
  {
    logger,
  }: {
    logger: {
      info: (msg: string, data?: unknown) => void;
      error: (msg: string, data?: unknown) => void;
    };
  }
) {
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
        error: isUnauthorized
          ? "Authentication required"
          : "Admin access required",
      },
    };
  }

  try {
    // Fetch stats in parallel
    const [userStats, solutionsByType, recentUsers] = await Promise.all([
      userRepository.getStats(),
      solutionRepository.countByProblemType(),
      userRepository.findRecent(5),
    ]);

    logger.info("Admin stats loaded", { adminId: admin.id });

    return {
      status: 200,
      body: {
        totalUsers: userStats.totalUsers,
        totalSolutions: userStats.totalSolutions,
        solutionsByType,
        recentUsers: recentUsers.map((u) => ({
          id: u._id.toString(),
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
}
