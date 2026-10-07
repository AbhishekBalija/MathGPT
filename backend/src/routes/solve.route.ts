/**
 * Solve API Endpoint
 *
 * POST /api/solve
 *
 * Accepts a math problem and returns a step-by-step verified solution
 * designed for notebook-style display with expandable explanations.
 *
 * REQUIRES AUTHENTICATION - User must be logged in with valid access token.
 */

import { z, ZodError } from "zod";
import {
  solveMathProblem,
  UnsolvableProblemError,
} from "../services/ai/ai.service";
import { requireAuth } from "../middlewares/auth.middleware";
import { userRepository } from "../repositories/user.repository";
import type { SolveResponse } from "../types/solve.types";
import { route } from "../lib/http";
import { logger } from "../lib/logger";
import { checkRateLimit } from "../lib/rate-limit";
import { runInBackground } from "../lib/background";
import { handleSolveError } from "../events/solution/handle-solve-error";
import { saveSolution } from "../events/solution/save-solution";

// Daily free limit for users
const DAILY_FREE_LIMIT = 5;

// Request validation schema - userId comes from token, not body
const solveRequestSchema = z.object({
  problem: z
    .string()
    .min(1, "Problem is required")
    .max(2000, "Problem too long"),
  mode: z
    .enum(["step_by_step", "hint", "full"])
    .optional()
    .default("step_by_step"),
  chatId: z.string().optional(),
});

// POST /api/solve
export const solveRoute = route(async (req) => {
  const startTime = Date.now();

  // VALIDATION FIRST - Validate input before auth to return proper 400 for invalid data
  let problem: string;
  let mode: "step_by_step" | "hint" | "full";
  let chatId: string | undefined;

  try {
    const parsed = solveRequestSchema.parse(req.body);
    problem = parsed.problem;
    mode = parsed.mode;
    chatId = parsed.chatId;
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Solve validation failed", { errors: error.issues });
      return {
        status: 400 as const,
        body: {
          error: error.issues[0]?.message || "Invalid request body",
        },
      };
    }
    throw error;
  }

  // AUTHENTICATION - Require valid access token
  let user;
  try {
    user = await requireAuth(
      req.headers as Record<string, string | string[] | undefined>
    );
    logger.info("User authenticated", { userId: user.id, email: user.email });
  } catch (authError) {
    logger.warn("Authentication failed", {
      error: authError instanceof Error ? authError.message : "Unknown",
    });
    return {
      status: 401 as const,
      body: {
        error: "Authentication required. Please login to use NeoMath.",
      },
    };
  }

  const userId = user.id; // Extract from authenticated user

  // RATE LIMITING - 5 requests per minute per user
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  const RATE_LIMIT_MAX_REQUESTS = 5;

  const rateLimit = checkRateLimit(
    `ratelimit:${userId}`,
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_MS
  );

  if (!rateLimit.allowed) {
    logger.warn("Rate limit exceeded", {
      userId,
      limit: RATE_LIMIT_MAX_REQUESTS,
    });

    return {
      status: 429 as const,
      body: {
        error: `Too many requests. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
        retryAfter: rateLimit.retryAfterSeconds,
      },
    };
  }

  // DAILY USAGE LIMIT CHECK
  try {
    const fullUser = await userRepository.findById(userId);
    if (fullUser) {
      const today = new Date().toDateString();
      const lastReset = fullUser.lastCreditReset
        ? new Date(fullUser.lastCreditReset).toDateString()
        : null;

      // Reset daily counter if new day
      if (today !== lastReset) {
        await userRepository.update(userId, {
          dailyCreditsUsed: 0,
          lastCreditReset: new Date(),
        });
      } else if ((fullUser.dailyCreditsUsed || 0) >= DAILY_FREE_LIMIT) {
        // User has exceeded daily limit
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);

        logger.info("Daily limit exceeded", {
          userId,
          dailyCreditsUsed: fullUser.dailyCreditsUsed,
          limit: DAILY_FREE_LIMIT,
        });

        return {
          status: 429 as const,
          body: {
            error: `Daily limit reached (${DAILY_FREE_LIMIT} free problems/day). Come back tomorrow!`,
            resetAt: tomorrow.toISOString(),
            dailyLimit: DAILY_FREE_LIMIT,
          },
        };
      }
    }
  } catch (limitError) {
    // Log but don't block - graceful degradation
    logger.warn("Failed to check daily limit", {
      error: limitError instanceof Error ? limitError.message : "Unknown",
    });
  }

  logger.info("Solve request received", {
    problem: problem.slice(0, 100),
    mode,
    chatId,
    userId,
    userEmail: user.email,
  });

  try {
    // Validate API key is configured
    if (!process.env.GEMINI_MATH_AI_API) {
      logger.error("GEMINI_MATH_AI_API not configured");

      runInBackground("problem-error", () =>
        handleSolveError({
          chatId,
          userId,
          problem: problem.slice(0, 200),
          errorCode: "AI_NOT_CONFIGURED",
          errorMessage: "AI service not configured",
          timestamp: new Date().toISOString(),
        })
      );

      return {
        status: 500 as const,
        body: {
          success: false,
          error: "AI service not configured",
        },
      };
    }

    // Solve the problem using AI
    const solution = await solveMathProblem(problem);

    logger.info("Problem solved successfully", {
      problemType: solution.problemType,
      stepsCount: solution.steps.length,
      processingTimeMs: solution.processingTimeMs,
      userId,
    });

    // Save to MongoDB before responding so the solution is never lost
    await saveSolution({
      chatId,
      userId,
      solution: {
        ...solution,
        createdAt: solution.createdAt,
      },
      problemType: solution.problemType,
      stepsCount: solution.steps.length,
      processingTimeMs: solution.processingTimeMs,
      timestamp: new Date().toISOString(),
    });

    // INCREMENT DAILY USAGE COUNTER (after successful solve)
    try {
      logger.info("Incrementing credits for user", { userId });
      await userRepository.incrementCredits(userId);
      logger.info("Credits incremented successfully", { userId });
    } catch (updateError) {
      logger.warn("Failed to increment usage counter", {
        userId,
        error: updateError instanceof Error ? updateError.message : "Unknown",
      });
    }

    return {
      status: 200 as const,
      body: {
        success: true,
        solution,
      },
    };
  } catch (error) {
    // Handle unsolvable problems with 400, not 500
    if (error instanceof UnsolvableProblemError) {
      logger.warn("Unsolvable problem", {
        problem: problem.slice(0, 100),
        error: error.message,
        userId,
      });
      return {
        status: 400 as const,
        body: {
          error: error.message,
        },
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const errorCode = error instanceof Error ? error.name : "UNKNOWN_ERROR";

    logger.error("Failed to solve problem", {
      error: errorMessage,
      errorCode,
      processingTimeMs: Date.now() - startTime,
      userId,
    });

    // Log the error for the admin dashboard without delaying the response
    runInBackground("problem-error", () =>
      handleSolveError({
        chatId,
        userId,
        problem: problem.slice(0, 200),
        errorCode,
        errorMessage,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      })
    );

    return {
      status: 500 as const,
      body: {
        success: false,
        error: errorMessage,
      },
    };
  }
});
