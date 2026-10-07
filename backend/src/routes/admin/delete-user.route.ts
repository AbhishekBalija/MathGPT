/**
 * Admin Delete User API
 *
 * DELETE /admin/users/:id - Delete a user
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import { requireAdmin } from "../../middlewares/auth.middleware";
import { userRepository } from "../../repositories/user.repository";
import { solutionRepository } from "../../repositories/solution.repository";
import { pathParam, route } from "../../lib/http";
import { logger } from "../../lib/logger";

// DELETE /admin/users/:id
export const adminDeleteUserRoute = route(async (req) => {
  // Require admin authentication
  let admin;
  try {
    admin = await requireAdmin(req.headers || {});
  } catch (error) {
    const isUnauthorized =
      error instanceof Error && error.message === "Unauthorized";
    return {
      status: isUnauthorized ? 401 : 403,
      body: {
        error: isUnauthorized
          ? "Authentication required"
          : "Admin access required",
      },
    };
  }

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

    // Delete user's solutions first
    const deletedSolutions = await solutionRepository.deleteByUserId(id);

    // Delete the user
    const deleted = await userRepository.delete(id);

    if (!deleted) {
      return {
        status: 500,
        body: { error: "Failed to delete user" },
      };
    }

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
