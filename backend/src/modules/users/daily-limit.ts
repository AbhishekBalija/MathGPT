/**
 * The daily free limit: AI answers a day per User, 5 unless an admin changes
 * it in Settings. Admins have no limit. A "day" is the India day, so the
 * limit resets at midnight IST. The server runs in UTC, so never use
 * toDateString() or setHours() for this (#106).
 */

import { istDay } from "../admin/overview/ist";
import { DEFAULT_SETTINGS } from "../settings/settings";

// The default; the live value is settings.dailyLimit
export const DAILY_FREE_LIMIT = DEFAULT_SETTINGS.dailyLimit;

/** This User's limit today, or null for no limit (admins). */
export function limitFor(user: { isAdmin: boolean }, settings: { dailyLimit: number }): number | null {
  return user.isAdmin ? null : settings.dailyLimit;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when the last reset was on an earlier India day, so the count starts again. */
export function isNewDailyLimitDay(lastReset: Date | null, now = new Date()): boolean {
  return lastReset === null || istDay(lastReset) !== istDay(now);
}

/** How many free problems the User has used today. */
export function usedToday(user: { dailyCreditsUsed: number; lastCreditReset: Date | null }, now = new Date()): number {
  return isNewDailyLimitDay(user.lastCreditReset, now) ? 0 : user.dailyCreditsUsed;
}

/** The next midnight India time, when the limit resets. */
export function nextDailyLimitReset(now = new Date()): Date {
  return new Date(new Date(`${istDay(now)}T00:00:00+05:30`).getTime() + DAY_MS);
}
