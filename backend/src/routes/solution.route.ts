/**
 * Get Solution API
 *
 * GET /api/solution/:id - Get full solution by ID
 *
 * REQUIRES AUTHENTICATION
 */

import { requireAuth } from "../middlewares/auth.middleware";
import { solutionRepository } from "../repositories/solution.repository";
import { pathParam, route } from "../lib/http";
import { logger } from "../lib/logger";

// GET /api/solution/:id
export const getSolutionRoute = route(async (req) => {
  // Require authentication
  try {
    await requireAuth(req.headers || {});
  } catch {
    return {
      status: 401,
      body: { error: "Authentication required" },
    };
  }

  const solutionId = pathParam(req, "id");

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
});
