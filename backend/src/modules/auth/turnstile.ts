/**
 * Cloudflare Turnstile: a free "are you a person?" check on the sign-up form,
 * so scripts cannot create accounts in bulk.
 *
 * The browser gets a token from the widget; we send it to Cloudflare with our
 * secret, and Cloudflare says whether it was a real person.
 */

import { logger } from "../../lib/logger";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;

/** True when the person passed the check. Passed in, so tests can fake it. */
export type HumanCheck = (token: string | undefined, ip: string) => Promise<boolean>;

/** Asks Cloudflare about one token. Any error counts as "no". */
export async function verifyTurnstile(
  token: string,
  ip: string,
  secret: string,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  try {
    const response = await fetchImpl(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn("Turnstile check failed to run", { status: response.status });
      return false;
    }
    const result = (await response.json()) as { success?: unknown };
    return result.success === true;
  } catch (error) {
    logger.warn("Turnstile check failed to run", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return false;
  }
}

/**
 * The check the app uses. Without a secret it is skipped, but only outside
 * production, so local development and tests work with no Cloudflare keys.
 * In production a missing secret refuses every sign-up rather than letting
 * bots through.
 */
export function createTurnstileCheck(
  env: { NODE_ENV?: string; TURNSTILE_SECRET_KEY?: string },
  fetchImpl: typeof fetch = fetch
): HumanCheck {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (env.NODE_ENV === "production") {
      logger.error("TURNSTILE_SECRET_KEY is not set; sign-ups are refused");
      return async () => false;
    }
    logger.warn("TURNSTILE_SECRET_KEY is not set; skipping the robot check (not production)");
    return async () => true;
  }
  return async (token, ip) => (token ? verifyTurnstile(token, ip, secret, fetchImpl) : false);
}
