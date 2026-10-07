/**
 * Handle Solve Error Event Handler
 *
 * Subscribes to: problem-error
 *
 * Handles errors from the solve API:
 * - Logs errors for debugging
 * - Tracks error analytics
 * - Could trigger retries or notifications
 */

import { EventConfig, Handlers } from "motia";
import { z } from "zod";

const ProblemErrorSchema = z.object({
  chatId: z.string().optional(),
  userId: z.string().optional(),
  problem: z.string(),
  errorCode: z.string(),
  errorMessage: z.string(),
  processingTimeMs: z.number().optional(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "HandleSolveError",
  description: "Handles errors from solve API for logging and analytics",
  subscribes: ["problem-error"],
  emits: [
    { topic: "error-logged", label: "Error Logged" },
    { topic: "analytics-track", label: "Track Error", conditional: true },
  ],
  input: ProblemErrorSchema,
  flows: ["SolutionFlow"],
};

export const handler: Handlers["HandleSolveError"] = async (
  data,
  { emit, logger, state }
) => {
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
    // Store error for debugging/analytics
    const errorId = `err-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    await state.set("errors", errorId, {
      errorCode,
      errorMessage,
      problem,
      chatId,
      userId,
      processingTimeMs,
      timestamp,
      loggedAt: new Date().toISOString(),
    });

    // Track error rate per user (for rate limiting or support)
    if (userId) {
      const userErrors = (await state.get<{
        count: number;
        lastErrorAt: string;
      }>("user-errors", userId)) || {
        count: 0,
        lastErrorAt: "",
      };

      await state.set("user-errors", userId, {
        count: userErrors.count + 1,
        lastErrorAt: new Date().toISOString(),
      });

      // Log warning if user has too many errors
      if (userErrors.count > 5) {
        logger.warn("User has high error rate", {
          userId,
          errorCount: userErrors.count + 1,
        });
      }
    }

    // Emit event to confirm error was logged (no subscriber, comment out)
    // emit({
    //   topic: "error-logged",
    //   data: {
    //     errorId,
    //     errorCode,
    //     chatId,
    //     userId,
    //     loggedAt: new Date().toISOString(),
    //   },
    // });

    // Track error analytics
    emit({
      topic: "analytics-track",
      data: {
        event: "solve_error",
        properties: {
          errorCode,
          errorMessage: errorMessage.slice(0, 100),
          userId,
          processingTimeMs,
        },
        timestamp,
      },
    });

    logger.info("Solve error processed", { errorId, errorCode });
  } catch (error) {
    const err = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to process solve error", { error: err });
  }
};
