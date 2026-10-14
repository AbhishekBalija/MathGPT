import type { AdminHealth } from "../../../services/admin.service";

// The health report for "Copy for Claude": plain text, never an email or a secret value.
export function buildHealthReport(health: AdminHealth, frontendCommit: string): string {
  const services = health.services.map(
    (service) => `  ${service.id}: ${service.status}${service.ms !== null ? ` (${service.ms} ms)` : ""}${service.detail ? ` - ${service.detail}` : ""}`,
  );
  const { migrations } = health.live;
  const missingEnv = health.live.env.filter((entry) => !entry.set).map((entry) => entry.name);

  return [
    `## NeoMath health ${health.checkedAt}`,
    "Services:",
    ...services,
    `Last 24 hours: ${health.solving.failed24h} of ${health.solving.tries24h} tries failed`,
    "Failures this week by code:",
    ...(health.solving.byCode.length > 0 ? health.solving.byCode.map((code) => `  ${code.errorCode}: ${code.count}`) : ["  none"]),
    `Speed: average ${health.speed.avgMs} ms, slowest 10% over ${health.speed.p90Ms} ms`,
    "Live:",
    `  Backend: ${health.live.backendCommit}`,
    `  Frontend: ${frontendCommit}`,
    `  Migrations: ${migrations.applied} applied, latest ${migrations.latest}, ${
      migrations.pending.length > 0 ? `missing ${migrations.pending.join(", ")}` : "none missing"
    }`,
    `  Env not set: ${missingEnv.length > 0 ? missingEnv.join(", ") : "none"}`,
  ].join("\n");
}
