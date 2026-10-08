/**
 * Records an Analytics Event (e.g. "solution_saved") for admin statistics.
 * Runs in the background; a failure is logged and never breaks a request.
 */

import { logger } from "../../lib/logger";
import { analyticsRepository } from "../../modules/analytics/analytics.repository";

export interface AnalyticsEventData {
  event: string;
  properties?: {
    problemType?: string;
    stepsCount?: number;
    processingTimeMs?: number;
    userId?: string;
  };
  timestamp?: string;
}

export async function trackAnalytics(data: AnalyticsEventData): Promise<void> {
  const { event, properties = {} } = data;
  // The User goes in the user_id column only, so deleting the User clears it
  const { userId, ...details } = properties;

  try {
    await analyticsRepository.recordEvent(event, details, userId);
  } catch (error) {
    logger.error(`[ANALYTICS] Failed to record event: ${event}`, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
