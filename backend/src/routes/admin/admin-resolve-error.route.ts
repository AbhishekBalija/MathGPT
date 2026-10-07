/**
 * Admin Resolve Error API
 *
 * PATCH /admin/errors/:id/resolve - Mark an error as resolved
 *
 * REQUIRES ADMIN AUTHENTICATION
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.middleware";
import { AnalyticsService } from "../../services/analytics/analytics.service";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminResolveError",
  description: "Mark an error as resolved (requires admin)",
  path: "/admin/errors/:id/resolve",
  method: "PATCH",
  emits: [],
  flows: ["admin-flow"],
  responseSchema: {
    200: z.object({
      message: z.string(),
      error: z.object({
        id: z.string(),
        resolved: z.boolean(),
        resolvedBy: z.string(),
        resolvedAt: z.string(),
      }),
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
};

// Using explicit types since Handlers may not have this step yet
export async function handler(
  req: {
    headers?: Record<string, string | string[] | undefined>;
    params?: Record<string, string>;
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

  const errorId = req.params?.id;
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
}
