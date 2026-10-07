/**
 * Admin Analytics API
 *
 * GET /admin/analytics - Get analytics data for admin dashboard
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import { requireAdmin } from "../../middlewares/auth.middleware";
import { AnalyticsService } from "../../services/analytics/analytics.service";
import { analyticsRepository } from "../../repositories/analytics.repository";
import { route } from "../../lib/http";
import { logger } from "../../lib/logger";

// GET /admin/analytics
export const adminAnalyticsRoute = route(async (req) => {
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

  logger.info("Admin fetching analytics", { adminId: admin.id });

  try {
    // Get aggregated stats
    const { eventsByType } = await AnalyticsService.getGlobalStats();

    // Get recent events (last 50)
    const recentEvents = await analyticsRepository.getEventsByType(
      "solution_saved",
      undefined,
      undefined,
      50
    );

    // Calculate total
    const totalEvents = eventsByType.reduce((sum, e) => sum + e.count, 0);

    return {
      status: 200,
      body: {
        eventsByType,
        recentEvents: recentEvents.map((e) => ({
          id: e._id.toString(),
          eventName: e.eventName,
          properties: e.properties as Record<string, unknown>,
          userId: e.userId,
          createdAt: e.createdAt.toISOString(),
        })),
        totalEvents,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to fetch analytics", { error: errorMsg });
    return { status: 500, body: { error: "Failed to fetch analytics" } };
  }
});
