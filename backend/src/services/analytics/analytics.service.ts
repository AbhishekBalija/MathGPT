/**
 * Analytics Service
 *
 * Business logic for analytics tracking and admin error monitoring.
 */

import {
  analyticsRepository,
  AnalyticsEventDocument,
  ErrorLogDocument,
} from "../../repositories/analytics.repository";

export const AnalyticsService = {
  // ==================
  // Event Tracking
  // ==================

  /**
   * Track an analytics event
   */
  async track(
    eventName: string,
    properties: AnalyticsEventDocument["properties"] = {},
    userId?: string
  ): Promise<AnalyticsEventDocument> {
    return analyticsRepository.logEvent(eventName, properties, userId);
  },

  /**
   * Track a solve error (stores in both analytics and error logs)
   */
  async trackError(
    errorCode: string,
    errorMessage: string,
    problemText: string,
    userId?: string,
    processingTimeMs?: number
  ): Promise<ErrorLogDocument> {
    // Log to error_logs collection for admin dashboard
    const errorLog = await analyticsRepository.logError(
      errorCode,
      errorMessage,
      problemText,
      userId,
      processingTimeMs
    );

    // Also log to analytics for aggregation
    await analyticsRepository.logEvent(
      "solve_error",
      {
        errorCode,
        errorMessage: errorMessage.slice(0, 100),
        userId,
        processingTimeMs,
      },
      userId
    );

    return errorLog;
  },

  // ==================
  // User Insights
  // ==================

  /**
   * Get insights for a specific user
   */
  async getUserInsights(userId: string): Promise<{
    totalEvents: number;
    solutionsSaved: number;
    errors: number;
    recentActivity: AnalyticsEventDocument[];
  }> {
    const events = await analyticsRepository.getEventsByUser(userId, 100);

    const solutionsSaved = events.filter(
      (e) => e.eventName === "solution_saved"
    ).length;
    const errors = events.filter((e) => e.eventName === "solve_error").length;

    return {
      totalEvents: events.length,
      solutionsSaved,
      errors,
      recentActivity: events.slice(0, 10),
    };
  },

  // ==================
  // Global Stats
  // ==================

  /**
   * Get platform-wide analytics stats
   */
  async getGlobalStats(): Promise<{
    eventsByType: Array<{ eventName: string; count: number }>;
  }> {
    const eventsByType = await analyticsRepository.getAggregatedStats();
    return { eventsByType };
  },

  // ==================
  // Admin Error Dashboard
  // ==================

  /**
   * Get error dashboard data for admin
   */
  async getErrorDashboard(): Promise<{
    stats: {
      total: number;
      unresolved: number;
      byCode: Array<{ errorCode: string; count: number }>;
      last24Hours: number;
    };
    recentErrors: ErrorLogDocument[];
  }> {
    const [stats, recentErrors] = await Promise.all([
      analyticsRepository.getErrorStats(),
      analyticsRepository.getRecentErrors(20),
    ]);

    return { stats, recentErrors };
  },

  /**
   * Get errors with optional filters
   */
  async getErrors(
    options: {
      limit?: number;
      errorCode?: string;
      userId?: string;
      includeResolved?: boolean;
    } = {}
  ): Promise<ErrorLogDocument[]> {
    const { limit = 50, errorCode, userId, includeResolved = false } = options;

    if (errorCode) {
      return analyticsRepository.getErrorsByCode(errorCode, limit);
    }
    if (userId) {
      return analyticsRepository.getErrorsByUser(userId, limit);
    }
    return analyticsRepository.getRecentErrors(limit, includeResolved);
  },

  /**
   * Get single error by ID
   */
  async getErrorById(id: string): Promise<ErrorLogDocument | null> {
    return analyticsRepository.getErrorById(id);
  },

  /**
   * Mark error as resolved by admin
   */
  async resolveError(
    errorId: string,
    adminUserId: string
  ): Promise<ErrorLogDocument | null> {
    return analyticsRepository.markErrorResolved(errorId, adminUserId);
  },
};
