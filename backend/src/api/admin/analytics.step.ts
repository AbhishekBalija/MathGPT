/**
 * Admin Analytics API
 *
 * GET /admin/analytics - Get analytics data for admin dashboard
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.middleware";
import { AnalyticsService } from "../../services/analytics/analytics.service";
import { analyticsRepository } from "../../repositories/analytics.repository";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminGetAnalytics",
  description: "Get analytics data for admin dashboard (requires admin)",
  path: "/admin/analytics",
  method: "GET",
  emits: [],
  flows: ["admin-flow"],
  responseSchema: {
    200: z.object({
      eventsByType: z.array(
        z.object({
          eventName: z.string(),
          count: z.number(),
        })
      ),
      recentEvents: z.array(
        z.object({
          id: z.string(),
          eventName: z.string(),
          properties: z.record(z.string(), z.unknown()),
          userId: z.string().optional(),
          createdAt: z.string(),
        })
      ),
      totalEvents: z.number(),
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
}
