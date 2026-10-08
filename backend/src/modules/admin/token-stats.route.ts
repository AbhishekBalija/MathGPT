/**
 * GET /admin/token-stats - token usage summed over saved Solutions, with an
 * estimated AI cost. Mounted behind requireUser and requireAdmin.
 */

import { route } from "../../lib/http";
import { solutionRepository } from "../solutions/solution.repository";

// Gemini 2.5 Flash pricing (per 1M tokens)
const GEMINI_FLASH_INPUT_PRICE = 0.075; // $0.075 per 1M input tokens
const GEMINI_FLASH_OUTPUT_PRICE = 0.3; // $0.30 per 1M output tokens (using higher estimate)

export const adminTokenStatsRoute = route(async () => {
  const totals = await solutionRepository.tokenTotals();

  const inputCost = (totals.totalInputTokens / 1_000_000) * GEMINI_FLASH_INPUT_PRICE;
  const outputCost = (totals.totalOutputTokens / 1_000_000) * GEMINI_FLASH_OUTPUT_PRICE;
  const estimatedCost = Math.round((inputCost + outputCost) * 100) / 100; // 2 decimals

  return {
    status: 200,
    body: {
      totalInputTokens: totals.totalInputTokens,
      totalOutputTokens: totals.totalOutputTokens,
      totalTokens: totals.totalTokens,
      estimatedCost,
      solutionCount: totals.solutionCount,
      avgTokensPerSolution:
        totals.solutionCount > 0 ? Math.round(totals.totalTokens / totals.solutionCount) : 0,
    },
  };
});
