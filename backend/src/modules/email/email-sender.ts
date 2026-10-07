/**
 * Sending email as the rest of the app sees it. Routes depend on this
 * interface, not on Resend, so tests can swap in a fake with an outbox.
 */

import { Resend } from "resend";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface EmailSender {
  /** Throws when the email could not be sent. */
  send(message: EmailMessage): Promise<void>;
}

export function createResendEmailSender(apiKey: string, from: string): EmailSender {
  const resend = new Resend(apiKey);

  return {
    async send(message) {
      const { error } = await resend.emails.send({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

/**
 * Development only: prints emails to the server log instead of sending them,
 * so you can read Verification Codes without a Resend account.
 */
export function createConsoleEmailSender(): EmailSender {
  return {
    async send(message) {
      const code = message.html.match(/data-verification-code="(\d{6})"/)?.[1];
      console.log(
        `\n[email] to: ${message.to}\n[email] subject: ${message.subject}` +
          (code ? `\n[email] verification code: ${code}` : "") +
          "\n"
      );
    },
  };
}
