/**
 * The shared solution cache: when two students ask the same problem, the
 * second one gets the first one's solution with no AI call and no Credit.
 *
 * A solution is only served once its answer passed an independent check
 * (code, or a second model from a different maker). Until then it is stored
 * as "unchecked" and never served. A reported solution is "blocked" for good.
 * Nothing about the student is stored here.
 */

import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db/client";
import { solutionCache as cacheTable, type CheckMethod } from "../../../db/schema";
import { PROMPT_VERSION } from "../../../services/ai/prompts";
import type { ProblemType } from "../../../types/solve.types";
import { solutionV2Schema, type SolutionV2Content } from "../../solutions/solution-v2.schema";
import { sameAnswerValue } from "../verify/verify-answer";

/**
 * Trims, collapses whitespace and turns the "−" minus sign into "-". Never
 * changes letters, so "X" and "x" stay different problems.
 */
export function normalize(problem: string): string {
  return problem.trim().replace(/\s+/g, " ").replace(/−/g, "-");
}

export function cacheKey(
  problem: string,
  level: string | undefined,
  method: string | undefined,
  promptVersion: string = PROMPT_VERSION
): string {
  const parts = [promptVersion, normalize(problem), level ?? "", method ?? ""];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

// An answer as plain comparable text: no spaces, no \left \right or
// spacing commands, lower case, and with several roots in a fixed order
function comparableAnswer(answer: string): string {
  const tidy = answer
    .replace(/\\left|\\right|\\displaystyle|\\[,;:! ]/g, "")
    .replace(/\\text\{\s*(or|and)\s*\}/gi, ",")
    .replace(/\s+/g, "")
    // Braces become brackets, never vanish: \frac{1}{23} and \frac{12}{3} must differ
    .replace(/\\?\{/g, "(")
    .replace(/\\?\}/g, ")")
    .replace(/\.$/, "")
    .toLowerCase();
  return tidy.split(/,|;/).filter(Boolean).sort().join(",");
}

/**
 * True when two final answers say the same thing: the same text after
 * tidying, or the same value (so x/2 matches \frac{1}{2}x).
 */
export function answersMatch(a: string, b: string): boolean {
  return comparableAnswer(a) === comparableAnswer(b) || sameAnswerValue(a, b);
}

export interface CachedSolution {
  content: SolutionV2Content;
  problemType: ProblemType;
}

export const solutionCache = {
  /** A shared entry, or null. Counts the hit. */
  async get(key: string): Promise<CachedSolution | null> {
    const [row] = await db
      .update(cacheTable)
      .set({ hits: sql`${cacheTable.hits} + 1` })
      .where(and(eq(cacheTable.key, key), eq(cacheTable.status, "shared")))
      .returning({ content: cacheTable.content, problemType: cacheTable.problemType });
    if (!row) {
      return null;
    }
    // Re-checked on the way out, so a bad row can never reach a student
    const content = solutionV2Schema.safeParse(row.content);
    return content.success ? { content: content.data, problemType: row.problemType } : null;
  },

  /**
   * Stores a solution. Does nothing if the key is already there, so a
   * blocked entry stays blocked and a shared one is not replaced.
   */
  async put(
    key: string,
    entry: CachedSolution & {
      status: "unchecked" | "shared";
      checkMethod?: CheckMethod;
      checkedBy: { primary?: string; second?: string };
    }
  ): Promise<void> {
    await db
      .insert(cacheTable)
      .values({
        key,
        content: solutionV2Schema.parse(entry.content),
        problemType: entry.problemType,
        status: entry.status,
        checkMethod: entry.checkMethod ?? null,
        checkedBy: entry.checkedBy,
      })
      .onConflictDoNothing({ target: cacheTable.key });
  },

  /** A student reported it: never serve it again, and never re-share it. */
  async block(key: string): Promise<void> {
    await db.update(cacheTable).set({ status: "blocked" }).where(eq(cacheTable.key, key));
  },

  /** A second model agreed: start serving an unchecked entry. */
  async shareAfterSecondCheck(key: string, checkedBy: { primary?: string; second: string }): Promise<void> {
    await db
      .update(cacheTable)
      .set({ status: "shared", checkMethod: "second-model", checkedBy })
      .where(and(eq(cacheTable.key, key), eq(cacheTable.status, "unchecked")));
  },
};
