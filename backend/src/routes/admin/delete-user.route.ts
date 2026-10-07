/**
 * Admin Delete User API
 *
 * DELETE /admin/users/:id - Delete a user
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.middleware";
import { userRepository } from "../../repositories/user.repository";
import { solutionRepository } from "../../repositories/solution.repository";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminDeleteUser",
  description: "Delete a user (requires admin)",
  path: "/admin/users/:id",
  method: "DELETE",
  emits: [],
  flows: ["admin-flow"],
  responseSchema: {
    200: z.object({
      success: z.literal(true),
      deletedSolutions: z.number(),
    }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export async function handler(
  req: {
    headers?: Record<string, string | string[] | undefined>;
    pathParams: { id: string };
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
    const { id } = req.pathParams;

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
}
