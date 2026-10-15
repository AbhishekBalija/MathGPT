/**
 * When a solving alert email goes out. A pure function, so the rules can be
 * tested without a database or an email service.
 *
 * - "failing" after 3 AI-provider failures in a row, or 3 within 10 minutes
 * - while still failing, again at most every 30 minutes
 * - "recovered" on the first solve that works after that
 *
 * Our own errors (UNKNOWN_ERROR) never count: they are bugs to fix, not an
 * outage, and Sentry already reports them.
 */

import type { AlertStatus } from "../../db/schema";
import { isProviderFailure } from "../solver/error-code";

export const FAILS_TO_ALERT = 3;
export const WINDOW_MS = 10 * 60_000;
export const RESEND_GAP_MS = 30 * 60_000;

export interface AlertRecord {
  status: AlertStatus;
  // Times (ms) of counted failures in the last WINDOW_MS
  recent: number[];
  consecutive: number;
  lastSentAt: number | null;
  changedAt: number;
}

export type AlertEvent = { kind: "failed"; code: string } | { kind: "succeeded" };

export function nextAlert(record: AlertRecord, event: AlertEvent, now: number): { record: AlertRecord; send: "failing" | "recovered" | null } {
  if (event.kind === "succeeded") {
    if (record.status === "failing") {
      return { record: { status: "ok", recent: [], consecutive: 0, lastSentAt: now, changedAt: now }, send: "recovered" };
    }
    return { record: { ...record, consecutive: 0 }, send: null };
  }

  if (!isProviderFailure(event.code)) {
    return { record, send: null };
  }

  const recent = [...record.recent.filter((at) => now - at < WINDOW_MS), now];
  const consecutive = record.consecutive + 1;
  const counted = { ...record, recent, consecutive };

  if (record.status === "failing") {
    const due = record.lastSentAt === null || now - record.lastSentAt >= RESEND_GAP_MS;
    return due ? { record: { ...counted, lastSentAt: now }, send: "failing" } : { record: counted, send: null };
  }

  if (consecutive >= FAILS_TO_ALERT || recent.length >= FAILS_TO_ALERT) {
    return { record: { ...counted, status: "failing", lastSentAt: now, changedAt: now }, send: "failing" };
  }
  return { record: counted, send: null };
}
