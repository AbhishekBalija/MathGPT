/**
 * Clear All History API
 *
 * DELETE /api/history - Delete all solutions for the authenticated user
 *
 * REQUIRES AUTHENTICATION
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware";
import { solutionRepository } from "../repositories/solution.repository";

export const config: ApiRouteConfig = {
  type: "api",
  name: "ClearAllHistory",
  description: "Delete all solutions for the authenticated user",
  path: "/api/history",
  method: "DELETE",
  emits: [],
  flows: ["SolutionFlow"],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      deletedCount: z.number(),
    }),
    401: z.object({ error: z.string() }),
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
}
