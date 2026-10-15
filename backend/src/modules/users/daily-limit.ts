/**
 * The daily free limit: 5 AI answers a day per User. A "day" is the India
 * day, so the limit resets at midnight IST. The server runs in UTC, so
 * never use toDateString() or setHours() for this (#106).
 */

import { istDay } from "../admin/overview/ist";

export const DAILY_FREE_LIMIT = 5;

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
