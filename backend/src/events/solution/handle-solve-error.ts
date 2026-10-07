/**
 * Handle Solve Error Event Handler
 *
 * Handles errors from the solve API:
 * - Logs errors for debugging
 * - Tracks error analytics
 * - Could trigger retries or notifications
 */

import { z } from "zod";
import { logger } from "../../lib/logger";
import { trackAnalytics } from "./track-analytics";

const ProblemErrorSchema = z.object({
  chatId: z.string().optional(),
  userId: z.string().optional(),
  problem: z.string(),
  errorCode: z.string(),
  errorMessage: z.string(),
  processingTimeMs: z.number().optional(),
  timestamp: z.string(),
});

export type SolveErrorEvent = z.infer<typeof ProblemErrorSchema>;

export async function handleSolveError(data: SolveErrorEvent): Promise<void> {
  const {
    chatId,
    userId,
    problem,
    errorCode,
    errorMessage,
    processingTimeMs,
    timestamp,
  } = data;

  logger.warn("Processing solve error", {
    errorCode,
    errorMessage,
    chatId,
    userId,
    problemPreview: problem.slice(0, 50),
  });

  try {
    // Short id so this error can be found in the logs
    const errorId = `err-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    // Track error analytics (stored in error_logs for the admin dashboard)
    await trackAnalytics({
      event: "solve_error",
      properties: {
        errorCode,
        errorMessage: errorMessage.slice(0, 100),
        userId,
        processingTimeMs,
      },
      timestamp,
    });

    logger.info("Solve error processed", { errorId, errorCode });
  } catch (error) {
    const err = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to process solve error", { error: err });
  }
}
