/**
 * GET /admin/analytics - Analytics Events by type, plus recent saved Solutions.
 * Mounted behind requireUser and requireAdmin.
 */

import { route } from "../../lib/http";
import { analyticsRepository } from "../analytics/analytics.repository";

const RECENT_EVENTS = 50;

export const adminAnalyticsRoute = route(async () => {
  const [eventsByType, recentEvents] = await Promise.all([
    analyticsRepository.eventCountsByName(),
    analyticsRepository.recentEvents("solution_saved", RECENT_EVENTS),
  ]);

  return {
    status: 200,
    body: {
      eventsByType,
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        eventName: event.eventName,
        properties: event.properties,
        userId: event.userId ?? undefined,
        createdAt: event.createdAt.toISOString(),
      })),
      totalEvents: eventsByType.reduce((sum, event) => sum + event.count, 0),
    },
  };
});
