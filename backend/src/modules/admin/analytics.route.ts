/**
 * GET /admin/analytics - Analytics Events by type, plus the newest events.
 * Query: event=<name> for one kind only. Mounted behind requireUser and requireAdmin.
 */

import { z } from "zod";
import { queryParam, route } from "../../lib/http";
import { analyticsRepository } from "../analytics/analytics.repository";

const RECENT_EVENTS = 50;
// Event names are like "solution_saved"; anything else means every kind
const eventSchema = z.string().regex(/^[a-z_]{1,64}$/).optional().catch(undefined);

export const adminAnalyticsRoute = route(async (req) => {
  const eventName = eventSchema.parse(queryParam(req, "event"));
  const [eventsByType, recentEvents] = await Promise.all([
    analyticsRepository.eventCountsByName(),
    analyticsRepository.recentEvents(eventName, RECENT_EVENTS),
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
