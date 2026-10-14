// Admin times are in India time. Today shows just the time ("22:49");
// any other day adds the date ("10 Oct, 22:07").
const TIME_ZONE = "Asia/Kolkata";

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "short" });

export function formatAdminTime(date: Date, now = new Date()): string {
  const time = timeFormat.format(date);
  if (dayFormat.format(date) === dayFormat.format(now)) {
    return time;
  }
  return `${dateFormat.format(date)}, ${time}`;
}
