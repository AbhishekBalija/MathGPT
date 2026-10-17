/**
 * The Monitor Snapshot: how the app is doing right now, as numbers only.
 * Never put names, emails, problem text or feedback text in here: the
 * snapshot is read with a secret by Claude, not by a signed-in Admin.
 */

import { failedRepository } from "../admin/failed/failed.repository";
import { buildHealthReport } from "../admin/health/health.service";
import type { HealthProbes } from "../admin/health/probes";
import { overviewRepository } from "../admin/overview/overview.repository";
import { feedbackRepository } from "../feedback/feedback.repository";
import { solutionReportRepository } from "../solutions/solution-report.repository";
import { monitorRepository } from "./monitor.repository";
import packageJson from "../../../package.json";

export type MonitorState = "fine" | "attention" | "down";

export async function buildMonitorSnapshot(probes: HealthProbes) {
  const [alert, needsYou, numbers, aiUsageToday, failures, guardRejections, failedProblems, blockedReports, unreadFeedback, health] =
    await Promise.all([
      overviewRepository.solvingAlert(),
      overviewRepository.needsYou(1),
      overviewRepository.numbers(),
      overviewRepository.solveSourcesToday(),
      monitorRepository.failuresLast24h(),
      monitorRepository.guardRejectionsLast24h(),
      failedRepository.countOpenGroups(),
      solutionReportRepository.countBlocked(),
      feedbackRepository.countOpen(),
      buildHealthReport(probes),
    ]);

  // Same rule as the admin Overview: down while solving is failing, attention while something waits
  const failing = alert?.status === "failing";
  const state: MonitorState = failing ? "down" : needsYou.length > 0 ? "attention" : "fine";

  return {
    status: { state, failingSince: failing ? alert.changedAt.toISOString() : null },
    app: { version: packageJson.version, commit: health.live.backendCommit },
    today: { solves: numbers.solvesToday, aiUsage: aiUsageToday },
    last24h: {
      tries: numbers.tries24h,
      failed: numbers.failedTries24h,
      failures,
      guardRejections,
    },
    students: { real: numbers.realStudents, activeThisWeek: numbers.activeThisWeek },
    waiting: { failedProblems, blockedReports, unreadFeedback },
    services: health.services,
    uptimeCheck: health.live.uptimeCheck,
    pendingMigrations: health.live.migrations.pending,
    settings: health.live.settings.current,
    speed: health.speed,
  };
}
