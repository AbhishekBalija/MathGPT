/** What a student has done, for the admin Students screen. */

import { sql, type SQL } from "drizzle-orm";
import { db } from "../../../db/client";

export type HistoryKind = "solved" | "failed" | "reported" | "joined";

export interface StudentActivity {
  solves: number;
  failed: number;
  reports: number;
  // Newest first; "joined" carries the sign-in provider as its title
  history: Array<{ kind: HistoryKind; title: string; at: Date }>;
}

const HISTORY_LENGTH = 20;

async function rows<T extends Record<string, unknown>>(query: SQL): Promise<T[]> {
  const result = await db.execute(query);
  return result.rows as T[];
}

export const studentsRepository = {
  async activity(userId: string): Promise<StudentActivity> {
    const [totals] = await rows<{ solves: number; failed: number; reports: number }>(sql`
      select
        (select count(*)::int from solutions where user_id = ${userId}) as solves,
        (select count(*)::int from error_logs where user_id = ${userId}) as failed,
        (select count(*)::int from solution_reports where user_id = ${userId}) as reports
    `);
    const history = await rows<{ kind: HistoryKind; title: string; at: string | Date }>(sql`
      select kind, title, at from (
        select 'solved' as kind, problem as title, created_at as at from solutions where user_id = ${userId}
        union all
        select 'failed', problem_text, created_at from error_logs where user_id = ${userId}
        union all
        select 'reported', coalesce(problem_text, ''), created_at from solution_reports where user_id = ${userId}
        union all
        select 'joined', provider, created_at from users where id = ${userId}
      ) items
      order by at desc
      limit ${HISTORY_LENGTH}
    `);
    return {
      solves: Number(totals?.solves ?? 0),
      failed: Number(totals?.failed ?? 0),
      reports: Number(totals?.reports ?? 0),
      history: history.map((item) => ({ kind: item.kind, title: item.title, at: new Date(item.at) })),
    };
  },

  /** How many solves each student has, and when they last solved. */
  async solveTotals(userIds: string[]): Promise<Map<string, { solves: number; lastSolvedAt: Date | null }>> {
    if (userIds.length === 0) return new Map();
    const found = await rows<{ user_id: string; solves: number; last_at: string | Date }>(sql`
      select user_id, count(*)::int as solves, max(created_at) as last_at
      from solutions
      where user_id in (${sql.join(userIds.map((id) => sql`${id}::uuid`), sql`, `)})
      group by user_id
    `);
    return new Map(found.map((row) => [row.user_id, { solves: Number(row.solves), lastSolvedAt: new Date(row.last_at) }]));
  },
};
