/**
 * Records a failed solve as an Error Log (with the Problem text, so an Admin
 * can see what failed) plus a "solve_error" Analytics Event.
 * Runs in the background; a failure is logged and never breaks a request.
 */

import { logger } from "../../lib/logger";
import { analyticsRepository } from "../../modules/analytics/analytics.repository";

export interface SolveErrorData {
  chatId?: string;
  userId?: string;
  problem: string;
  errorCode: string;
  errorMessage: string;
  processingTimeMs?: number;
  timestamp: string;
}

export async function handleSolveError(data: SolveErrorData): Promise<void> {
  const { userId, problem, errorCode, errorMessage, processingTimeMs } = data;

  logger.warn("Recording solve error", {
    errorCode,
    userId,
    problemPreview: problem.slice(0, 50),
  });

  // Independent writes: if one fails, the other is still recorded
  const results = await Promise.allSettled([
    analyticsRepository.recordError({
      errorCode,
      errorMessage,
      problemText: problem,
      userId,
      processingTimeMs,
    }),
    analyticsRepository.recordEvent(
      "solve_error",
      { errorCode, errorMessage: errorMessage.slice(0, 100), processingTimeMs },
      userId
    ),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error("Failed to record solve error", {
        error: result.reason instanceof Error ? result.reason.message : "Unknown error",
      });
    }
  }
}
