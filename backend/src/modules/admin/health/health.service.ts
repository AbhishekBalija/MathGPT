/**
 * Builds the admin Health report: each service checked live (in parallel,
 * 3 seconds each), solving over the last week, speed, and what is live.
 * The live checks run at most once a minute, however many tabs are open.
 */

import { findPendingMigrations, readJournal } from "../../../db/migrations-journal";
import { withTimeout } from "../../../services/ai/failover";
import { istDay } from "../overview/ist";
import { healthRepository } from "./health.repository";
import type { HealthProbes } from "./probes";

const CHECK_TIMEOUT_MS = 3000;
const CACHE_MS = 60_000;
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

export type ServiceId = "api" | "database" | "gemini" | "backup" | "email" | "turnstile" | "sentry";

export interface ServiceStatus {
  id: ServiceId;
  status: "up" | "down" | "key_set" | "key_missing";
  ms: number | null;
  detail: string | null;
}

let cached: { at: number; services: ServiceStatus[] } | null = null;

/** Forgets the last live checks, so the next request runs them again. */
export function resetHealthCache(): void {
  cached = null;
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

async function liveServices(probes: HealthProbes): Promise<ServiceStatus[]> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.services;
  }
  const [database, gemini, email] = await Promise.all([
    timed("database", () => healthRepository.ping()),
    timed("gemini", () => probes.gemini()),
    timed("email", () => probes.email()),
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
  ];
  cached = { at: Date.now(), services };
  return services;
}

export async function buildHealthReport(probes: HealthProbes) {
  const now = new Date();
  const [services, solving, speed, applied] = await Promise.all([
    liveServices(probes),
    healthRepository.solving(),
    healthRepository.speed(),
    healthRepository.appliedMigrations(),
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
    },
  };
}
