/**
 * Rate Limits stored in Postgres, so every server instance shares them.
 *
 * Fixed window: the first hit starts a window, later hits count up, and once
 * the window has passed the next hit starts a fresh one. The check and the
 * increment are one upsert, so concurrent requests can never both slip in.
 */

import { sql } from "drizzle-orm";
import { db } from "../../db/client";
import { runInBackground } from "../../lib/background";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window ends (0 when allowed). */
  retryAfterSeconds: number;
}

// Windows older than this are dead weight; no limit here is longer than an hour
const CLEANUP_AFTER = sql`interval '1 day'`;
// About 1 in 100 hits also clears out old rows, so no scheduled job is needed
const CLEANUP_CHANCE = 0.01;

export const rateLimitRepository = {
  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    if (Math.random() < CLEANUP_CHANCE) {
      // Off the request path, so a slow or failed cleanup never delays or breaks a request
      runInBackground("rate-limit-cleanup", async () => {
        await db.execute(sql`delete from rate_limits where window_start < now() - ${CLEANUP_AFTER}`);
      });
    }

    const window = sql`make_interval(secs => ${windowSeconds})`;
    const result = await db.execute<{ count: number; seconds_left: number }>(sql`
      insert into rate_limits (key, window_start, count)
      values (${key}, now(), 1)
      on conflict (key) do update set
        window_start = case
          when rate_limits.window_start <= now() - ${window} then now()
          else rate_limits.window_start
        end,
        count = case
          when rate_limits.window_start <= now() - ${window} then 1
          else rate_limits.count + 1
        end
      returning
        count,
        ceil(extract(epoch from (window_start + ${window} - now())))::int as seconds_left
    `);

    const row = result.rows[0];
    if (!row) {
      throw new Error("Rate limit upsert returned no row");
    }
    const allowed = row.count <= limit;
    return { allowed, retryAfterSeconds: allowed ? 0 : Math.max(1, row.seconds_left) };
  },
};
