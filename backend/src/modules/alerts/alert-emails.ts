/** The alert emails the admins get. Never a student's name or email. */

import type { EmailMessage } from "../email/email-sender";
import type { FailedGroup } from "../admin/failed/failed.repository";
import { escapeHtml } from "../../services/email/templates/email.templates";

type Draft = Omit<EmailMessage, "to">;

const PROBLEM_PREVIEW = 120;

function page(body: string): string {
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111827;max-width:560px">${body}</div>`;
}

function button(href: string, label: string): string {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#111827;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">${label}</a></p>`;
}

export function failingEmail(code: string, origin: string): Draft {
  return {
    subject: `NeoMath: solving is failing (${code})`,
    html: page(`
      <p><b>Students' solves are failing.</b> The AI providers gave ${escapeHtml(code)} 3 times in a row, or 3 times in 10 minutes.</p>
      <p>You'll get one more email when it works again, and a reminder every 30 minutes while it doesn't.</p>
      ${button(`${origin}/admin/health`, "Open Health")}
    `),
  };
}

export function recoveredEmail(origin: string): Draft {
  return {
    subject: "NeoMath: solving is back",
    html: page(`
      <p><b>Solving works again.</b> A student's solve just went through.</p>
      ${button(`${origin}/admin/failed`, "See what failed")}
    `),
  };
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** What came in over the last 24 hours, or null when nothing did. */
export function buildDailySummary(items: { failed: FailedGroup[]; reports: number; feedback: number }, origin: string): Draft | null {
  const total = items.failed.length + items.reports + items.feedback;
  if (total === 0) return null;

  const failedRows = items.failed
    .map((group) => {
      const problem = group.problem.length > PROBLEM_PREVIEW ? `${group.problem.slice(0, PROBLEM_PREVIEW)}…` : group.problem;
      const tries = group.tries > 1 ? ` ×${group.tries}` : "";
      return `<li><a href="${escapeHtml(`${origin}/admin/failed/${group.id}`)}">${escapeHtml(problem)}</a>${tries} · ${escapeHtml(group.errorCode)}</li>`;
    })
    .join("");

  return {
    subject: `NeoMath: ${plural(total, "new thing", "new things")} to look at`,
    html: page(`
      <p><b>In the last 24 hours:</b></p>
      ${items.failed.length > 0 ? `<p>${plural(items.failed.length, "failed problem", "failed problems")}</p><ul>${failedRows}</ul>` : ""}
      ${items.reports > 0 ? `<p>${plural(items.reports, "report", "reports")} of a wrong answer · <a href="${escapeHtml(`${origin}/admin/reports`)}">Reports</a></p>` : ""}
      ${items.feedback > 0 ? `<p>${plural(items.feedback, "piece", "pieces")} of feedback · <a href="${escapeHtml(`${origin}/admin/feedback`)}">Feedback</a></p>` : ""}
      ${button(`${origin}/admin`, "Open the admin")}
    `),
  };
}
