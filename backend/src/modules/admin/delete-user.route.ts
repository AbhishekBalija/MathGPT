/**
 * Admin Delete User API
 *
 * DELETE /admin/users/:id - Delete a user
 *
 * REQUIRES ADMIN AUTHENTICATION (requireUser + requireAdmin middleware)
 */

import { getCurrentUser } from "../auth/auth.middleware";
import { userRepository } from "../users/user.repository";
import { solutionRepository } from "../solutions/solution.repository";
import { inTransaction } from "../../db/transaction";
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

    // Counted for the response inside the same transaction as the delete, so
    // the number matches what the database cascade removes with the User
    const { deleted, deletedSolutions } = await inTransaction(async (tx) => ({
      deletedSolutions: await solutionRepository.countForUser(id, tx),
      deleted: await userRepository.delete(id, tx),
    }));

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
