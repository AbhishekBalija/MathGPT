/**
 * Test setup that moves stored timestamps into the past, so tests can check
 * expiry and time windows without waiting. Setup only, never for asserting.
 */

import { sql } from "drizzle-orm";
import { db } from "../../src/db/client";

/** Makes a User's current Verification Code expired. */
export async function expireVerificationCode(email: string): Promise<void> {
  await db.execute(sql`
    update email_verifications set expires_at = now() - interval '1 second'
    where user_id = (select id from users where email = ${email.toLowerCase()})
  `);
}

/** Moves every Rate Limit window for this User into the past by `seconds`. */
export async function moveRateLimitWindowsBack(email: string, seconds: number): Promise<void> {
  await db.execute(sql`
    update rate_limits set window_start = window_start - make_interval(secs => ${seconds})
    where key like '%:' || (select id::text from users where email = ${email.toLowerCase()})
  `);
}
