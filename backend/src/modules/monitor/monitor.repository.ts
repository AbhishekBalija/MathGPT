/**
 * The two Monitor Snapshot numbers the admin pages don't already have.
 * Counts only: no problem text, no error messages, no user ids.
 */

import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db/client";

async function rows<T extends Record<string, unknown>>(query: SQL): Promise<T[]> {
  const result = await db.execute(query);
  return result.rows as T[];
}

export const monitorRepository = {
  /** Failed tries in the last 24 hours by error code and the model that failed last. */
  async failuresLast24h(): Promise<Array<{ errorCode: string; model: string; count: number }>> {
    const found = await rows<{ error_code: string; model: string; count: number }>(sql`
      select error_code, coalesce(details->'attempts'->-1->>'model', 'unknown') as model, count(*)::int as count
      from error_logs
      where created_at > now() - interval '24 hours'
      group by 1, 2 order by 3 desc
    `);
    return found.map((entry) => ({ errorCode: entry.error_code, model: entry.model, count: Number(entry.count) }));
  },

  /** Problems the Problem Guard turned away in the last 24 hours, by Rejection Reason. */
  async guardRejectionsLast24h(): Promise<Record<string, number>> {
    const found = await rows<{ reason: string; count: number }>(sql`
      select coalesce(properties->>'reason', 'unknown') as reason, count(*)::int as count
      from analytics_events
      where event_name = 'problem_rejected' and created_at > now() - interval '24 hours'
      group by 1
    `);
    return Object.fromEntries(found.map((entry) => [entry.reason, Number(entry.count)]));
  },
};
