/**
 * GET /admin/errors - Error Log statistics and a filtered list.
 * Query: errorCode, userId, includeResolved=true, limit. Filters combine.
 * Mounted behind requireUser and requireAdmin.
 */

import { z } from "zod";
import { queryParam, route } from "../../lib/http";
import { analyticsRepository } from "../analytics/analytics.repository";

// Bad or missing values fall back to the default instead of reaching the database
const limitSchema = z.coerce.number().int().min(1).max(200).catch(50);

export const adminErrorsRoute = route(async (req) => {
  const [stats, errors] = await Promise.all([
    analyticsRepository.errorStats(),
    analyticsRepository.listErrors({
      errorCode: queryParam(req, "errorCode") || undefined,
      userId: queryParam(req, "userId") || undefined,
      includeResolved: queryParam(req, "includeResolved") === "true",
      limit: limitSchema.parse(queryParam(req, "limit") ?? 50),
    }),
  ]);

  return {
    status: 200,
    body: {
      stats,
      errors: errors.map((error) => ({
        id: error.id,
        errorCode: error.errorCode,
        errorMessage: error.errorMessage,
        problemText: error.problemText,
        userId: error.userId ?? undefined,
        resolved: error.resolved,
        createdAt: error.createdAt.toISOString(),
      })),
    },
  };
});
