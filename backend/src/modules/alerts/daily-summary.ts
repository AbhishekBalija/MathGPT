/**
 * Once a day (Vercel cron, 09:00 India time): what came in over the last
 * 24 hours, emailed to every admin. Nothing is sent when nothing came in.
 */

import type { EmailSender } from "../email/email-sender";
import { failedRepository } from "../admin/failed/failed.repository";
import { feedbackRepository } from "../feedback/feedback.repository";
import { solutionReportRepository } from "../solutions/solution-report.repository";
import { userRepository } from "../users/user.repository";
import { buildDailySummary } from "./alert-emails";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_FAILED = 50;

export async function sendDailySummary(emailSender: EmailSender, origin: string, now = new Date()): Promise<{ sentTo: number }> {
  const since = new Date(now.getTime() - DAY_MS);
  const [open, reports, feedback] = await Promise.all([
    failedRepository.listGroups("open", MAX_FAILED),
    solutionReportRepository.countSince(since),
    feedbackRepository.countSince(since),
  ]);
  // Open problems with a try in the last 24 hours
  const failed = open.groups.filter((group) => group.lastAt > since);

  const draft = buildDailySummary({ failed, reports, feedback }, origin);
  if (!draft) return { sentTo: 0 };

  const admins = await userRepository.adminEmails();
  await Promise.allSettled(admins.map((to) => emailSender.send({ ...draft, to })));
  return { sentTo: admins.length };
}
