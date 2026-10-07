/**
 * Admin Passcode Verification API
 *
 * POST /admin/verify-passcode - Verify admin passcode for secondary authentication
 *
 * REQUIRES ADMIN AUTHENTICATION (isAdmin: true)
 */

import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/auth.middleware";

// Empty passcode is allowed here so the handler can return a clear 400
const VerifyPasscodeSchema = z.object({
  passcode: z.string(),
});
import { routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";

// POST /admin/verify-passcode
export const adminVerifyPasscodeRoute = routeWithBody(VerifyPasscodeSchema, async (req, body) => {
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

  const { passcode } = body;

  // Validate empty passcode - return 400 Bad Request
  if (!passcode || passcode.trim().length === 0) {
    return {
      status: 400 as const,
      body: { error: "Passcode is required" },
    };
  }

  const correctPasscode = process.env.ADMIN_PASSCODE;

  if (!correctPasscode) {
    logger.error("ADMIN_PASSCODE environment variable not set");
    return {
      status: 403,
      body: { error: "Admin verification not configured" },
    };
  }

  // Use constant-time comparison to prevent timing attacks
  // Pad both buffers to fixed length to prevent length-based timing attacks
  const FIXED_LENGTH = 64;
  const passcodeBuffer = Buffer.alloc(FIXED_LENGTH);
  const correctBuffer = Buffer.alloc(FIXED_LENGTH);
  Buffer.from(passcode).copy(passcodeBuffer);
  Buffer.from(correctPasscode).copy(correctBuffer);

  // Compare lengths separately and combine with timing-safe comparison
  const lengthsMatch = passcode.length === correctPasscode.length;
  const contentsMatch = timingSafeEqual(passcodeBuffer, correctBuffer);

  if (!lengthsMatch || !contentsMatch) {
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
});
