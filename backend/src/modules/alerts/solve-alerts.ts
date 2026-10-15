/**
 * Emails every admin when solving starts failing and when it is back.
 * Each AI solve reports here, in the background, after the student has
 * their answer. Emails only go out when ALERT_EMAILS_ENABLED=true, so
 * local runs and preview deploys never email anyone.
 */

import { logger } from "../../lib/logger";
import type { EmailSender } from "../email/email-sender";
import { userRepository } from "../users/user.repository";
import { failingEmail, recoveredEmail } from "./alert-emails";
import { alertRepository } from "./alert.repository";
import { nextAlert, type AlertEvent } from "./alert-rules";

export interface SolveAlerts {
  onSolveFailed(code: string): Promise<void>;
  onSolveSucceeded(): Promise<void>;
}

interface Options {
  env: Record<string, string | undefined>;
  // The alert_state row; tests use their own
  kind?: string;
  // Where links in the emails go, e.g. https://neomath.vercel.app
  origin: string;
}

export function createSolveAlerts(emailSender: EmailSender, { env, kind = "solving", origin }: Options): SolveAlerts {
  async function handle(event: AlertEvent): Promise<void> {
    const send = await alertRepository.update(kind, (record) => {
      const next = nextAlert(record, event, Date.now());
      return { record: next.record, result: next.send };
    });
    if (!send) return;

    if (env.ALERT_EMAILS_ENABLED !== "true") {
      logger.info("Alert not emailed: ALERT_EMAILS_ENABLED is off", { kind, send });
      return;
    }
    const draft = send === "failing" && event.kind === "failed" ? failingEmail(event.code, origin) : recoveredEmail(origin);
    const admins = await userRepository.adminEmails();
    // One admin's bad address must not stop the others getting it
    await Promise.allSettled(admins.map((to) => emailSender.send({ ...draft, to })));
    logger.info("Alert emailed", { kind, send, admins: admins.length });
  }

  return {
    onSolveFailed: (code) => handle({ kind: "failed", code }),
    onSolveSucceeded: () => handle({ kind: "succeeded" }),
  };
}
