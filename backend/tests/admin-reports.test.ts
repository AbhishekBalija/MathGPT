import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/db/client";
import { solutionCache } from "../src/db/schema";
import { cacheKey } from "../src/modules/solver/cache/solution-cache";
import { uniqueProblem } from "./support/problems";
import { authedFetch, registerAdmin, registerVerifiedUser } from "./support/users";

let adminToken: string;

beforeAll(async () => {
  ({ accessToken: adminToken } = await registerAdmin());
});

async function solveAs(accessToken: string, problem: string) {
  const res = await authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem } });
  return res.json();
}

async function reportAs(accessToken: string, solutionId: string, reason?: string) {
  await authedFetch(accessToken, `/api/solutions/${solutionId}/report`, { method: "POST", body: { reason } });
}

async function listReports() {
  const res = await authedFetch(adminToken, "/admin/reports");
  expect(res.status).toBe(200);
  return (await res.json()).reports as Array<Record<string, unknown>>;
}

function unblock(reportId: string) {
  return authedFetch(adminToken, `/admin/reports/${reportId}/unblock`, { method: "POST" });
}

async function cacheStatusOf(problem: string) {
  const [entry] = await db
    .select()
    .from(solutionCache)
    .where(eq(solutionCache.key, cacheKey(problem, undefined, undefined)));
  return entry?.status;
}

// The fake AI answers "x = 2", so "nx = 2n" passes the code check and is shared
let counter = 700_000 + Math.floor(Math.random() * 100_000);
function sharedProblem(): string {
  counter += 1;
  return `${counter}x = ${counter * 2}`;
}

// Plain arithmetic is answered by code, with no AI and no cache entry
function instantProblem(): string {
  counter += 1;
  return `${counter} + 7`;
}

describe("GET /admin/reports", () => {
  it("lists reports newest first, with the problem, answer, reason and cache status", async () => {
    const student = await registerVerifiedUser();
    const problem = sharedProblem();
    const solved = await solveAs(student.accessToken, problem);
    await reportAs(student.accessToken, solved.solution.id, "Step 2 is wrong");

    // Other test files report at the same time, so find this test's own report
    const reports = await listReports();
    const newest = reports.find((report) => report.problemText === problem);
    // Newest first: it comes before every older report
    expect(reports.slice(1).every((report) => String(report.createdAt) <= String(reports[0]?.createdAt))).toBe(true);

    expect(newest).toMatchObject({
      problemText: problem,
      answerText: solved.solution.content.answer.latex,
      reason: "Step 2 is wrong",
      cacheStatus: "blocked",
    });
    expect(typeof newest?.id).toBe("string");
    expect(typeof newest?.createdAt).toBe("string");
  });

  it("shows no cache status for an instant answer, which is never cached", async () => {
    const student = await registerVerifiedUser();
    const problem = instantProblem();
    const solved = await solveAs(student.accessToken, problem);
    await reportAs(student.accessToken, solved.solution.id);

    const report = (await listReports()).find((r) => r.problemText === problem);

    expect(report).toBeDefined();
    expect(report?.cacheStatus ?? null).toBeNull();
  });
});

describe("POST /admin/reports/:id/unblock", () => {
  it("shares a code-checked answer again after a mistaken report", async () => {
    const problem = sharedProblem();
    const first = await registerVerifiedUser();
    const solved = await solveAs(first.accessToken, problem);
    await reportAs(first.accessToken, solved.solution.id);
    const report = (await listReports()).find((r) => r.problemText === problem);

    const res = await unblock(String(report?.id));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cacheStatus: "shared" });
    expect(await cacheStatusOf(problem)).toBe("shared");
    const next = await registerVerifiedUser();
    expect((await solveAs(next.accessToken, problem)).source).toBe("cache");
  });

  it("puts an answer that was never checked back to unchecked, so it is still not served", async () => {
    const student = await registerVerifiedUser();
    const problem = uniqueProblem();
    const solved = await solveAs(student.accessToken, problem);
    await reportAs(student.accessToken, solved.solution.id);
    const report = (await listReports()).find((r) => r.problemText === problem);

    const res = await unblock(String(report?.id));

    expect(await res.json()).toEqual({ cacheStatus: "unchecked" });
    expect(await cacheStatusOf(problem)).toBe("unchecked");
  });

  it("gives 409 when the report has no blocked answer to unblock", async () => {
    const student = await registerVerifiedUser();
    const problem = instantProblem();
    const solved = await solveAs(student.accessToken, problem);
    await reportAs(student.accessToken, solved.solution.id);
    const report = (await listReports()).find((r) => r.problemText === problem);

    const res = await unblock(String(report?.id));

    expect(res.status).toBe(409);
  });

  it("gives 404 for a report that does not exist", async () => {
    expect((await unblock("00000000-0000-4000-8000-000000000000")).status).toBe(404);
    expect((await unblock("not-an-id")).status).toBe(404);
  });
});

describe("GET /admin/reports/:id", () => {
  it("gives the report with the full solution, who sent it and whether code checked it", async () => {
    const student = await registerVerifiedUser();
    const problem = sharedProblem();
    const solved = await solveAs(student.accessToken, problem);
    await reportAs(student.accessToken, solved.solution.id, "Step 2 is wrong");
    const report = (await listReports()).find((entry) => entry.problemText === problem);

    const res = await authedFetch(adminToken, `/admin/reports/${report?.id}`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ problemText: problem, reason: "Step 2 is wrong", cacheStatus: "blocked", checkedByCode: true });
    expect(body.solution.answer.latex).toBe("x = 2");
    expect(body.student.name).toBe("Test User");
    expect(body.solvedAt).toEqual(expect.any(String));
  });

  it("gives 404 for an unknown report", async () => {
    expect((await authedFetch(adminToken, "/admin/reports/00000000-0000-4000-8000-000000000000")).status).toBe(404);
    expect((await authedFetch(adminToken, "/admin/reports/nope")).status).toBe(404);
  });
});
