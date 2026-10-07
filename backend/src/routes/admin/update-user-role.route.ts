/**
 * Admin Update User Role API
 *
 * PATCH /admin/users/:id/role - Toggle admin role for a user
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.middleware";
import { userRepository } from "../../repositories/user.repository";

const UpdateUserRoleSchema = z.object({
  isAdmin: z.boolean(),
});
import { pathParam, routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";

// PATCH /admin/users/:id/role
export const adminUpdateUserRoleRoute = routeWithBody(UpdateUserRoleSchema, async (req, body) => {
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
    const { isAdmin } = body;

    // Prevent admin from removing their own admin status
    if (id === admin.id && !isAdmin) {
      return {
        status: 403,
        body: { error: "Cannot remove your own admin status" },
      };
    }

    const user = await userRepository.update(id, { isAdmin });

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
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin || false,
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
