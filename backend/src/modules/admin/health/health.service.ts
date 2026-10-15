/**
 * Builds the admin Health report: each service checked live (in parallel,
 * 3 seconds each), solving over the last week, speed, and what is live.
 * The live checks run at most once a minute, however many tabs are open.
 */

import { findPendingMigrations, readJournal } from "../../../db/migrations-journal";
import { withTimeout } from "../../../services/ai/failover";
import { istDay } from "../overview/ist";
import { healthRepository } from "./health.repository";
import type { HealthProbes, UptimeCheck } from "./probes";

const CHECK_TIMEOUT_MS = 3000;
const CACHE_MS = 60_000;
// GitHub allows 60 calls an hour without a token, so ask it at most every 10 minutes
const UPTIME_CACHE_MS = 10 * 60_000;
// After GitHub could not be asked, try again sooner
const UPTIME_RETRY_MS = 60_000;
// The workflow runs every 15 minutes, and GitHub often starts it late or skips one
const UPTIME_STALE_MS = 60 * 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

// What the API needs to run, by name. The values are never read out.
export const REQUIRED_ENV = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GEMINI_MATH_AI_API",
  "OPEN_ROUTER_API_KEY",
  "SENTRY_DSN",
  "TURNSTILE_SECRET_KEY",
  "RESEND_API",
  "FROM_EMAIL",
  "APP_URL",
] as const;

export type ServiceId = "api" | "database" | "gemini" | "backup" | "email" | "turnstile" | "sentry" | "uptime";

export interface ServiceStatus {
  id: ServiceId;
  // "unknown" when we could not find out, which is not the same as down
  status: "up" | "down" | "key_set" | "key_missing" | "unknown";
  ms: number | null;
  detail: string | null;
}

let cached: { at: number; services: ServiceStatus[]; uptime: UptimeCheck | null } | null = null;
let uptimeCached: { at: number; check: UptimeCheck | null } | null = null;

/** Forgets the last live checks, so the next request runs them again. */
export function resetHealthCache(): void {
  cached = null;
  uptimeCached = null;
}

// Null when GitHub could not be asked
async function uptimeCheck(probes: HealthProbes): Promise<UptimeCheck | null> {
  const keepFor = uptimeCached?.check ? UPTIME_CACHE_MS : UPTIME_RETRY_MS;
  if (uptimeCached && Date.now() - uptimeCached.at < keepFor) {
    return uptimeCached.check;
  }
  const check = await withTimeout(probes.github(), CHECK_TIMEOUT_MS, "github").catch(() => null);
  uptimeCached = { at: Date.now(), check };
  return check;
}

function uptimeStatus(check: UptimeCheck | null, now: number): ServiceStatus {
  const down = (detail: string): ServiceStatus => ({ id: "uptime", status: "down", ms: null, detail });
  const unknown = (detail: string): ServiceStatus => ({ id: "uptime", status: "unknown", ms: null, detail });
  if (!check) return unknown("Couldn't ask GitHub");
  // Not on GitHub yet, or not run yet since it was added
  if (!check.lastRunAt) return unknown("Waiting for its first run");
  if (!check.enabled) return down("Switched off in GitHub");
  const minutes = Math.round((now - new Date(check.lastRunAt).getTime()) / 60_000);
  if (now - new Date(check.lastRunAt).getTime() > UPTIME_STALE_MS) return down(`Last ran ${minutes} minutes ago`);
  if (check.lastResult === "failure") return down(`The site did not answer ${minutes} minutes ago`);
  return { id: "uptime", status: "up", ms: null, detail: null };
}

async function timed(id: ServiceId, check: () => Promise<void>): Promise<ServiceStatus> {
  const started = Date.now();
  try {
    await withTimeout(check(), CHECK_TIMEOUT_MS, id);
    return { id, status: "up", ms: Date.now() - started, detail: null };
  } catch (error) {
    return { id, status: "down", ms: null, detail: error instanceof Error ? error.message : "Did not answer" };
  }
}

// Services we only call when a student does something: check the key is there
function keyCheck(id: ServiceId, name: string): ServiceStatus {
  return { id, status: process.env[name] ? "key_set" : "key_missing", ms: null, detail: null };
}

async function liveServices(probes: HealthProbes): Promise<{ services: ServiceStatus[]; uptime: UptimeCheck | null }> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached;
  }
  const [database, gemini, email, uptime] = await Promise.all([
    timed("database", () => healthRepository.ping()),
    timed("gemini", () => probes.gemini()),
    timed("email", () => probes.email()),
    uptimeCheck(probes),
  ]);
  const services: ServiceStatus[] = [
    // This answer is the API answering
    { id: "api", status: "up", ms: 0, detail: null },
    database,
    gemini,
    keyCheck("backup", "OPEN_ROUTER_API_KEY"),
    email,
    keyCheck("turnstile", "TURNSTILE_SECRET_KEY"),
    keyCheck("sentry", "SENTRY_DSN"),
    uptimeStatus(uptime, Date.now()),
  ];
  cached = { at: Date.now(), services, uptime };
  return cached;
}

// When the database is down, the numbers are empty and the Database row says why
async function orEmpty<T>(read: Promise<T>, empty: T): Promise<T> {
  try {
    return await read;
  } catch {
    return empty;
  }
}

export async function buildHealthReport(probes: HealthProbes) {
  const now = new Date();
  const [{ services, uptime }, solving, speed, applied] = await Promise.all([
    liveServices(probes),
    orEmpty(healthRepository.solving(), { tries24h: 0, failed24h: 0, days: new Map(), byCode: [] }),
    orEmpty(healthRepository.speed(), { avgMs: 0, p90Ms: 0 }),
    orEmpty(healthRepository.appliedMigrations(), []),
  ]);
  const journal = readJournal();

  return {
    checkedAt: (cached ? new Date(cached.at) : now).toISOString(),
    services,
    solving: {
      tries24h: solving.tries24h,
      failed24h: solving.failed24h,
      // The last 7 India days, oldest first
      days: Array.from({ length: 7 }, (_, index) => {
        const day = istDay(new Date(now.getTime() - (6 - index) * DAY_MS));
        return { day, ...(solving.days.get(day) ?? { tries: 0, failed: 0 }) };
      }),
      byCode: solving.byCode,
    },
    speed,
    live: {
      backendCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      migrations: {
        applied: applied.length,
        latest: journal.at(-1)?.tag ?? "",
        pending: findPendingMigrations(journal, applied),
      },
      env: REQUIRED_ENV.map((name) => ({ name, set: Boolean(process.env[name]) })),
      uptimeCheck: uptime ?? { lastRunAt: null, lastResult: null, enabled: false },
    },
  };
}
