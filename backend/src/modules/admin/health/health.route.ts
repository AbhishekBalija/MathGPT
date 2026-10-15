/**
 * GET /admin/health - every service checked live, solving over the last
 * week, speed, and what is deployed. Always 200: a service that is down is
 * reported, not thrown. Mounted behind requireUser and requireAdmin.
 */

import { route } from "../../../lib/http";
import { buildHealthReport } from "./health.service";
import type { HealthProbes } from "./probes";

export function createAdminHealthRoute(probes: HealthProbes) {
  return route(async () => ({ status: 200, body: await buildHealthReport(probes) }));
}
