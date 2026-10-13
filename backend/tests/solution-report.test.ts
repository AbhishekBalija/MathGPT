import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../src/db/client";
import { solutionCache, solutionReports } from "../src/db/schema";
import { cacheKey } from "../src/modules/solver/cache/solution-cache";
import { uniqueProblem } from "./support/problems";
import { authedFetch, registerVerifiedUser } from "./support/users";

async function solveAs(accessToken: string, problem: string) {
  const res = await authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem } });
  return res.json();
}

async function report(accessToken: string, solutionId: string, body: Record<string, unknown> = {}) {
  return authedFetch(accessToken, `/api/solutions/${solutionId}/report`, { method: "POST", body });
}

// The fake AI answers "x = 2", so "nx = 2n" passes the code check and is shared
let counter = 500_000 + Math.floor(Math.random() * 100_000);
function sharedProblem(): string {
  counter += 1;
  return `${counter}x = ${counter * 2}`;
}

describe("POST /api/solutions/:id/report", () => {
  it("blocks the shared solution, so the next student gets a fresh AI solve", async () => {
    const problem = sharedProblem();
    const first = await registerVerifiedUser();
    const firstSolve = await solveAs(first.accessToken, problem);
    // Shared: the next student is served from the cache
    const second = await registerVerifiedUser();
    expect((await solveAs(second.accessToken, problem)).source).toBe("cache");

    const res = await report(first.accessToken, firstSolve.solution.id, { reason: "Step 2 is wrong" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const [entry] = await db
      .select()
      .from(solutionCache)
      .where(eq(solutionCache.key, cacheKey(problem, undefined, undefined)));
    expect(entry?.status).toBe("blocked");

    const third = await registerVerifiedUser();
    expect((await solveAs(third.accessToken, problem)).source).toBe("ai");
    // And it is never shared again, even after a new solve passes the check
    const fourth = await registerVerifiedUser();
    expect((await solveAs(fourth.accessToken, problem)).source).toBe("ai");
  });

  it("also blocks the entry when the report comes from a student it was served to", async () => {
    const problem = sharedProblem();
    const first = await registerVerifiedUser();
    await solveAs(first.accessToken, problem);
    const second = await registerVerifiedUser();
    const served = await solveAs(second.accessToken, problem);
    expect(served.source).toBe("cache");

    expect((await report(second.accessToken, served.solution.id)).status).toBe(200);

    const third = await registerVerifiedUser();
    expect((await solveAs(third.accessToken, problem)).source).toBe("ai");
  });

  it("saves the report with its reason", async () => {
    const student = await registerVerifiedUser();
    const solved = await solveAs(student.accessToken, uniqueProblem());

    await report(student.accessToken, solved.solution.id, { reason: "The answer should be 3" });

    const rows = await db
      .select()
      .from(solutionReports)
      .where(eq(solutionReports.solutionId, solved.solution.id));
    const me = await (await authedFetch(student.accessToken, "/auth/me")).json();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: me.user.id, reason: "The answer should be 3" });
  });

  it("works without a reason", async () => {
    const student = await registerVerifiedUser();
    const solved = await solveAs(student.accessToken, uniqueProblem());

    expect((await report(student.accessToken, solved.solution.id)).status).toBe(200);
  });

  it("gives 404 for someone else's solution, without saying it exists", async () => {
    const owner = await registerVerifiedUser();
    const solved = await solveAs(owner.accessToken, uniqueProblem());
    const stranger = await registerVerifiedUser();

    const res = await report(stranger.accessToken, solved.solution.id);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Solution not found" });
  });

  it("gives 404 for an id that is not a solution id", async () => {
    const student = await registerVerifiedUser();
    expect((await report(student.accessToken, "not-an-id")).status).toBe(404);
  });

  it("rejects a reason over 500 characters", async () => {
    const student = await registerVerifiedUser();
    const solved = await solveAs(student.accessToken, uniqueProblem());

    const res = await report(student.accessToken, solved.solution.id, { reason: "x".repeat(501) });

    expect(res.status).toBe(400);
  });

  it("needs a logged-in user", async () => {
    const res = await fetch(`${process.env.TEST_API_URL}/api/solutions/00000000-0000-0000-0000-000000000000/report`, {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });
});
