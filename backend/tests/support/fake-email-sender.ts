/**
 * Stands in for Resend during tests. Instead of sending, it keeps every email
 * in an outbox, so tests can read what a User would have received.
 */

import type {
  EmailMessage,
  EmailSender,
} from "../../src/modules/email/email-sender";

export interface FakeEmailSender extends EmailSender {
  outbox: EmailMessage[];
  emailsTo(address: string): EmailMessage[];
}

export function createFakeEmailSender(): FakeEmailSender {
  const outbox: EmailMessage[] = [];

  return {
    outbox,
    async send(message) {
      outbox.push(message);
    },
    emailsTo(address) {
      return outbox.filter((email) => email.to === address);
    },
  };
}
