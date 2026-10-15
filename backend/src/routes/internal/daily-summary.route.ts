/**
 * GET or POST /internal/daily-summary - emails the admins what came in over
 * the last 24 hours. Vercel's cron calls it with GET and
 * `Authorization: Bearer <CRON_SECRET>`. Without CRON_SECRET set, nobody can run it.
 */

import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { route } from "../../lib/http";
import { logger } from "../../lib/logger";
import { sendDailySummary } from "../../modules/alerts/daily-summary";
import type { EmailSender } from "../../modules/email/email-sender";

function hasCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  // Same length first: timingSafeEqual throws otherwise
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function createDailySummaryRoute(emailSender: EmailSender, origin: string) {
  return route(async (req) => {
    if (!hasCronSecret(req)) {
      return { status: 401, body: { error: "Not allowed" } };
    }
    const { sentTo } = await sendDailySummary(emailSender, origin);
    logger.info("Daily summary", { sentTo });
    return { status: 200, body: { sentTo } };
  });
}
