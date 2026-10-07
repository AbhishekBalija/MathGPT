/**
 * Admin Errors API
 *
 * GET /admin/errors - List recent errors with dashboard stats
 *
 * Query params: limit, errorCode, userId, includeResolved
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import { requireAdmin } from "../../middlewares/auth.middleware";
import { AnalyticsService } from "../../services/analytics/analytics.service";
import { queryParam, route } from "../../lib/http";
import { logger } from "../../lib/logger";

// GET /admin/errors
export const adminErrorsRoute = route(async (req) => {
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
    const limitParam = queryParam(req, "limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const errorCode = queryParam(req, "errorCode");
    const userId = queryParam(req, "userId");
    const includeResolved = queryParam(req, "includeResolved") === "true";

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
});
