/**
 * Rate Limits stored in Postgres, so every server instance shares them.
 *
 * Fixed window: the first hit starts a window, later hits count up, and once
 * the window has passed the next hit starts a fresh one. The check and the
 * increment are one upsert, so concurrent requests can never both slip in.
 */

import { sql } from "drizzle-orm";
import { db } from "../../db/client";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window ends (0 when allowed). */
  retryAfterSeconds: number;
}

export const rateLimitRepository = {
  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
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
