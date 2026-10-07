/**
 * Analytics Tracking Event Handler
 *
 * Centralized analytics handler that:
 * - Persists events to MongoDB via AnalyticsService
 * - Logs errors to admin error dashboard
 * - Logs events for observability
 */

import { z } from "zod";
import { logger } from "../../lib/logger";
import { AnalyticsService } from "../../services/analytics/analytics.service";

const AnalyticsEventSchema = z.object({
  event: z.string(),
  properties: z
    .object({
      problemType: z.string().optional(),
      stepsCount: z.number().optional(),
      processingTimeMs: z.number().optional(),
      userId: z.string().optional(),
      errorCode: z.string().optional(),
      errorMessage: z.string().optional(),
      problem: z.string().optional(), // For error tracking
    })
    .optional(),
  timestamp: z.string().optional(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

export async function trackAnalytics(data: AnalyticsEvent): Promise<void> {
  const { event, properties, timestamp } = data;
  const eventTimestamp = timestamp || new Date().toISOString();

  logger.info(`[ANALYTICS] ${event}`, {
    event,
    properties,
    timestamp: eventTimestamp,
  });

  try {
    // Special handling for error events - store in error_logs for admin
    if (
      event === "solve_error" &&
      properties?.errorCode &&
      properties?.errorMessage
    ) {
      await AnalyticsService.trackError(
        properties.errorCode,
        properties.errorMessage,
        properties.problem || "Unknown problem",
        properties.userId,
        properties.processingTimeMs
      );
      logger.info("Error logged to admin dashboard", {
        errorCode: properties.errorCode,
        userId: properties.userId,
      });
    } else {
      // Regular analytics event
      await AnalyticsService.track(event, properties || {}, properties?.userId);
    }

    logger.info(`[ANALYTICS] Event persisted: ${event}`);
  } catch (error) {
    // Don't let analytics failures break the flow
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[ANALYTICS] Failed to persist event: ${event}`, {
      error: errorMsg,
    });
  }
}
