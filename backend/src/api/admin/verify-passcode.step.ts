/**
 * Admin Passcode Verification API
 *
 * POST /admin/verify-passcode - Verify admin passcode for secondary authentication
 *
 * REQUIRES ADMIN AUTHENTICATION (isAdmin: true)
 */

import type { ApiRouteConfig } from "motia";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.middleware";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminVerifyPasscode",
  description: "Verify admin passcode for secondary authentication",
  path: "/admin/verify-passcode",
  method: "POST",
  emits: [],
  flows: ["admin-flow"],
  bodySchema: z.object({
    passcode: z.string().min(1),
  }),
  responseSchema: {
    200: z.object({ success: z.literal(true) }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
  },
};

export async function handler(
  req: {
    headers?: Record<string, string | string[] | undefined>;
    body: { passcode: string };
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
  // Require admin authentication first
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

  const { passcode } = req.body;
  const correctPasscode = process.env.ADMIN_PASSCODE;

  if (!correctPasscode) {
    logger.error("ADMIN_PASSCODE environment variable not set");
    return {
      status: 403,
      body: { error: "Admin verification not configured" },
    };
  }

  if (passcode !== correctPasscode) {
    logger.info("Invalid admin passcode attempt", { adminId: admin.id });
    return {
      status: 403,
      body: { error: "Invalid passcode" },
    };
  }

  logger.info("Admin passcode verified", { adminId: admin.id });
  return {
    status: 200,
    body: { success: true as const },
  };
}
