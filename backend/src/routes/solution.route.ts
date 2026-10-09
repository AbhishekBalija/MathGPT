/**
 * GET /api/solution/:id - one of the current User's Solutions, in full.
 * Mounted behind requireUser. Someone else's Solution is a plain 404.
 */

import { pathParam, route } from "../lib/http";
import { getCurrentUser } from "../modules/auth/auth.middleware";
import { solutionRepository } from "../modules/solutions/solution.repository";

export const getSolutionRoute = route(async (req) => {
  const user = getCurrentUser(req);

  const row = await solutionRepository.findForUser(user.id, pathParam(req, "id"));
  if (!row) {
    return { status: 404, body: { error: "Solution not found" } };
  }

  return {
    status: 200,
    body: {
      success: true,
      solution: {
        id: row.id,
        problem: row.problem,
        problemType: row.problemType,
        steps: row.steps.map((step) => ({
          stepNumber: step.stepNumber,
          expression: step.expression,
          justification: step.justification,
          explanation: step.explanation,
          status: step.status,
          notes: step.notes,
        })),
        finalAnswer: row.finalAnswer,
        summary: row.summary,
        formatVersion: row.formatVersion,
        // Stored as saved; null for old-style solutions
        content: row.content,
        processingTimeMs: row.processingTimeMs,
        createdAt: row.createdAt.toISOString(),
      },
    },
  };
});
