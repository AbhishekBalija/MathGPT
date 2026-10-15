// "Copy for Claude": one item as plain text Claude can debug from in one
// paste. There is no field for a name or email, so they can never get in.
export interface ClaudeNoteInput {
  kind: "failed" | "report" | "feedback";
  id: string;
  adminPath: string;
  at: Date;
  ms: number | null;
  errorCode?: string;
  fullMessage?: string;
  attempts?: Array<{ model: string; error: string }>;
  promptVersion?: string;
  problem: string;
  answer?: string;
  checkedByCode?: boolean;
  message?: string;
}

const TITLES: Record<ClaudeNoteInput["kind"], string> = {
  failed: "Failed solve",
  report: "Report",
  feedback: "Feedback",
};

const VERCEL_LOGS = "https://vercel.com/abhishek-an-83378fc9/neomath-api/logs";
// Logs from 2.5 minutes either side
const LOG_WINDOW_MS = 150_000;

const istParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function istTime(at: Date): string {
  const part = (type: string) => istParts.formatToParts(at).find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}`;
}

function utcTime(at: Date): string {
  return at.toISOString().slice(11, 16);
}

export function buildClaudeNote(input: ClaudeNoteInput, origin: string): string {
  const lines = [
    `## ${TITLES[input.kind]} ${input.id.slice(0, 8)}`,
    `Link: ${origin}${input.adminPath}`,
    `When: ${istTime(input.at)} IST (${utcTime(input.at)} UTC)${input.ms !== null ? `, ${input.ms} ms` : ""}`,
  ];
  if (input.errorCode) {
    lines.push(`Error: ${input.errorCode}`);
    if (input.fullMessage) lines.push(input.fullMessage);
  }
  if (input.attempts && input.attempts.length > 0) {
    lines.push(`Models: ${input.attempts.map((attempt) => `${attempt.model}: ${attempt.error}`).join(" | ")}`);
  }
  if (input.promptVersion) lines.push(`Prompt: ${input.promptVersion}`);
  if (input.answer !== undefined) lines.push(`Answer: ${input.answer}`);
  if (input.checkedByCode !== undefined) lines.push(`Code check: ${input.checkedByCode ? "agreed" : "did not check"}`);
  if (input.message) lines.push(`Message: ${input.message}`);

  const at = input.at.getTime();
  lines.push(
    "Problem:",
    ...input.problem.split("\n").map((line) => `  ${line}`),
    "Links:",
    `  Sentry: https://sentry.io/issues/?query=${input.id}`,
    `  Vercel: ${VERCEL_LOGS}?startDate=${at - LOG_WINDOW_MS}&endDate=${at + LOG_WINDOW_MS}`,
  );
  return lines.join("\n");
}
