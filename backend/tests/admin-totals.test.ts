/**
 * Tests that compare admin totals before and after their own change.
 * Other files add users, solves and failures at the same time, so this
 * file runs on its own after all the others (see "test" in package.json).
 */

import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db/client";
import { FAKE_SOLVER_FAILURE } from "./support/fake-math-solver";
import { uniqueProblem } from "./support/problems";
import { authedFetch, registerAdmin, registerVerifiedUser } from "./support/users";

let adminToken: string;

beforeAll(async () => {
  ({ accessToken: adminToken } = await registerAdmin());
});

async function counts(): Promise<{ failedOpen: number; reportsBlocked: number; feedbackOpen: number }> {
  const res = await authedFetch(adminToken, "/admin/counts");
  expect(res.status).toBe(200);
  return res.json();
}

async function overview() {
  const res = await authedFetch(adminToken, "/admin/overview");
  expect(res.status).toBe(200);
  return res.json();
}

async function idOf(accessToken: string): Promise<string> {
  return (await (await authedFetch(accessToken, "/auth/me")).json()).user.id;
}

async function failuresOf(userId: string): Promise<number> {
  const result = await db.execute(sql`select count(*)::int as n from error_logs where user_id = ${userId}`);
  return Number(result.rows[0]?.n ?? 0);
}

function solve(accessToken: string, problem = uniqueProblem()) {
  return authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem } });
}

describe("GET /admin/counts", () => {
  it("counts failed problems, not tries: repeats by the same student are one", async () => {
    const { accessToken } = await registerVerifiedUser();
    const studentId = await idOf(accessToken);
    const before = await counts();
    const repeated = uniqueProblem(`integrate ${FAKE_SOLVER_FAILURE}`);

    await solve(accessToken, repeated);
    // The same problem again, with extra spaces and a pasted newline: still the same problem
    await solve(accessToken, `  ${repeated.replace(" ", "   ")}\n`);
    await solve(accessToken, uniqueProblem(`solve ${FAKE_SOLVER_FAILURE}`));
    // Failures are logged in the background
    await vi.waitFor(async () => expect(await failuresOf(studentId)).toBe(3));

    expect((await counts()).failedOpen - before.failedOpen).toBe(2);
  });

  it("counts open Feedback", async () => {
    const { accessToken } = await registerVerifiedUser();
    const before = await counts();

    await authedFetch(accessToken, "/api/feedback", { method: "POST", body: { kind: "bug", message: "The page froze" } });

    expect((await counts()).feedbackOpen - before.feedbackOpen).toBe(1);
  });
});

describe("GET /admin/overview", () => {
  it("leaves team accounts out of student and business numbers", async () => {
    const student = await registerVerifiedUser();
    await solve(student.accessToken);
    const before = await overview();

    const res = await authedFetch(adminToken, `/admin/users/${await idOf(student.accessToken)}/team`, {
      method: "PATCH",
      body: { isTeam: true },
    });
    expect(res.status).toBe(200);
    const after = await overview();

    expect(before.numbers.realStudents - after.numbers.realStudents).toBe(1);
    expect(after.numbers.teamStudents - before.numbers.teamStudents).toBe(1);
    expect(before.funnel.solved - after.funnel.solved).toBe(1);
  });
});

// Other files delete students (and so their solves) at the same time, which
// can make totals go down, so this check runs here, on its own
describe("statistics", () => {
  it("count Solutions, Analytics Events and tokens", async () => {
    const before = await (await authedFetch(adminToken, "/admin/token-stats")).json();
    const { accessToken } = await registerVerifiedUser();

    expect((await solve(accessToken, uniqueProblem())).status).toBe(200);

    const tokens = await (await authedFetch(adminToken, "/admin/token-stats")).json();
    // The fake solver reports 10 input and 20 output tokens. Other test files
    // solve in parallel, so totals can grow by more than this solve alone.
    expect(tokens.totalInputTokens - before.totalInputTokens).toBeGreaterThanOrEqual(10);
    expect(tokens.totalOutputTokens - before.totalOutputTokens).toBeGreaterThanOrEqual(20);
    expect(tokens.solutionCount - before.solutionCount).toBeGreaterThanOrEqual(1);

    const stats = await (await authedFetch(adminToken, "/admin/stats")).json();
    expect(stats.totalSolutions).toBeGreaterThanOrEqual(1);
    expect(stats.solutionsByType.algebra).toBeGreaterThanOrEqual(1);

    await vi.waitFor(async () => {
      const analytics = await (await authedFetch(adminToken, "/admin/analytics")).json();
      const saved = analytics.eventsByType.find(
        (e: { eventName: string }) => e.eventName === "solution_saved"
      );
      expect(saved?.count).toBeGreaterThanOrEqual(1);
    });
  });
});
