/**
 * Admin Update User Role API (Alternate Route)
 *
 * PUT /admin/users/update-role - Update user admin role
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.middleware";
import { userRepository } from "../../repositories/user.repository";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminUpdateUserRolePut",
  description: "Update user admin role via PUT (requires admin)",
  path: "/admin/users/update-role",
  method: "PUT",
  emits: [],
  flows: ["admin-flow"],
  bodySchema: z.object({
    userId: z.string().min(1, "userId is required"),
    isAdmin: z.boolean(),
  }),
  responseSchema: {
    200: z.object({
      success: z.literal(true),
      user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        isAdmin: z.boolean(),
      }),
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export async function handler(
  req: {
    headers?: Record<string, string | string[] | undefined>;
    body: { userId: string; isAdmin: boolean };
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
    const { userId, isAdmin } = req.body;

    if (!userId) {
      return {
        status: 400,
        body: { error: "userId is required" },
      };
    }

    // Prevent admin from removing their own admin status
    if (userId === admin.id && !isAdmin) {
      return {
        status: 403,
        body: { error: "Cannot remove your own admin status" },
      };
    }

    const user = await userRepository.update(userId, { isAdmin });

    if (!user) {
      return {
        status: 404,
        body: { error: "User not found" },
      };
    }

    logger.info("Admin updated user role", {
      adminId: admin.id,
      targetUserId: userId,
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
}
