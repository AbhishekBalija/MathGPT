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

import { ApiRouteConfig, Handlers } from "motia";
import { z, ZodError } from "zod";
import {
  solveMathProblem,
  UnsolvableProblemError,
} from "../services/ai/ai.service";
import { requireAuth } from "../middlewares/auth.middleware";
import type { SolveResponse } from "../types/solve.types";

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

export const config: ApiRouteConfig = {
  type: "api",
  name: "SolveMath",
  description:
    "Solve a math problem with step-by-step verified solution (requires auth)",
  path: "/api/solve",
  flows: ["SolutionFlow"],
  method: "POST",
  emits: [
    { topic: "problem-solved", label: "Success" },
    { topic: "problem-error", label: "Error", conditional: true },
  ],
  bodySchema: solveRequestSchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      solution: z.any(),
    }),
    400: z.object({
      error: z.string(),
    }),
    401: z.object({
      error: z.string(),
    }),
    500: z.object({
      success: z.boolean().optional(),
      error: z.string(),
    }),
  },
};

export const handler: Handlers["SolveMath"] = async (
  req,
  { emit, logger, state }
) => {
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
        error: "Authentication required. Please login to use MathGPT.",
      },
    };
  }

  const userId = user.id; // Extract from authenticated user

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

      emit({
        topic: "problem-error",
        data: {
          chatId,
          userId,
          problem: problem.slice(0, 200),
          errorCode: "AI_NOT_CONFIGURED",
          errorMessage: "AI service not configured",
          timestamp: new Date().toISOString(),
        },
      });

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

    // Emit success event for downstream processing (saves to MongoDB)
    emit({
      topic: "problem-solved",
      data: {
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
      },
    });

    // Optionally cache the solution for quick retrieval
    if (chatId) {
      await state.set("solutions", chatId, {
        solution,
        userId,
        cachedAt: new Date().toISOString(),
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

    // Emit error event for analytics and retry handling
    emit({
      topic: "problem-error",
      data: {
        chatId,
        userId,
        problem: problem.slice(0, 200),
        errorCode,
        errorMessage,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      status: 500 as const,
      body: {
        success: false,
        error: errorMessage,
      },
    };
  }
};
