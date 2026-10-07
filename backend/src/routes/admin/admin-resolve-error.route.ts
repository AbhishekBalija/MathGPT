/**
 * Admin Resolve Error API
 *
 * PATCH /admin/errors/:id/resolve - Mark an error as resolved
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import { requireAdmin } from "../../middlewares/auth.middleware";
import { AnalyticsService } from "../../services/analytics/analytics.service";
import { pathParam, route } from "../../lib/http";
import { logger } from "../../lib/logger";

// PATCH /admin/errors/:id/resolve
export const adminResolveErrorRoute = route(async (req) => {
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

  const errorId = pathParam(req, "id");
  if (!errorId) {
    return { status: 400, body: { error: "Error ID required" } };
  }

  logger.info("Admin resolving error", { adminId: admin.id, errorId });

  try {
    const resolved = await AnalyticsService.resolveError(errorId, admin.id);

    if (!resolved) {
      return { status: 404, body: { error: "Error not found" } };
    }

    logger.info("Error marked as resolved", {
      errorId,
      resolvedBy: admin.id,
      adminEmail: admin.email,
    });

    return {
      status: 200,
      body: {
        message: "Error marked as resolved",
        error: {
          id: resolved._id.toString(),
          resolved: resolved.resolved,
          resolvedBy: resolved.resolvedBy!,
          resolvedAt: resolved.resolvedAt!.toISOString(),
        },
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to resolve error", { error: errorMsg, errorId });
    return { status: 500, body: { error: "Failed to resolve error" } };
  }
});
