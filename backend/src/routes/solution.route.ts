/**
 * Get Solution API
 *
 * GET /api/solution/:id - Get full solution by ID
 *
 * REQUIRES AUTHENTICATION
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware";
import { solutionRepository } from "../repositories/solution.repository";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetSolution",
  description: "Get a full solution by its ID",
  path: "/api/solution/:id",
  method: "GET",
  emits: [],
  flows: ["SolutionFlow"],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      solution: z.object({
        id: z.string(),
        problem: z.string(),
        problemType: z.string(),
        steps: z.array(
          z.object({
            stepNumber: z.number(),
            expression: z.string(),
            justification: z.string(),
            explanation: z.string(),
            status: z.string(),
            notes: z.string().optional(),
          })
        ),
        finalAnswer: z.string(),
        summary: z.string(),
        processingTimeMs: z.number(),
        createdAt: z.string(),
      }),
    }),
    401: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export async function handler(
  req: {
    headers?: Record<string, string | string[] | undefined>;
    pathParams?: Record<string, string>;
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
  // Require authentication
  try {
    await requireAuth(req.headers || {});
  } catch {
    return {
      status: 401,
      body: { error: "Authentication required" },
    };
  }

  const solutionId = req.pathParams?.id;

  if (!solutionId) {
    return {
      status: 404,
      body: { error: "Solution ID is required" },
    };
  }

  logger.info("Fetching solution", { solutionId });

  try {
    const doc = await solutionRepository.findById(solutionId);

    if (!doc) {
      return {
        status: 404,
        body: { error: "Solution not found" },
      };
    }

    const solution = {
      id: doc._id.toString(),
      problem: doc.problem,
      problemType: doc.problemType,
      steps: doc.steps.map((step) => ({
        stepNumber: step.stepNumber,
        expression: step.expression,
        justification: step.justification,
        explanation: step.explanation,
        status: step.status,
        notes: step.notes,
      })),
      finalAnswer: doc.finalAnswer,
      summary: doc.summary,
      processingTimeMs: doc.processingTimeMs,
      createdAt: doc.createdAt.toISOString(),
    };

    logger.info("Solution fetched successfully", { solutionId });

    return {
      status: 200,
      body: { success: true, solution },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to fetch solution", {
      error: errorMsg,
      solutionId,
    });
    return {
      status: 500,
      body: { error: "Failed to fetch solution" },
    };
  }
}
