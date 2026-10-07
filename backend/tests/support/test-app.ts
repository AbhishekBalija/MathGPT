/**
 * What tests use to reach the in-process app: its URL and the two fakes.
 *
 * `start-app.ts` starts one app per test file with these fakes, so a test
 * that imports `fakeEmailSender` reads the same outbox the app writes to.
 */

import { createFakeEmailSender } from "./fake-email-sender";
import { createFakeMathSolver } from "./fake-math-solver";

export const fakeMathSolver = createFakeMathSolver();
export const fakeEmailSender = createFakeEmailSender();

/** Full URL for an API path, e.g. `apiUrl("/health")`. */
export function apiUrl(path: string): string {
  const baseUrl = process.env.TEST_API_URL;
  if (!baseUrl) {
    throw new Error("TEST_API_URL is not set. Is tests/support/start-app.ts in setupFiles?");
  }
  return `${baseUrl}${path}`;
}
