/**
 * PATCH /admin/errors/:id/resolve - mark an Error Log as handled.
 * Mounted behind requireUser and requireAdmin.
 */

import { pathParam, route } from "../../lib/http";
import { logger } from "../../lib/logger";
import { analyticsRepository } from "../analytics/analytics.repository";
import { getCurrentUser } from "../auth/auth.middleware";

export const adminResolveErrorRoute = route(async (req) => {
  const admin = getCurrentUser(req);
  const errorId = pathParam(req, "id");

  const resolved = await analyticsRepository.resolveError(errorId, admin.id);
  if (!resolved) {
    return { status: 404, body: { error: "Error not found" } };
  }

  logger.info("Error Log resolved", { errorId, resolvedBy: admin.id });

  return {
    status: 200,
    body: {
      message: "Error marked as resolved",
      error: {
        id: resolved.id,
        resolved: resolved.resolved,
        resolvedBy: resolved.resolvedBy,
        resolvedAt: resolved.resolvedAt?.toISOString(),
      },
    },
  };
});
