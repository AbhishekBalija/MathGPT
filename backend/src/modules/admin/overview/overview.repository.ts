/**
 * The queries behind the admin Overview. Days are India days, and team
 * accounts (admins, or users marked as team) are left out of student and
 * business numbers.
 */

import { sql, type SQL } from "drizzle-orm";
import { db } from "../../../db/client";
import type { AlertStatus } from "../../../db/schema";
import { normalizedProblem, studentKey } from "../failed/failed.repository";

const IST_TODAY = sql`(now() at time zone 'Asia/Kolkata')::date`;
const istDate = (column: string) => sql.raw(`(${column} at time zone 'Asia/Kolkata')::date`);

export interface OverviewNumbers {
  solves: number;
  solvesToday: number;
  realStudents: number;
  teamStudents: number;
  activeThisWeek: number;
  failedTries: number;
  failedTries24h: number;
  tries24h: number;
}

export interface NeedsYouItem {
  kind: "failed" | "report" | "feedback";
  id: string;
  title: string;
  subtitle: string;
  at: string;
}

// A raw query's rows, typed by the caller (the SQL says which columns come back)
async function rows<T extends Record<string, unknown>>(query: SQL): Promise<T[]> {
  const result = await db.execute(query);
  return result.rows as T[];
}

export const overviewRepository = {
  async numbers(): Promise<OverviewNumbers> {
    const [row] = await rows<Record<string, number>>(sql`
      select
        (select count(*)::int from solutions) as solves,
        (select count(*)::int from solutions where ${istDate("created_at")} = ${IST_TODAY}) as solves_today,
        (select count(*)::int from users where not (is_admin or is_team)) as real_students,
        (select count(*)::int from users where is_admin or is_team) as team_students,
        (select count(distinct s.user_id)::int from solutions s join users u on u.id = s.user_id
          where not (u.is_admin or u.is_team) and s.created_at > now() - interval '7 days') as active_this_week,
        (select count(*)::int from error_logs) as failed_tries,
        (select count(*)::int from error_logs where created_at > now() - interval '24 hours') as failed_24h,
        (select count(*)::int from solutions where created_at > now() - interval '24 hours') as solves_24h
    `);
    const value = (key: string) => Number(row?.[key] ?? 0);
    return {
      solves: value("solves"),
      solvesToday: value("solves_today"),
      realStudents: value("real_students"),
      teamStudents: value("team_students"),
      activeThisWeek: value("active_this_week"),
      failedTries: value("failed_tries"),
      failedTries24h: value("failed_24h"),
      tries24h: value("solves_24h") + value("failed_24h"),
    };
  },

  /** Solves per India day over the last 8 days; days with none are missing. */
  async solvesByDay(): Promise<Map<string, number>> {
    const found = await rows<{ day: string; count: number }>(sql`
      select ${istDate("created_at")}::text as day, count(*)::int as count
      from solutions where created_at > now() - interval '8 days'
      group by 1
    `);
    return new Map(found.map((entry) => [entry.day, Number(entry.count)]));
  },

  /** Today's saved solves by where the answer came from and which model wrote it. */
  async solveSourcesToday(): Promise<Array<{ source: string; model: string | null; count: number }>> {
    const found = await rows<{ source: string; model: string | null; count: number }>(sql`
      select coalesce(properties->>'source', 'ai') as source, properties->>'model' as model, count(*)::int as count
      from analytics_events
      where event_name = 'solution_saved' and ${istDate("created_at")} = ${IST_TODAY}
      group by 1, 2
    `);
    return found.map((entry) => ({ ...entry, count: Number(entry.count) }));
  },

  async tokens(): Promise<{ today: number; avgPerSolve: number }> {
    const [row] = await rows<{ today: number; avg_per_solve: number }>(sql`
      select
        (select coalesce(sum(total_tokens), 0)::int from solutions where ${istDate("created_at")} = ${IST_TODAY}) as today,
        (select coalesce(round(avg(total_tokens)), 0)::int from solutions where total_tokens > 0) as avg_per_solve
    `);
    return { today: Number(row?.today ?? 0), avgPerSolve: Number(row?.avg_per_solve ?? 0) };
  },

  /** Open failed problems, blocked reports and open feedback, newest first. */
  async needsYou(limit: number): Promise<NeedsYouItem[]> {
    const failed = await rows<{ id: string; title: string; code: string; tries: number; at: Date }>(sql`
      select
        (array_agg(id order by created_at desc))[1] as id,
        (array_agg(problem_text order by created_at desc))[1] as title,
        (array_agg(error_code order by created_at desc))[1] as code,
        count(*)::int as tries,
        max(created_at) as at
      from error_logs where not resolved
      group by ${studentKey}, ${normalizedProblem}
      order by at desc limit ${limit}
    `);
    const reports = await rows<{ id: string; title: string | null; at: Date }>(sql`
      select r.id, r.problem_text as title, r.created_at as at
      from solution_reports r join solution_cache c on c.key = r.cache_key
      where c.status = 'blocked'
      order by r.created_at desc limit ${limit}
    `);
    const feedback = await rows<{ id: string; title: string; kind: string; at: Date }>(sql`
      select id, message as title, kind, created_at as at
      from feedback where not done
      order by created_at desc limit ${limit}
    `);

    const items: NeedsYouItem[] = [
      ...failed.map((item) => ({
        kind: "failed" as const,
        id: item.id,
        title: item.title,
        subtitle: Number(item.tries) > 1 ? `${item.code} · ${item.tries} tries` : item.code,
        at: new Date(item.at).toISOString(),
      })),
      ...reports.map((item) => ({
        kind: "report" as const,
        id: item.id,
        title: item.title ?? "Problem not saved",
        subtitle: "Answer blocked",
        at: new Date(item.at).toISOString(),
      })),
      ...feedback.map((item) => ({
        kind: "feedback" as const,
        id: item.id,
        title: item.title,
        subtitle: `Feedback · ${item.kind}`,
        at: new Date(item.at).toISOString(),
      })),
    ];
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  },

  /** Real students only: signed up, verified, solved once, solved on 2 or more India days. */
  async funnel(): Promise<{ signedUp: number; verified: number; solved: number; cameBack: number }> {
    const [row] = await rows<Record<string, number>>(sql`
      with real_users as (select id, provider, email_verified_at from users where not (is_admin or is_team)),
      days as (
        select s.user_id, count(distinct ${istDate("s.created_at")}) as solve_days
        from solutions s join real_users u on u.id = s.user_id
        group by s.user_id
      )
      select
        (select count(*)::int from real_users) as signed_up,
        (select count(*)::int from real_users where email_verified_at is not null or provider = 'google') as verified,
        (select count(*)::int from days) as solved,
        (select count(*)::int from days where solve_days >= 2) as came_back
    `);
    const value = (key: string) => Number(row?.[key] ?? 0);
    return { signedUp: value("signed_up"), verified: value("verified"), solved: value("solved"), cameBack: value("came_back") };
  },

  async topTopics(limit: number): Promise<Array<{ problemType: string; count: number }>> {
    const found = await rows<{ problem_type: string; count: number }>(sql`
      select s.problem_type, count(*)::int as count
      from solutions s join users u on u.id = s.user_id
      where not (u.is_admin or u.is_team)
      group by 1 order by 2 desc limit ${limit}
    `);
    return found.map((entry) => ({ problemType: entry.problem_type, count: Number(entry.count) }));
  },

  async solvingAlert(): Promise<{ status: AlertStatus; changedAt: Date } | null> {
    const [row] = await rows<{ status: AlertStatus; changed_at: Date }>(sql`
      select status, changed_at from alert_state where kind = 'solving'
    `);
    return row ? { status: row.status, changedAt: new Date(row.changed_at) } : null;
  },
};
