/**
 * GET /internal/monitor - the Monitor Snapshot, so Claude can watch the app
 * without an Admin login. Needs `Authorization: Bearer <MONITOR_SECRET>`.
 * Without MONITOR_SECRET set, nobody can call it. Read-only.
 */

import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { route } from "../../lib/http";
import type { HealthProbes } from "../../modules/admin/health/probes";
import { buildMonitorSnapshot } from "../../modules/monitor/monitor-snapshot";

// Its own secret, not CRON_SECRET, so it can be revoked without touching the daily email
function hasMonitorSecret(req: Request): boolean {
  const secret = process.env.MONITOR_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  // Same length first: timingSafeEqual throws otherwise
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function createMonitorRoute(probes: HealthProbes) {
  return route(async (req) => {
    if (!hasMonitorSecret(req)) {
      return { status: 401, body: { error: "Not allowed" } };
    }
    return { status: 200, body: await buildMonitorSnapshot(probes) };
  });
}
