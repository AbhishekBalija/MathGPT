import { eq, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "../src/db/client";
import { solutionCache, solutions } from "../src/db/schema";
import { answersMatch, cacheKey, normalize } from "../src/modules/solver/cache/solution-cache";
import { FAKE_MODEL, FAKE_SECOND_AGREES, FAKE_SECOND_MODEL } from "./support/fake-math-solver";
import { fakeMathSolver } from "./support/test-app";
import { authedFetch, registerVerifiedUser } from "./support/users";

async function solveAs(accessToken: string, body: Record<string, unknown>) {
  return authedFetch(accessToken, "/api/solve", { method: "POST", body });
}

// The fake AI always answers "x = 2", so "nx = 2n" passes the code check.
// A fresh n per test keeps tests from sharing cache entries.
let counter = 1000 + Math.floor(Math.random() * 100_000);
function checkableProblem(): string {
  counter += 1;
  return `${counter}x = ${counter * 2}`;
}

async function cacheRow(problem: string, method?: string) {
  const [row] = await db
    .select()
    .from(solutionCache)
    .where(eq(solutionCache.key, cacheKey(problem, undefined, method)));
  return row;
}

describe("cacheKey and normalize", () => {
  it("tidies spaces and the minus sign, but never letters", () => {
    expect(normalize("  2x  −  4 = 0 ")).toBe("2x - 4 = 0");
    expect(normalize("X + 1")).not.toBe(normalize("x + 1"));
  });

  it("gives the same key for the same problem written with extra spaces", () => {
    expect(cacheKey("2x = 4", undefined, undefined)).toBe(cacheKey(" 2x  =  4 ", undefined, undefined));
  });

  it("gives a new key for a different method, level or prompt version", () => {
    const base = cacheKey("2x = 4", undefined, undefined);
    expect(cacheKey("2x = 4", undefined, "elimination")).not.toBe(base);
    expect(cacheKey("2x = 4", "class9-10", undefined)).not.toBe(base);
    expect(cacheKey("2x = 4", undefined, undefined, "an-older-prompt")).not.toBe(base);
  });
});

describe("answersMatch", () => {
  it("ignores spacing and the order of roots", () => {
    expect(answersMatch("x = -2 \\text{ or } x = -3", "x=-3, x=-2")).toBe(true);
    expect(answersMatch("\\frac{1}{3}", "\\frac{1}{3}")).toBe(true);
    expect(answersMatch("x = 2", "x = 3")).toBe(false);
  });

  it("matches answers with the same value written differently", () => {
    // Real answers from Gemini and DeepSeek for the same integral
    expect(
      answersMatch("\\frac{1}{2}x - \\frac{1}{8}\\sin(4x+10) + C", "\\frac{x}{2} - \\frac{1}{8}\\sin(4x+10) + C")
    ).toBe(true);
    expect(answersMatch("x = -3 \\text{ or } x = -2", "x = -2, x = -3")).toBe(true);
    expect(answersMatch("\\frac{1}{3}", "0.333333333333")).toBe(true);
  });

  it("never matches answers that differ or cannot be read", () => {
    expect(answersMatch("49\\pi \\text{ cm}^2", "154 \\text{ cm}^2")).toBe(false);
    expect(answersMatch("x = -2", "x = -2 \\text{ or } x = -3")).toBe(false);
    expect(answersMatch("\\sin(x)", "\\cos(x)")).toBe(false);
    expect(answersMatch("some words", "other words")).toBe(false);
    expect(answersMatch("\\frac{1}{23}", "\\frac{12}{3}")).toBe(false);
  });
});

describe("shared solution cache", () => {
  it("shares a code-checked solution: the next student gets it with no AI call and no credit", async () => {
    const problem = checkableProblem();
    const first = await registerVerifiedUser();
    const firstBody = await (await solveAs(first.accessToken, { problem })).json();

    // Honest label, only because the code check passed
    expect(firstBody.solution.content.answer.check).toBe("Checked by putting the answer back in.");
    const row = await cacheRow(problem);
    expect(row).toMatchObject({ status: "shared", checkMethod: "code", checkedBy: { primary: FAKE_MODEL } });

    const second = await registerVerifiedUser();
    const solveSpy = vi.spyOn(fakeMathSolver, "solve");
    const res = await solveAs(second.accessToken, { problem: ` ${problem} ` });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe("cache");
    expect(body.solution.content).toEqual(firstBody.solution.content);
    expect(solveSpy).not.toHaveBeenCalled();
    solveSpy.mockRestore();

    const profile = await (await authedFetch(second.accessToken, "/api/profile")).json();
    expect(profile.dailyCredits).toMatchObject({ used: 0 });
    // Still in the second student's own History
    const history = await (await authedFetch(second.accessToken, "/api/history")).json();
    expect(history.history).toHaveLength(1);
    const [saved] = await db.select().from(solutions).where(eq(solutions.id, body.solution.id));
    expect(saved?.cacheKey).toBe(row?.key);
  });

  it("never shares an answer that fails the code check", async () => {
    // The fake answers "x = 2", which is wrong here
    const problem = `3x = ${9 + (counter++ % 7) * 3}`;
    const first = await registerVerifiedUser();
    const firstBody = await (await solveAs(first.accessToken, { problem })).json();

    expect(firstBody.solution.content.answer.check).toBeUndefined();
    expect(await cacheRow(problem)).toBeUndefined();

    const second = await registerVerifiedUser();
    const solveSpy = vi.spyOn(fakeMathSolver, "solve");
    const body = await (await solveAs(second.accessToken, { problem })).json();
    expect(body.source).toBe("ai");
    // A fresh solve: the first try and the retry after the failed check
    expect(solveSpy).toHaveBeenCalledTimes(2);
    solveSpy.mockRestore();
  });

  it("does not pay for a second model on the first ask", async () => {
    const problem = `2x = 4 and y ${FAKE_SECOND_AGREES} ${counter++}`;
    const opinionSpy = vi.spyOn(fakeMathSolver, "secondOpinion");
    const first = await registerVerifiedUser();
    const firstBody = await (await solveAs(first.accessToken, { problem })).json();

    // No label: the code could not check it
    expect(firstBody.solution.content.answer.check).toBeUndefined();
    // Give a background check a moment to start, if it were going to
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(opinionSpy).not.toHaveBeenCalled();
    opinionSpy.mockRestore();
    // Stored privately, ready for a second ask
    expect(await cacheRow(problem)).toMatchObject({ status: "unchecked", checkMethod: null });
  });

  it("asks a second model on the second ask, and shares the answer if it agrees", async () => {
    const problem = `2x = 4 and y ${FAKE_SECOND_AGREES} ${counter++}`;
    const opinionSpy = vi.spyOn(fakeMathSolver, "secondOpinion");
    await solveAs((await registerVerifiedUser()).accessToken, { problem });
    const secondBody = await (await solveAs((await registerVerifiedUser()).accessToken, { problem })).json();
    // The second student still got a fresh AI answer
    expect(secondBody.source).toBe("ai");

    // The second check runs after the response, so wait for it
    await vi.waitFor(async () => {
      expect(await cacheRow(problem)).toMatchObject({
        status: "shared",
        checkMethod: "second-model",
        checkedBy: { primary: FAKE_MODEL, second: FAKE_SECOND_MODEL },
      });
    });
    expect(opinionSpy).toHaveBeenCalledOnce();
    expect(opinionSpy).toHaveBeenCalledWith(problem, FAKE_MODEL);
    opinionSpy.mockRestore();

    // From the third ask on, no AI call at all
    const third = await (await solveAs((await registerVerifiedUser()).accessToken, { problem })).json();
    expect(third.source).toBe("cache");
    expect(third.solution.content).toEqual(secondBody.solution.content);
  });

  it("keeps an unchecked answer private when the second model disagrees", async () => {
    const problem = `2x = 4 and y ${counter++}`;
    const opinionSpy = vi.spyOn(fakeMathSolver, "secondOpinion");
    await solveAs((await registerVerifiedUser()).accessToken, { problem });
    await solveAs((await registerVerifiedUser()).accessToken, { problem });

    await vi.waitFor(() => expect(opinionSpy).toHaveBeenCalled());
    opinionSpy.mockRestore();
    // Give the background task a moment to finish writing, if it were going to
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await cacheRow(problem)).toMatchObject({ status: "unchecked", checkMethod: null });

    const third = await (await solveAs((await registerVerifiedUser()).accessToken, { problem })).json();
    expect(third.source).toBe("ai");
  });

  it("asks the AI again for the same problem with a different method", async () => {
    const problem = checkableProblem();
    const first = await registerVerifiedUser();
    await solveAs(first.accessToken, { problem });

    const second = await registerVerifiedUser();
    const solveSpy = vi.spyOn(fakeMathSolver, "solve");
    const body = await (await solveAs(second.accessToken, { problem, method: "balancing" })).json();
    expect(body.source).toBe("ai");
    expect(solveSpy).toHaveBeenCalledOnce();
    solveSpy.mockRestore();
  });

  it("stores nothing about the student", async () => {
    const result = await db.execute(
      sql`select column_name from information_schema.columns where table_name = 'solution_cache'`
    );
    const columns = result.rows.map((row) => String(row.column_name));
    expect(columns.sort()).toEqual(
      ["checked_by", "check_method", "content", "created_at", "hits", "key", "problem_type", "status"].sort()
    );
  });
});
