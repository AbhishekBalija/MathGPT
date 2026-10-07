/**
 * Admin Users API
 *
 * GET /admin/users - List users with pagination and search
 * PATCH /admin/users/:id/role - Toggle admin role
 * DELETE /admin/users/:id - Delete a user
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.middleware";
import { userRepository } from "../../repositories/user.repository";

// GET /admin/users - List users
export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminListUsers",
  description: "List all users with pagination and search (requires admin)",
  path: "/admin/users",
  method: "GET",
  emits: [],
  flows: ["admin-flow"],
  responseSchema: {
    200: z.object({
      users: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
          isAdmin: z.boolean(),
          provider: z.string().optional(),
          createdAt: z.string(),
        })
      ),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

export async function handler(
  req: {
    headers?: Record<string, string | string[] | undefined>;
    query?: Record<string, string>;
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
    // Handle different possible query param structures from Motia
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reqAny = req as any;

    // Try multiple possible sources for query params
    const queryParams =
      reqAny.query || reqAny.searchParams || reqAny.params || {};

    // Also check if there's a URL property we need to parse
    let parsedParams: Record<string, string> = {};
    if (
      typeof queryParams === "object" &&
      Object.keys(queryParams).length > 0
    ) {
      parsedParams = queryParams;
    } else if (
      reqAny.url &&
      typeof reqAny.url === "string" &&
      reqAny.url.includes("?")
    ) {
      // Parse query string from URL if present
      const urlParts = reqAny.url.split("?");
      if (urlParts[1]) {
        const searchParams = new URLSearchParams(urlParts[1]);
        parsedParams = Object.fromEntries(searchParams.entries());
      }
    }

    const page = parsedParams.page ? parseInt(parsedParams.page, 10) : 1;
    const limit = parsedParams.limit ? parseInt(parsedParams.limit, 10) : 20;
    const search = parsedParams.search || undefined;

    logger.info("Admin users search request", {
      parsedParams,
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
}
