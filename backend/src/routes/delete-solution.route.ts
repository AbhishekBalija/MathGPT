/**
 * Delete Solution API
 *
 * DELETE /api/solution/:id - Delete a solution by ID
 *
 * REQUIRES AUTHENTICATION (only owner can delete)
 */

import { requireAuth } from "../middlewares/auth.middleware";
import { solutionRepository } from "../repositories/solution.repository";
import { pathParam, route } from "../lib/http";
import { logger } from "../lib/logger";

// DELETE /api/solution/:id
export const deleteSolutionRoute = route(async (req) => {
  // Require authentication
  let user;
  try {
    user = await requireAuth(req.headers || {});
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

  logger.info("Deleting solution", { solutionId, userId: user.id });

  try {
    // First verify the solution exists and belongs to this user
    const solution = await solutionRepository.findById(solutionId);

    if (!solution) {
      return {
        status: 404,
        body: { error: "Solution not found" },
      };
    }

    if (solution.userId !== user.id) {
      return {
        status: 403,
        body: { error: "You can only delete your own solutions" },
      };
    }

    // Delete the solution
    const deleted = await solutionRepository.delete(solutionId);

    if (!deleted) {
      return {
        status: 500,
        body: { error: "Failed to delete solution" },
      };
    }

    logger.info("Solution deleted successfully", {
      solutionId,
      userId: user.id,
    });

    return {
      status: 200,
      body: { success: true, message: "Solution deleted successfully" },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to delete solution", {
      error: errorMsg,
      solutionId,
    });
    return {
      status: 500,
      body: { error: "Failed to delete solution" },
    };
  }
});
