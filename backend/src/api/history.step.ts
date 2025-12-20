/**
 * User History API
 *
 * GET /api/history - Get user's solution history
 *
 * REQUIRES AUTHENTICATION
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware";
import { SolutionService } from "../services/solution/solution.service";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetUserHistory",
  description: "Get authenticated user's solution history",
  path: "/api/history",
  method: "GET",
  emits: [],
  flows: ["SolutionFlow"],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      history: z.array(
        z.object({
          id: z.string(),
          problem: z.string(),
          problemType: z.string(),
          finalAnswer: z.string(),
          createdAt: z.string(),
        })
      ),
    }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export async function handler(
  req: { headers?: Record<string, string | string[] | undefined> },
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
}
