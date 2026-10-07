/**
 * Admin Errors API
 *
 * GET /admin/errors - List recent errors with dashboard stats
 *
 * Query params: limit, errorCode, userId, includeResolved
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.middleware";
import { AnalyticsService } from "../../services/analytics/analytics.service";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminGetErrors",
  description: "Get recent errors for admin dashboard (requires admin)",
  path: "/admin/errors",
  method: "GET",
  emits: [],
  flows: ["admin-flow"],
  responseSchema: {
    200: z.object({
      stats: z.object({
        total: z.number(),
        unresolved: z.number(),
        last24Hours: z.number(),
        byCode: z.array(
          z.object({
            errorCode: z.string(),
            count: z.number(),
          })
        ),
      }),
      errors: z.array(
        z.object({
          id: z.string(),
          errorCode: z.string(),
          errorMessage: z.string(),
          problemText: z.string(),
          userId: z.string().optional(),
          resolved: z.boolean(),
          createdAt: z.string(),
        })
      ),
    }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

// Using explicit types since Handlers may not have this step yet
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
    logger.info("Admin authenticated for errors dashboard", {
      adminId: admin.id,
    });
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
    const query = req.query || {};
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const errorCode = query.errorCode;
    const userId = query.userId;
    const includeResolved = query.includeResolved === "true";

    // Get dashboard data
    const { stats, recentErrors } = await AnalyticsService.getErrorDashboard();

    // Get filtered errors if specific filters provided
    const errors =
      errorCode || userId
        ? await AnalyticsService.getErrors({
            limit,
            errorCode,
            userId,
            includeResolved,
          })
        : recentErrors;

    logger.info("Admin errors dashboard loaded", {
      adminId: admin.id,
      errorCount: errors.length,
      unresolvedCount: stats.unresolved,
    });

    return {
      status: 200,
      body: {
        stats,
        errors: errors.map((e) => ({
          id: e._id.toString(),
          errorCode: e.errorCode,
          errorMessage: e.errorMessage,
          problemText: e.problemText,
          userId: e.userId,
          resolved: e.resolved,
          createdAt: e.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to load admin errors dashboard", { error: errorMsg });
    return {
      status: 500,
      body: { error: "Failed to load errors dashboard" },
    };
  }
}
