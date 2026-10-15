/**
 * Dates for the admin screens. "Today", days and weeks are India time
 * (the server runs in UTC). Weeks start on Monday.
 */

export const IST = "Asia/Kolkata";
// Gemini's free tier resets at midnight Pacific time
const GEMINI_RESET_ZONE = "America/Los_Angeles";

const DAY_MS = 24 * 60 * 60 * 1000;

function dateParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** "2026-10-14": the India date of this moment. */
export function istDay(date: Date): string {
  const { year, month, day } = dateParts(date, IST);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The Monday of this moment's India week, as "2026-10-12". */
export function istWeekStart(date: Date): string {
  const today = new Date(`${istDay(date)}T00:00:00Z`);
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  return new Date(today.getTime() - daysSinceMonday * DAY_MS).toISOString().slice(0, 10);
}

/** A whole percent, and 0 (not NaN) when there is nothing to divide by. */
export function emptyRate(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

/** The next midnight in California, when Gemini's free tier resets. */
export function geminiResetAt(now: Date): Date {
  const { year, month, day } = dateParts(now, GEMINI_RESET_ZONE);
  return midnightIn(GEMINI_RESET_ZONE, year, month, day + 1);
}

// The UTC moment of 00:00 on that date in that time zone
function midnightIn(timeZone: string, year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day);
  const wall = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(wall.find((part) => part.type === type)?.value);
  const wallAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  // How far that zone is behind UTC at that moment
  return new Date(guess + (guess - wallAsUtc));
}
