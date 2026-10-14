import { beforeAll, describe, expect, it, vi } from "vitest";
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

function solve(accessToken: string, problem: string) {
  return authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem } });
}

describe("GET /admin/counts", () => {
  it("counts failed problems, not tries: repeats by the same student are one", async () => {
    const before = await counts();
    const { accessToken } = await registerVerifiedUser();
    const repeated = uniqueProblem(`integrate ${FAKE_SOLVER_FAILURE}`);

    await solve(accessToken, repeated);
    // The same problem again, with extra spaces and a pasted newline: still the same problem
    await solve(accessToken, `  ${repeated.replace(" ", "   ")}\n`);
    await solve(accessToken, uniqueProblem(`solve ${FAKE_SOLVER_FAILURE}`));

    // Failures are logged in the background
    await vi.waitFor(async () => {
      expect((await counts()).failedOpen - before.failedOpen).toBe(2);
    });
  });

  it("counts open Feedback", async () => {
    const before = await counts();
    const { accessToken } = await registerVerifiedUser();

    await authedFetch(accessToken, "/api/feedback", { method: "POST", body: { kind: "bug", message: "The page froze" } });

    expect((await counts()).feedbackOpen - before.feedbackOpen).toBe(1);
  });
});
