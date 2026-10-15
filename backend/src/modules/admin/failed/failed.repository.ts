import { count, eq, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { db } from "../../../db/client";
import { errorLogs, type ErrorDetails } from "../../../db/schema";
import { isUuid } from "../../../lib/ids";

/**
 * A failed problem is one student plus one problem. Retries of the same
 * problem (even with different spacing) are one problem with several tries.
 * Matches `normalize` in solver/cache/solution-cache.ts: trim, collapse
 * whitespace, "−" becomes "-".
 */
// Collapse first, then trim: Postgres trim() only strips spaces, not newlines or tabs
const normalized = (column: SQLWrapper) => sql<string>`trim(regexp_replace(replace(${column}, '−', '-'), '\\s+', ' ', 'g'))`;
export const normalizedProblem = normalized(errorLogs.problemText);
// A deleted student's tries each stand alone, so two deleted students never merge
const studentKeyOf = (userId: SQLWrapper, id: SQLWrapper) => sql<string>`coalesce(${userId}::text, 'gone:' || ${id}::text)`;
export const studentKey = studentKeyOf(errorLogs.userId, errorLogs.id);

export type FailedStatus = "open" | "resolved" | "all";

export interface FailedGroup {
  // The newest try's id, so a link opens the group
  id: string;
  problem: string;
  tries: number;
  firstAt: Date;
  lastAt: Date;
  errorCode: string;
  // Average time per try, null for very old tries
  ms: number | null;
  // Null once the student deleted their account
  student: { id: string; name: string } | null;
  // The student solved the same problem after the last failed try
  workedLater: boolean;
  resolved: boolean;
}

export interface FailedAttempt {
  at: Date;
  ms: number | null;
  errorCode: string;
  details: ErrorDetails | null;
}

interface GroupRow extends Record<string, unknown> {
  id: string;
  problem: string;
  tries: number;
  first_at: string | Date;
  last_at: string | Date;
  error_code: string;
  avg_ms: number | null;
  resolved: boolean;
  student_id: string | null;
  student_name: string | null;
  worked_later: boolean;
  total_problems: number;
  total_tries: number;
}

async function rows<T extends Record<string, unknown>>(query: SQL): Promise<T[]> {
  const result = await db.execute(query);
  return result.rows as T[];
}

const STATUS_FILTER: Record<FailedStatus, SQL> = {
  open: sql`where e.resolved = false`,
  resolved: sql`where e.resolved = true`,
  all: sql``,
};

// Tries grouped by student and problem, newest first. `tries` picks which
// tries count. The student and "worked later" are only looked up for the
// rows returned, using the user id so the index is used.
function groupedTries(tries: SQL, limit: number): SQL {
  return sql`
    with tries as (${tries}),
    groups as (
      select student_key, problem_key,
        (array_agg(id order by created_at desc))[1] as id,
        (array_agg(user_id) filter (where user_id is not null))[1] as user_id,
        (array_agg(problem_text order by created_at desc))[1] as problem,
        (array_agg(error_code order by created_at desc))[1] as error_code,
        count(*)::int as tries,
        min(created_at) as first_at,
        max(created_at) as last_at,
        bool_and(resolved) as resolved,
        round(avg(processing_time_ms))::int as avg_ms
      from tries group by student_key, problem_key
    ),
    shown as (
      select *,
        count(*) over ()::int as total_problems,
        sum(tries) over ()::int as total_tries
      from groups
      order by last_at desc
      limit ${limit}
    )
    select g.*, u.id as student_id, u.name as student_name,
      exists (
        select 1 from solutions s
        where s.user_id = g.user_id
          and s.created_at > g.last_at
          and ${normalized(sql.raw("s.problem"))} = g.problem_key
      ) as worked_later
    from shown g
    left join users u on u.id = g.user_id
    order by g.last_at desc
  `;
}

const TRY_COLUMNS = sql`
  e.id, e.user_id, e.problem_text, e.error_code, e.resolved, e.processing_time_ms, e.created_at,
  ${normalized(sql.raw("e.problem_text"))} as problem_key,
  ${studentKeyOf(sql.raw("e.user_id"), sql.raw("e.id"))} as student_key
`;

// Every try in the same group as one error log
function sameGroupAs(id: string): SQL {
  return sql`
    select ${TRY_COLUMNS} from error_logs e,
      (select ${studentKeyOf(sql.raw("user_id"), sql.raw("id"))} as sk, ${normalized(sql.raw("problem_text"))} as pk from error_logs where id = ${id}) target
    where ${studentKeyOf(sql.raw("e.user_id"), sql.raw("e.id"))} = target.sk
      and ${normalized(sql.raw("e.problem_text"))} = target.pk
  `;
}

function toGroup(row: GroupRow): FailedGroup {
  return {
    id: row.id,
    problem: row.problem,
    tries: Number(row.tries),
    firstAt: new Date(row.first_at),
    lastAt: new Date(row.last_at),
    errorCode: row.error_code,
    ms: row.avg_ms === null ? null : Number(row.avg_ms),
    student: row.student_id && row.student_name ? { id: row.student_id, name: row.student_name } : null,
    workedLater: Boolean(row.worked_later),
    resolved: Boolean(row.resolved),
  };
}

export const failedRepository = {
  /** How many failed problems are still open. */
  async countOpenGroups(): Promise<number> {
    const groups = db
      .select({ student: studentKey, problem: normalizedProblem })
      .from(errorLogs)
      .where(eq(errorLogs.resolved, false))
      .groupBy(studentKey, normalizedProblem)
      .as("groups");
    const [row] = await db.select({ total: count() }).from(groups);
    return row?.total ?? 0;
  },

  /** Failed problems, newest first, with how many problems and tries in all. */
  async listGroups(status: FailedStatus, limit: number): Promise<{ groups: FailedGroup[]; problems: number; tries: number }> {
    const found = await rows<GroupRow>(groupedTries(sql`select ${TRY_COLUMNS} from error_logs e ${STATUS_FILTER[status]}`, limit));
    return {
      groups: found.map(toGroup),
      problems: Number(found[0]?.total_problems ?? 0),
      tries: Number(found[0]?.total_tries ?? 0),
    };
  },

  /** The group one error log belongs to, with every try, oldest first. */
  async findGroup(id: string): Promise<(FailedGroup & { attempts: FailedAttempt[] }) | null> {
    if (!isUuid(id)) return null;
    const [group] = await rows<GroupRow>(groupedTries(sameGroupAs(id), 1));
    if (!group) return null;

    const attempts = await rows<{ created_at: string | Date; processing_time_ms: number | null; error_code: string; details: ErrorDetails | null }>(sql`
      select e.created_at, e.processing_time_ms, e.error_code, l.details
      from (${sameGroupAs(id)}) e join error_logs l on l.id = e.id
      order by e.created_at asc
    `);
    return {
      ...toGroup(group),
      attempts: attempts.map((attempt) => ({
        at: new Date(attempt.created_at),
        ms: attempt.processing_time_ms === null ? null : Number(attempt.processing_time_ms),
        errorCode: attempt.error_code,
        details: attempt.details,
      })),
    };
  },

  /** Resolves every open try in the group. Null when the error log is unknown. */
  async resolveGroup(id: string, adminId: string): Promise<number | null> {
    if (!isUuid(id)) return null;
    const [target] = await rows<{ id: string }>(sql`select id from error_logs where id = ${id}`);
    if (!target) return null;

    const resolved = await rows<{ id: string }>(sql`
      update error_logs set resolved = true, resolved_by = ${adminId}, resolved_at = now()
      where resolved = false and id in (select id from (${sameGroupAs(id)}) same)
      returning id
    `);
    return resolved.length;
  },
};
