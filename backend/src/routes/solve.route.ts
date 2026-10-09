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
import { randomUUID } from "node:crypto";
import {
  InvalidSolverOutputError,
  UnsolvableProblemError,
} from "../services/ai/solver-errors";
import { METHOD_ID_PATTERN } from "../services/ai/prompts";
import type { Solution } from "../types/solve.types";
import type { MathSolver } from "../modules/ai/math-solver";
import { getCurrentUser } from "../modules/auth/auth.middleware";
import { userRepository } from "../modules/users/user.repository";
import { route } from "../lib/http";
import { logger } from "../lib/logger";
import { rateLimitRepository } from "../modules/rate-limits/rate-limit.repository";
import { runInBackground } from "../lib/background";
import { handleSolveError } from "../events/solution/handle-solve-error";
import { trackAnalytics } from "../events/solution/track-analytics";
import { solutionRepository } from "../modules/solutions/solution.repository";
import { trySolveArithmetic } from "../modules/solver/instant/arithmetic";

// Daily free limit for users
const DAILY_FREE_LIMIT = 5;

// Short-window limit on solving, separate from the Daily Limit
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60;

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
  // Id of the method the student picked, e.g. "quadratic-formula"
  method: z.string().min(1).max(50).regex(METHOD_ID_PATTERN, "Invalid method").optional(),
});

// POST /api/solve
export function createSolveRoute(solver: MathSolver) {
  return route(async (req) => {
    const startTime = Date.now();

    // VALIDATION - requireUser has already checked the token
    let problem: string;
    let mode: "step_by_step" | "hint" | "full";
    let chatId: string | undefined;
    let method: string | undefined;

    try {
      const parsed = solveRequestSchema.parse(req.body);
      problem = parsed.problem;
      mode = parsed.mode;
      chatId = parsed.chatId;
      method = parsed.method;
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

    // Mounted behind requireUser, so the User is already loaded
    const user = getCurrentUser(req);
    const userId = user.id;

    // RATE LIMITING - 5 requests per minute per User, shared by every server instance
    const rateLimit = await rateLimitRepository.hit(
      `solve:user:${userId}`,
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_SECONDS
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
          code: "RATE_LIMITED",
          retryAfter: rateLimit.retryAfterSeconds,
        },
      };
    }

    // INSTANT ANSWER - plain arithmetic is solved here, with no AI and no
    // Credit, so it works even when the Daily Limit is used up
    try {
      const instant = trySolveArithmetic(problem);
      if (instant) {
        const solution: Solution = {
          id: randomUUID(),
          problem,
          problemType: "unknown",
          steps: [],
          finalAnswer: instant.answer.latex ?? instant.answer.text ?? "",
          summary: instant.problem.task,
          content: instant,
          processingTimeMs: Date.now() - startTime,
          createdAt: new Date().toISOString(),
        };

        // Saved like any other solve, so it shows in the sidebar
        try {
          await solutionRepository.create(userId, solution, chatId);
        } catch (saveError) {
          logger.error("Failed to save instant solution", {
            solutionId: solution.id,
            userId,
            error: saveError instanceof Error ? saveError.message : "Unknown error",
          });
          return {
            status: 500 as const,
            body: { success: false, error: "Internal server error" },
          };
        }

        return {
          status: 200 as const,
          body: {
            success: true,
            source: "instant" as const,
            solution: {
              id: solution.id,
              createdAt: solution.createdAt,
              formatVersion: 2,
              content: instant,
            },
          },
        };
      }
    } catch (instantError) {
      // Only a division by zero gets here. Same answer as an unsolvable problem.
      if (instantError instanceof UnsolvableProblemError) {
        return {
          status: 400 as const,
          body: { error: instantError.message, code: "UNSOLVABLE" },
        };
      }
      throw instantError;
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
          await userRepository.resetDailyCredits(userId);
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
      const result = await solver.solve(problem, { method });
      const { content } = result;

      // The new format keeps its steps in `content`. The old columns still
      // need a value, so they get the answer as text and no steps.
      const solution: Solution = {
        id: randomUUID(),
        problem,
        problemType: result.problemType,
        steps: [],
        finalAnswer: content.answer.latex ?? content.answer.text ?? "",
        summary: content.problem.task,
        content,
        processingTimeMs: result.processingTimeMs,
        tokenUsage: result.tokenUsage,
        createdAt: new Date().toISOString(),
      };

      logger.info("Problem solved successfully", {
        problemType: solution.problemType,
        stepsCount: content.steps.length,
        processingTimeMs: solution.processingTimeMs,
        userId,
      });

      // Saved before responding, under the solver's id, so the id we return
      // is the one the User can open and delete. If saving fails, no Credit
      // is spent and the User gets a generic error (the real one is logged).
      try {
        await solutionRepository.create(userId, solution, chatId);
      } catch (saveError) {
        const saveErrorMessage =
          saveError instanceof Error ? saveError.message : "Unknown error";
        logger.error("Failed to save solution", {
          solutionId: solution.id,
          userId,
          error: saveErrorMessage,
        });
        // Shows up on the admin error dashboard like any other failed solve
        runInBackground("problem-error", () =>
          handleSolveError({
            chatId,
            userId,
            problem: problem.slice(0, 200),
            errorCode: "SOLUTION_SAVE_FAILED",
            errorMessage: saveErrorMessage,
            processingTimeMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          })
        );
        return {
          status: 500 as const,
          body: { success: false, error: "Internal server error" },
        };
      }

      runInBackground("track-analytics", () =>
        trackAnalytics({
          event: "solution_saved",
          properties: {
            problemType: solution.problemType,
            stepsCount: content.steps.length,
            processingTimeMs: solution.processingTimeMs,
            userId,
          },
          timestamp: new Date().toISOString(),
        })
      );

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
          source: "ai" as const,
          solution: {
            id: solution.id,
            createdAt: solution.createdAt,
            formatVersion: 2,
            content,
          },
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
            code: "UNSOLVABLE",
          },
        };
      }

      // The AI answered twice in a broken format. Friendly message, no credit spent.
      if (error instanceof InvalidSolverOutputError) {
        logger.error("AI output stayed invalid after a retry", {
          problem: problem.slice(0, 100),
          error: error.message,
          processingTimeMs: Date.now() - startTime,
          userId,
        });
        runInBackground("problem-error", () =>
          handleSolveError({
            chatId,
            userId,
            problem: problem.slice(0, 200),
            errorCode: "INVALID_OUTPUT",
            errorMessage: error.message,
            processingTimeMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          })
        );
        return {
          status: 502 as const,
          body: {
            success: false,
            error: "Neo got confused by this one. Please try again.",
            code: "INVALID_OUTPUT",
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
}
