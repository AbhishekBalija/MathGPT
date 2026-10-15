import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AllModelsFailedError } from "../src/services/ai/failover";
import { uniqueProblem } from "./support/problems";
import { fakeMathSolver } from "./support/test-app";
import { authedFetch, registerAdmin, registerVerifiedUser } from "./support/users";

let adminToken: string;

beforeAll(async () => {
  ({ accessToken: adminToken } = await registerAdmin());
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface FailedGroup {
  id: string;
  problem: string;
  tries: number;
  firstAt: string;
  lastAt: string;
  errorCode: string;
  student: { id: string; name: string } | null;
  workedLater: boolean;
  resolved: boolean;
}

function solve(accessToken: string, problem: string) {
  return authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem } });
}

// The next solves fail, like the AI timing out, then solving works again
function failNext(times: number) {
  const spy = vi.spyOn(fakeMathSolver, "solve");
  for (let i = 0; i < times; i++) spy.mockRejectedValueOnce(
      new AllModelsFailedError([
        { label: "gemini-2.5-flash", reason: "timed out after 25000ms" },
        { label: "backup", reason: "timed out after 25000ms" },
      ]),
    );
}

async function groups(status = "open"): Promise<{ groups: FailedGroup[]; problems: number; tries: number }> {
  const res = await authedFetch(adminToken, `/admin/failed?status=${status}`);
  expect(res.status).toBe(200);
  return res.json();
}

// Failures are logged in the background, so wait for the group to show up
async function groupFor(problem: string, status = "open", tries = 1): Promise<FailedGroup> {
  let found: FailedGroup | undefined;
  await vi.waitFor(async () => {
    found = (await groups(status)).groups.find((group) => group.problem === problem);
    expect(found?.tries).toBe(tries);
  });
  return found as FailedGroup;
}

describe("GET /admin/failed", () => {
  it("groups tries of one problem by one student, even with different spacing", async () => {
    const { accessToken } = await registerVerifiedUser();
    const problem = uniqueProblem("integrate x sin x");
    failNext(3);

    await solve(accessToken, problem);
    await solve(accessToken, `  ${problem.replace(" ", "   ")}\n`);
    await solve(accessToken, problem);

    const group = await groupFor(problem, "open", 3);
    expect(group).toMatchObject({ errorCode: "AI_TIMEOUT", workedLater: false, resolved: false });
    expect(group.student?.name).toBe("Test User");
    expect(new Date(group.firstAt).getTime()).toBeLessThanOrEqual(new Date(group.lastAt).getTime());

    const list = await groups();
    expect(list.problems).toBe(list.groups.length);
    expect(list.tries).toBeGreaterThanOrEqual(3);
  });

  it("says it worked later when the student solved it after failing", async () => {
    const { accessToken } = await registerVerifiedUser();
    // The fake answer is x = 2, so this one passes the code check and logs nothing more
    const problem = uniqueProblem("2x = 4");
    failNext(1);
    await solve(accessToken, problem);
    await groupFor(problem);

    expect((await solve(accessToken, problem)).status).toBe(200);

    expect((await groupFor(problem)).workedLater).toBe(true);
  });

  it("keeps a deleted student's failure, with no student", async () => {
    const student = await registerVerifiedUser();
    const studentId = (await (await authedFetch(student.accessToken, "/auth/me")).json()).user.id;
    const problem = uniqueProblem("integrate e^x sin x");
    failNext(1);
    await solve(student.accessToken, problem);
    await groupFor(problem);

    expect((await authedFetch(adminToken, `/admin/users/${studentId}`, { method: "DELETE" })).status).toBe(200);

    const group = await groupFor(problem);
    expect(group.student).toBeNull();
    const detail = await authedFetch(adminToken, `/admin/failed/${group.id}`);
    expect(detail.status).toBe(200);
    expect((await detail.json()).student).toBeNull();
  });
});

describe("deleted students", () => {
  it("keeps two deleted students' failures of one problem apart", async () => {
    const problem = uniqueProblem("integrate tan x");
    for (let i = 0; i < 2; i++) {
      const student = await registerVerifiedUser();
      const studentId = (await (await authedFetch(student.accessToken, "/auth/me")).json()).user.id;
      failNext(1);
      await solve(student.accessToken, problem);
      await groupFor(problem);
      await authedFetch(adminToken, `/admin/users/${studentId}`, { method: "DELETE" });
    }

    await vi.waitFor(async () => {
      const found = (await groups()).groups.filter((group) => group.problem === problem);
      expect(found.map((group) => group.tries)).toEqual([1, 1]);
    });
  });
});

describe("GET /admin/failed/:id and resolving", () => {
  it("shows every try, and resolving the group resolves all of them", async () => {
    const { accessToken } = await registerVerifiedUser();
    const problem = uniqueProblem("integrate ln x");
    failNext(3);
    for (let i = 0; i < 3; i++) await solve(accessToken, problem);
    const group = await groupFor(problem, "open", 3);

    const detail = await (await authedFetch(adminToken, `/admin/failed/${group.id}`)).json();
    expect(detail.attempts).toHaveLength(3);
    expect(detail.attempts[0]).toMatchObject({ errorCode: "AI_TIMEOUT" });
    expect(detail.attempts[0].details.fullMessage).toContain("gemini-2.5-flash: timed out");

    const res = await authedFetch(adminToken, `/admin/failed/${group.id}/resolve`, { method: "POST" });
    expect(await res.json()).toEqual({ resolved: 3 });
    expect((await groups()).groups.find((entry) => entry.problem === problem)).toBeUndefined();
    expect(await groupFor(problem, "resolved", 3)).toMatchObject({ resolved: true });
  });

  it("gives 404 for an unknown failure", async () => {
    const unknown = "00000000-0000-4000-8000-000000000000";
    expect((await authedFetch(adminToken, `/admin/failed/${unknown}`)).status).toBe(404);
    expect((await authedFetch(adminToken, "/admin/failed/not-an-id")).status).toBe(404);
    expect((await authedFetch(adminToken, `/admin/failed/${unknown}/resolve`, { method: "POST" })).status).toBe(404);
  });
});
