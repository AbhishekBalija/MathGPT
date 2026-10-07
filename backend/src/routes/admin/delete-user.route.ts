/**
 * Admin Delete User API
 *
 * DELETE /admin/users/:id - Delete a user
 *
 * REQUIRES ADMIN AUTHENTICATION (requireUser + requireAdmin middleware)
 */

import { getCurrentUser } from "../../modules/auth/auth.middleware";
import { userRepository } from "../../modules/users/user.repository";
import { solutionRepository } from "../../repositories/solution.repository";
import { pathParam, route } from "../../lib/http";
import { logger } from "../../lib/logger";

// DELETE /admin/users/:id
export const adminDeleteUserRoute = route(async (req) => {
  // Mounted behind requireUser and requireAdmin
  const admin = getCurrentUser(req);

  try {
    const id = pathParam(req, "id");

    // Prevent admin from deleting themselves
    if (id === admin.id) {
      return {
        status: 403,
        body: { error: "Cannot delete your own account" },
      };
    }

    // Check if user exists
    const user = await userRepository.findById(id);
    if (!user) {
      return {
        status: 404,
        body: { error: "User not found" },
      };
    }

    // The User goes first: if removing their Solutions then fails, we are left
    // with unreachable Solutions instead of a User who lost all their work.
    // Solutions move to Postgres in #7, where a cascade does both at once.
    const deleted = await userRepository.delete(id);

    if (!deleted) {
      return {
        status: 500,
        body: { error: "Failed to delete user" },
      };
    }

    const deletedSolutions = await solutionRepository.deleteByUserId(id);

    logger.info("Admin deleted user", {
      adminId: admin.id,
      deletedUserId: id,
      deletedSolutions,
    });

    return {
      status: 200,
      body: {
        success: true as const,
        deletedSolutions,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to delete user", { error: errorMsg });
    return {
      status: 500,
      body: { error: "Failed to delete user" },
    };
  }
});
