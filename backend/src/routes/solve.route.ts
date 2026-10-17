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
import { isNewDailyLimitDay, limitFor, nextDailyLimitReset } from "../modules/users/daily-limit";
import { getSettings } from "../modules/settings/settings";
import type { SolveAlerts } from "../modules/alerts/solve-alerts";
import { randomUUID } from "node:crypto";
import {
  InvalidSolverOutputError,
  NOT_MATH_MESSAGE,
  NotMathError,
  UnsolvableProblemError,
} from "../services/ai/solver-errors";
import { checkProblem } from "../modules/solver/guard/check-problem";
import type { RejectionReason } from "../modules/solver/guard/check-problem";
import { cacheKey, solutionCache } from "../modules/solver/cache/solution-cache";
import { putInCache, secondModelCheck, solveWithCodeCheck } from "../modules/solver/cache/share-checked";
import { METHOD_ID_PATTERN, PROMPT_VERSION } from "../services/ai/prompts";
import type { Solution } from "../types/solve.types";
import { AllModelsFailedError } from "../services/ai/failover";
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
import { errorCodeFor } from "../modules/solver/error-code";
import type { ErrorDetails } from "../db/schema";


// Enough of a pasted worksheet for the admin to see what failed
const MAX_LOGGED_PROBLEM = 2000;

function logged(problem: string): string {
  return problem.slice(0, MAX_LOGGED_PROBLEM);
}

// One "solution_saved" event per solve, so the admin can count AI, cache and instant answers
function trackSaved(
  userId: string,
  solution: Solution,
  stepsCount: number,
  source: "ai" | "cache" | "instant",
  model: string | null
): void {
  runInBackground("track-analytics", () =>
    trackAnalytics({
      event: "solution_saved",
      properties: {
        problemType: solution.problemType,
        stepsCount,
        processingTimeMs: solution.processingTimeMs,
        source,
        model,
        promptVersion: PROMPT_VERSION,
        userId,
      },
      timestamp: new Date().toISOString(),
    })
  );
}

// One "problem_rejected" event per guard rejection, with the reason only,
// so the admin can see what the guard blocks without storing the text
function trackRejected(userId: string, reason: RejectionReason): void {
  runInBackground("track-analytics", () =>
    trackAnalytics({
      event: "problem_rejected",
      properties: { reason, userId },
      timestamp: new Date().toISOString(),
    })
  );
}

// What each model said, for the admin's failed-solve details
function failureDetails(error: unknown, fullMessage: string): ErrorDetails {
  const attempts =
    error instanceof AllModelsFailedError
      ? error.attempts.map((attempt) => ({ model: attempt.label, error: attempt.reason }))
      : [{ model: "unknown", error: error instanceof Error ? error.message : "Unknown error" }];
  return { attempts, promptVersion: PROMPT_VERSION, fullMessage };
}

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
export function createSolveRoute(solver: MathSolver, alerts: SolveAlerts) {
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

    // MAINTENANCE MODE - solving is paused for everyone but admins, so an
    // admin can test a fix and a team account shows what students see
    const settings = await getSettings();
    if (settings.maintenance.on && !user.isAdmin) {
      return {
        status: 503 as const,
        body: { error: settings.maintenance.message, message: settings.maintenance.message, code: "MAINTENANCE" },
      };
    }

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

    // PROBLEM GUARD - a lone number, a phone number, an essay request and
    // so on never reach the instant answer or the AI, cost no Credit and
    // are never saved. See modules/solver/guard/README.md
    const guard = checkProblem(problem);
    if (!guard.ok) {
      logger.info("Problem Guard turned a Problem away", { userId, reason: guard.reason });
      trackRejected(userId, guard.reason);
      return notMathResponse(guard.reason);
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

        trackSaved(userId, solution, 0, "instant", null);
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

    // SHARED CACHE - a solution another student already got, and whose
    // answer passed a check. No AI call and no Credit.
    // The student's level is not known yet (onboarding, #39), so it is left out.
    const key = cacheKey(problem, undefined, method);
    let cached: Awaited<ReturnType<typeof solutionCache.get>> = null;
    try {
      cached = await solutionCache.get(key);
    } catch (cacheError) {
      // The cache is a shortcut; if it fails, solve as normal
      logger.warn("Failed to read the solution cache", {
        error: cacheError instanceof Error ? cacheError.message : "Unknown",
      });
    }

    if (cached) {
      const solution: Solution = {
        id: randomUUID(),
        cacheKey: key,
        problem,
        problemType: cached.problemType,
        steps: [],
        finalAnswer: cached.content.answer.latex ?? cached.content.answer.text ?? "",
        summary: cached.content.problem.task,
        content: cached.content,
        processingTimeMs: Date.now() - startTime,
        createdAt: new Date().toISOString(),
      };

      // Saved for this student too, so it shows in their History
      try {
        await solutionRepository.create(userId, solution, chatId);
      } catch (saveError) {
        logger.error("Failed to save cached solution", {
          solutionId: solution.id,
          userId,
          error: saveError instanceof Error ? saveError.message : "Unknown error",
        });
        return {
          status: 500 as const,
          body: { success: false, error: "Internal server error" },
        };
      }

      logger.info("Served a shared solution", { userId });
      trackSaved(userId, solution, cached.content.steps.length, "cache", cached.model);
      return {
        status: 200 as const,
        body: {
          success: true,
          source: "cache" as const,
          solution: {
            id: solution.id,
            createdAt: solution.createdAt,
            formatVersion: 2,
            content: cached.content,
          },
        },
      };
    }

    // DAILY USAGE LIMIT CHECK
    try {
      const fullUser = await userRepository.findById(userId);
      if (fullUser) {
        const dailyLimit = limitFor(fullUser, settings);
        // Reset the daily counter on a new India day
        if (isNewDailyLimitDay(fullUser.lastCreditReset)) {
          await userRepository.resetDailyCredits(userId);
        } else if (dailyLimit !== null && (fullUser.dailyCreditsUsed || 0) >= dailyLimit) {
          // User has exceeded daily limit
          const tomorrow = nextDailyLimitReset();

          logger.info("Daily limit exceeded", {
            userId,
            dailyCreditsUsed: fullUser.dailyCreditsUsed,
            limit: dailyLimit,
          });

          return {
            status: 429 as const,
            body: {
              error: `Daily limit reached (${dailyLimit} free problems/day). Come back tomorrow!`,
              resetAt: tomorrow.toISOString(),
              dailyLimit,
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
            problem: logged(problem),
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
      // Solve, then the code check: the "Checked by ..." label only when it
      // passed, one retry when it failed, and a warning if it failed again
      const { result, content, check } = await solveWithCodeCheck(solver, problem, method);

      // The new format keeps its steps in `content`. The old columns still
      // need a value, so they get the answer as text and no steps.
      const solution: Solution = {
        id: randomUUID(),
        // A failed answer never goes into the cache, so it has no key
        cacheKey: check === "failed" ? undefined : key,
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
            problem: logged(problem),
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

      trackSaved(userId, solution, content.steps.length, "ai", result.model ?? null);
      // The AI answered, so if solving was failing it is back
      runInBackground("solve-alert", () => alerts.onSolveSucceeded());

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

      // SHARE ONLY CHECKED ANSWERS
      let askSecondModel = false;
      try {
        ({ askSecondModel } = await putInCache(key, result, content, check));
      } catch (cacheError) {
        logger.warn("Failed to write the solution cache", {
          error: cacheError instanceof Error ? cacheError.message : "Unknown",
        });
      }
      // Only on a repeat ask, so a problem asked once never costs a second call
      if (askSecondModel) {
        // A second model, after the response, so the student never waits for it
        runInBackground("second-model-check", () =>
          secondModelCheck(solver, key, problem, { ...result, content })
        );
      }
      if (check === "failed") {
        // Code showed the AI's answer is wrong: not shared, and flagged for the admin
        runInBackground("problem-error", () =>
          handleSolveError({
            chatId,
            userId,
            problem: logged(problem),
            errorCode: "ANSWER_CHECK_FAILED",
            errorMessage: `Code check failed twice for answer: ${(content.answer.latex ?? content.answer.text ?? "").slice(0, 200)}`,
            processingTimeMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          })
        );
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
      // The AI says it is not math. The AI was called, so the Credit is used.
      if (error instanceof NotMathError) {
        try {
          await userRepository.incrementCredits(userId);
        } catch (updateError) {
          logger.warn("Failed to increment usage counter", {
            userId,
            error: updateError instanceof Error ? updateError.message : "Unknown",
          });
        }
        return notMathResponse("not_math");
      }

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
            problem: logged(problem),
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
      const errorCode = errorCodeFor(error);
      // What each model really said goes to the admin log, never to the student
      const loggedMessage =
        error instanceof AllModelsFailedError
          ? `${errorMessage}: ${error.reasons}`
          : errorMessage;

      logger.error("Failed to solve problem", {
        error: loggedMessage,
        errorCode,
        processingTimeMs: Date.now() - startTime,
        userId,
      });

      // Counts toward a "solving is failing" email (AI provider failures only)
      runInBackground("solve-alert", () => alerts.onSolveFailed(errorCode));

      // Log the error for the admin dashboard without delaying the response
      runInBackground("problem-error", () =>
        handleSolveError({
          chatId,
          userId,
          problem: logged(problem),
          errorCode,
          errorMessage: loggedMessage,
          details: failureDetails(error, loggedMessage),
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

// Same reply for the guard and for the AI saying "not math"
// The reason tells the frontend which reply to show; error stays the
// generic line for older clients
function notMathResponse(reason: RejectionReason) {
  return {
    status: 422 as const,
    body: { error: NOT_MATH_MESSAGE, code: "NOT_MATH", reason },
  };
}
