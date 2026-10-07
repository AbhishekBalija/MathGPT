/**
 * Small structured logger.
 *
 * Same call shape the old Motia logger had (`logger.info("message", { data })`)
 * so route code did not need to change. Each line is printed as JSON, which
 * Vercel's log viewer can search and filter.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

function write(level: LogLevel, message: string, data?: unknown): void {
  const line = JSON.stringify({
    level,
    message,
    ...(data === undefined ? {} : { data }),
    time: new Date().toISOString(),
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, data?: unknown) => write("debug", message, data),
  info: (message: string, data?: unknown) => write("info", message, data),
  warn: (message: string, data?: unknown) => write("warn", message, data),
  error: (message: string, data?: unknown) => write("error", message, data),
};
