/**
 * The queries behind the admin Business screen. Days and weeks are India
 * time, weeks start on Monday, and team accounts (admins, or users marked
 * as team) are left out unless `includeTeam` is set.
 */

import { sql, type SQL } from "drizzle-orm";
import { db } from "../../../db/client";

// Same daily limit as the solve route
const DAILY_FREE_LIMIT = 5;

const istDate = (column: string) => sql.raw(`(${column} at time zone 'Asia/Kolkata')::date`);
const istWeek = (column: string) => sql.raw(`date_trunc('week', ${column} at time zone 'Asia/Kolkata')::date`);
// This India week, Monday to now
const THIS_WEEK = istWeek("now()");

async function rows<T extends Record<string, unknown>>(query: SQL): Promise<T[]> {
  const result = await db.execute(query);
  return result.rows as T[];
}

// Which users count, for a users table aliased as `u`
function counted(includeTeam: boolean): SQL {
  return includeTeam ? sql`true` : sql`not (u.is_admin or u.is_team)`;
}

export const businessRepository = {
  async numbers(includeTeam: boolean): Promise<{ students: number; activeThisWeek: number; solvesThisWeek: number; limitHits: number; hiddenTeam: number }> {
    const [row] = await rows<Record<string, number>>(sql`
      select
        (select count(*)::int from users u where ${counted(includeTeam)}) as students,
        (select count(distinct s.user_id)::int from solutions s join users u on u.id = s.user_id
          where ${counted(includeTeam)} and ${istWeek("s.created_at")} = ${THIS_WEEK}) as active,
        (select count(*)::int from solutions s join users u on u.id = s.user_id
          where ${counted(includeTeam)} and ${istWeek("s.created_at")} = ${THIS_WEEK}) as solves,
        (select count(*)::int from (
          select e.user_id, ${istDate("e.created_at")}
          from analytics_events e join users u on u.id = e.user_id
          where e.event_name = 'solution_saved'
            -- Only AI answers spend a free problem; cache and instant answers are free
            and coalesce(e.properties->>'source', 'ai') = 'ai'
            and ${counted(includeTeam)}
          group by 1, 2
          having count(*) >= ${DAILY_FREE_LIMIT}
        ) hits) as limit_hits,
        (select count(*)::int from users u where u.is_admin or u.is_team) as hidden_team
    `);
    const value = (key: string) => Number(row?.[key] ?? 0);
    return {
      students: value("students"),
      activeThisWeek: value("active"),
      solvesThisWeek: value("solves"),
      limitHits: value("limit_hits"),
      hiddenTeam: value("hidden_team"),
    };
  },

  /** New users per India day over the last 8 days; days with none are missing. */
  async newByDay(includeTeam: boolean): Promise<Map<string, number>> {
    const found = await rows<{ day: string; count: number }>(sql`
      select ${istDate("u.created_at")}::text as day, count(*)::int as count
      from users u
      where ${counted(includeTeam)} and u.created_at > now() - interval '8 days'
      group by 1
    `);
    return new Map(found.map((entry) => [entry.day, Number(entry.count)]));
  },

  /** Signed up, verified, solved once, solved on 2 or more India days. */
  async funnel(includeTeam: boolean): Promise<{ signedUp: number; verified: number; solved: number; cameBack: number }> {
    const [row] = await rows<Record<string, number>>(sql`
      with counted_users as (select u.id, u.provider, u.email_verified_at from users u where ${counted(includeTeam)}),
      days as (
        select s.user_id, count(distinct ${istDate("s.created_at")}) as solve_days
        from solutions s join counted_users c on c.id = s.user_id
        group by s.user_id
      )
      select
        (select count(*)::int from counted_users) as signed_up,
        (select count(*)::int from counted_users where email_verified_at is not null or provider = 'google') as verified,
        (select count(*)::int from days) as solved,
        (select count(*)::int from days where solve_days >= 2) as came_back
    `);
    const value = (key: string) => Number(row?.[key] ?? 0);
    return { signedUp: value("signed_up"), verified: value("verified"), solved: value("solved"), cameBack: value("came_back") };
  },

  /**
   * For users who signed up on or after `since` (a Monday): how many signed
   * up each week, and how many of them solved something in each later week.
   */
  async cohorts(includeTeam: boolean, since: string): Promise<{
    sizes: Map<string, number>;
    active: Map<string, Map<number, number>>;
  }> {
    const cohortUsers = sql`
      select u.id, ${istWeek("u.created_at")} as cohort from users u
      where ${counted(includeTeam)} and ${istDate("u.created_at")} >= ${since}::date
    `;
    const sizes = await rows<{ cohort: string; students: number }>(sql`
      select cohort::text, count(*)::int as students from (${cohortUsers}) c group by 1
    `);
    const active = await rows<{ cohort: string; week: number; students: number }>(sql`
      select c.cohort::text, ((${istWeek("s.created_at")} - c.cohort) / 7)::int as week, count(distinct s.user_id)::int as students
      from (${cohortUsers}) c join solutions s on s.user_id = c.id
      where ${istWeek("s.created_at")} >= c.cohort
      group by 1, 2
    `);
    const byCohort = new Map<string, Map<number, number>>();
    for (const entry of active) {
      const weeks = byCohort.get(entry.cohort) ?? new Map<number, number>();
      weeks.set(Number(entry.week), Number(entry.students));
      byCohort.set(entry.cohort, weeks);
    }
    return { sizes: new Map(sizes.map((entry) => [entry.cohort, Number(entry.students)])), active: byCohort };
  },

  /** Tokens are what we pay for, so every solve counts here, team or not. */
  async cost(): Promise<{ tokensToday: number; avgTokensPerSolve: number }> {
    const [row] = await rows<{ today: number; avg_per_solve: number }>(sql`
      select
        (select coalesce(sum(total_tokens), 0)::int from solutions where ${istDate("created_at")} = (now() at time zone 'Asia/Kolkata')::date) as today,
        (select coalesce(round(avg(total_tokens)), 0)::int from solutions where total_tokens > 0) as avg_per_solve
    `);
    return { tokensToday: Number(row?.today ?? 0), avgTokensPerSolve: Number(row?.avg_per_solve ?? 0) };
  },

  async topics(includeTeam: boolean, limit: number): Promise<Array<{ problemType: string; count: number }>> {
    const found = await rows<{ problem_type: string; count: number }>(sql`
      select s.problem_type, count(*)::int as count
      from solutions s join users u on u.id = s.user_id
      where ${counted(includeTeam)}
      group by 1 order by 2 desc limit ${limit}
    `);
    return found.map((entry) => ({ problemType: entry.problem_type, count: Number(entry.count) }));
  },
};
