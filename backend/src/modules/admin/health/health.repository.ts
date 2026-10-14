/** The queries behind the admin Health screen. Days are India days. */

import { sql, type SQL } from "drizzle-orm";
import { db } from "../../../db/client";

const istDate = (column: string) => sql.raw(`(${column} at time zone 'Asia/Kolkata')::date`);

async function rows<T extends Record<string, unknown>>(query: SQL): Promise<T[]> {
  const result = await db.execute(query);
  return result.rows as T[];
}

export const healthRepository = {
  async ping(): Promise<void> {
    await db.execute(sql`select 1`);
  },

  async solving(): Promise<{
    tries24h: number;
    failed24h: number;
    days: Map<string, { tries: number; failed: number }>;
    byCode: Array<{ errorCode: string; count: number }>;
  }> {
    const [last24h] = await rows<{ solved: number; failed: number }>(sql`
      select
        (select count(*)::int from solutions where created_at > now() - interval '24 hours') as solved,
        (select count(*)::int from error_logs where created_at > now() - interval '24 hours') as failed
    `);
    const perDay = await rows<{ day: string; solved: number; failed: number }>(sql`
      select day::text, sum(solved)::int as solved, sum(failed)::int as failed from (
        select ${istDate("created_at")} as day, 1 as solved, 0 as failed from solutions where created_at > now() - interval '8 days'
        union all
        select ${istDate("created_at")} as day, 0, 1 from error_logs where created_at > now() - interval '8 days'
      ) tries group by day
    `);
    const byCode = await rows<{ error_code: string; count: number }>(sql`
      select error_code, count(*)::int as count from error_logs
      where created_at > now() - interval '7 days'
      group by 1 order by 2 desc
    `);
    const solved = Number(last24h?.solved ?? 0);
    const failed = Number(last24h?.failed ?? 0);
    return {
      tries24h: solved + failed,
      failed24h: failed,
      days: new Map(perDay.map((entry) => [entry.day, { tries: Number(entry.solved) + Number(entry.failed), failed: Number(entry.failed) }])),
      byCode: byCode.map((entry) => ({ errorCode: entry.error_code, count: Number(entry.count) })),
    };
  },

  async speed(): Promise<{ avgMs: number; p90Ms: number }> {
    const [row] = await rows<{ avg_ms: number; p90_ms: number }>(sql`
      select
        coalesce(round(avg(processing_time_ms)), 0)::int as avg_ms,
        coalesce(round(percentile_cont(0.9) within group (order by processing_time_ms)), 0)::int as p90_ms
      from solutions where processing_time_ms is not null
    `);
    return { avgMs: Number(row?.avg_ms ?? 0), p90Ms: Number(row?.p90_ms ?? 0) };
  },

  /** When each applied migration was made, as Drizzle records it. */
  async appliedMigrations(): Promise<number[]> {
    const found = await rows<{ created_at: string }>(sql`select created_at from drizzle.__drizzle_migrations`);
    return found.map((row) => Number(row.created_at));
  },
};
