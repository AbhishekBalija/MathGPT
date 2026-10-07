/**
 * Admin Update User Role API
 *
 * PATCH /admin/users/:id/role - Toggle admin role for a user
 *
 * REQUIRES ADMIN AUTHENTICATION (requireUser + requireAdmin middleware)
 */

import { z } from "zod";
import { getCurrentUser } from "../auth/auth.middleware";
import { userRepository } from "../users/user.repository";

const UpdateUserRoleSchema = z.object({
  isAdmin: z.boolean(),
});
import { pathParam, routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";

// PATCH /admin/users/:id/role
export const adminUpdateUserRoleRoute = routeWithBody(UpdateUserRoleSchema, async (req, body) => {
  // Mounted behind requireUser and requireAdmin
  const admin = getCurrentUser(req);

  try {
    const id = pathParam(req, "id");
    const { isAdmin } = body;

    // Prevent admin from removing their own admin status
    if (id === admin.id && !isAdmin) {
      return {
        status: 403,
        body: { error: "Cannot remove your own admin status" },
      };
    }

    const user = await userRepository.setAdmin(id, isAdmin);

    if (!user) {
      return {
        status: 404,
        body: { error: "User not found" },
      };
    }

    logger.info("Admin updated user role", {
      adminId: admin.id,
      targetUserId: id,
      newRole: isAdmin ? "admin" : "user",
    });

    return {
      status: 200,
      body: {
        success: true as const,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to update user role", { error: errorMsg });
    return {
      status: 500,
      body: { error: "Failed to update user role" },
    };
  }
});
