/**
 * Sends backend errors to Sentry, so a failed solve shows up as an alert
 * (and an email) instead of only in the database.
 *
 * Off unless SENTRY_DSN is set, so tests and local development send nothing.
 * Never sends problem text or emails: some students are children, so only
 * the opaque user id goes out.
 */

import * as Sentry from "@sentry/bun";

let enabled = false;

export function initSentry(dsn: string | undefined): void {
  if (!dsn) {
    return;
  }

  // Without Sentry's default integrations: they hook into module loading and
  // pull in extra packages at startup, which crashed the app on Vercel ("bun
  // is unable to write files"). We only report errors by hand, so these few
  // basic ones are all we need.
  Sentry.initWithoutDefaultIntegrations({
    dsn,
    integrations: [
      Sentry.eventFiltersIntegration(),
      Sentry.functionToStringIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
    ],
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    // Sentry collects request data by default. Turn all of it off: bodies hold
    // passwords and problems, headers hold login tokens.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
    },
    // Errors only; no performance tracing
    tracesSampleRate: 0,
  });
  enabled = true;
}

export interface FailedSolveReport {
  errorCode: string;
  errorMessage: string;
  userId?: string;
  chatId?: string;
  processingTimeMs?: number;
}

export async function reportSolveError(report: FailedSolveReport): Promise<void> {
  if (!enabled) {
    return;
  }

  const error = new Error(`Solve failed (${report.errorCode}): ${report.errorMessage}`);
  Sentry.captureException(error, {
    tags: { errorCode: report.errorCode },
    user: report.userId ? { id: report.userId } : undefined,
    extra: { chatId: report.chatId, processingTimeMs: report.processingTimeMs },
    // Group by error code, not by the changing provider message
    fingerprint: ["solve-failed", report.errorCode],
  });
  await flushSentry();
}

export async function reportUnhandledError(error: unknown): Promise<void> {
  if (!enabled) {
    return;
  }

  Sentry.captureException(error);
  await flushSentry();
}

// Vercel may pause the function once the response is sent, so send right away
async function flushSentry(): Promise<void> {
  await Sentry.flush(2000);
}
