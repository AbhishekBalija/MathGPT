/**
 * Admin Users API
 *
 * GET /admin/users - List users with pagination and search
 * PATCH /admin/users/:id/role - Toggle admin role
 * DELETE /admin/users/:id - Delete a user
 *
 * REQUIRES ADMIN AUTHENTICATION (requireUser + requireAdmin middleware)
 */

import { z } from "zod";
import { getCurrentUser } from "../auth/auth.middleware";
import { userRepository } from "../users/user.repository";
import { queryParam, route } from "../../lib/http";
import { logger } from "../../lib/logger";

// Bad or missing values fall back to the defaults instead of reaching the database
const pageSchema = z.coerce.number().int().min(1).catch(1);
const limitSchema = z.coerce.number().int().min(1).max(100).catch(20);

// GET /admin/users
export const adminListUsersRoute = route(async (req) => {
  // Mounted behind requireUser and requireAdmin
  const admin = getCurrentUser(req);

  try {
    const page = pageSchema.parse(queryParam(req, "page") ?? 1);
    const limit = limitSchema.parse(queryParam(req, "limit") ?? 20);
    const search = queryParam(req, "search") || undefined;

    logger.info("Admin users search request", {
      search,
      page,
      limit,
    });

    const { users, total } = await userRepository.list({ search, page, limit });

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
          id: u.id,
          name: u.name,
          email: u.email,
          isAdmin: u.isAdmin,
          provider: u.provider,
          avatar: u.avatarUrl ?? undefined,
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
