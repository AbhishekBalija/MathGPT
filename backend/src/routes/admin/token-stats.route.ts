/**
 * Admin Token Stats API
 *
 * GET /admin/token-stats - Get token usage stats and estimated costs
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.middleware";
import { solutionRepository } from "../../repositories/solution.repository";

// Gemini 2.5 Flash pricing (per 1M tokens)
const GEMINI_FLASH_INPUT_PRICE = 0.075; // $0.075 per 1M input tokens
const GEMINI_FLASH_OUTPUT_PRICE = 0.3; // $0.30 per 1M output tokens (using higher estimate)

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminGetTokenStats",
  description:
    "Get token usage statistics and estimated costs (requires admin)",
  path: "/admin/token-stats",
  method: "GET",
  emits: [],
  flows: ["admin-flow"],
  responseSchema: {
    200: z.object({
      totalInputTokens: z.number(),
      totalOutputTokens: z.number(),
      totalTokens: z.number(),
      estimatedCost: z.number(),
      solutionCount: z.number(),
      avgTokensPerSolution: z.number(),
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
        error: isUnauthorized ? "Unauthorized" : "Admin access required",
      },
    };
  }

  logger.info("Admin fetching token stats", { adminId: admin.id });

  try {
    // Get token usage stats from solutions collection
    const tokenStats = await solutionRepository.getTokenStats();

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
}
