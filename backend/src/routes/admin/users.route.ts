/**
 * Admin Users API
 *
 * GET /admin/users - List users with pagination and search
 * PATCH /admin/users/:id/role - Toggle admin role
 * DELETE /admin/users/:id - Delete a user
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import { requireAdmin } from "../../middlewares/auth.middleware";
import { userRepository } from "../../repositories/user.repository";
import { queryParam, route } from "../../lib/http";
import { logger } from "../../lib/logger";

// GET /admin/users
export const adminListUsersRoute = route(async (req) => {
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
    const pageParam = queryParam(req, "page");
    const limitParam = queryParam(req, "limit");
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const search = queryParam(req, "search") || undefined;

    logger.info("Admin users search request", {
      search,
      page,
      limit,
    });

    const { users, total } = await userRepository.findAll(
      { search },
      page,
      limit
    );

    logger.info("Admin listed users", {
      adminId: admin.id,
      page,
      limit,
      total,
    });

    return {
      status: 200,
      body: {
        users: users.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          isAdmin: u.isAdmin || false,
          provider: u.provider,
          avatar: u.avatar,
          createdAt: u.createdAt.toISOString(),
        })),
        total,
        page,
        limit,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to list users", { error: errorMsg });
    return {
      status: 500,
      body: { error: "Failed to list users" },
    };
  }
});
