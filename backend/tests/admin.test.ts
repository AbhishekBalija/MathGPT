import { beforeAll, describe, expect, it, vi } from "vitest";
import { FAKE_SOLVER_ERROR_MESSAGE, FAKE_SOLVER_FAILURE } from "./support/fake-math-solver";
import { PROMPT_VERSION } from "../src/services/ai/prompts";
import { apiUrl } from "./support/test-app";
import {
  authedFetch,
  registerAdmin,
  registerUser,
  registerVerifiedUser,
} from "./support/users";
import { uniqueProblem } from "./support/problems";

let adminToken: string;

beforeAll(async () => {
  ({ accessToken: adminToken } = await registerAdmin());
});

async function userIdOf(accessToken: string): Promise<string> {
  const res = await authedFetch(accessToken, "/auth/me");
  return (await res.json()).user.id;
}

function solve(accessToken: string, problem: string) {
  return authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem } });
}

const ADMIN_ENDPOINTS: Array<[string, string]> = [
  ["GET", "/admin/stats"],
  ["GET", "/admin/token-stats"],
  ["GET", "/admin/analytics"],
  ["GET", "/admin/errors"],
  ["PATCH", "/admin/errors/00000000-0000-4000-8000-000000000000/resolve"],
  ["GET", "/admin/users"],
  ["GET", "/admin/reports"],
  ["GET", "/admin/feedback"],
  ["PATCH", "/admin/feedback/00000000-0000-4000-8000-000000000000/done"],
  ["POST", "/admin/reports/00000000-0000-4000-8000-000000000000/unblock"],
  ["PUT", "/admin/users/update-role"],
  ["PATCH", "/admin/users/00000000-0000-4000-8000-000000000000/role"],
  ["DELETE", "/admin/users/00000000-0000-4000-8000-000000000000"],
];

describe("every admin endpoint", () => {
  it.each(ADMIN_ENDPOINTS)("%s %s needs a login (401)", async (method, path) => {
    const res = await fetch(apiUrl(path), { method });

    expect(res.status).toBe(401);
  });

  it.each(ADMIN_ENDPOINTS)("%s %s refuses non-Admins (403)", async (method, path) => {
    const { accessToken } = await registerUser();

    const res = await authedFetch(accessToken, path, {
      method,
      body: method === "GET" || method === "DELETE" ? undefined : { isAdmin: true },
    });

    expect(res.status).toBe(403);
  });
});

describe("Admin Passcode (removed, #20)", () => {
  it("no longer exists, so Admins go straight to the dashboard", async () => {
    const res = await authedFetch(adminToken, "/admin/verify-passcode", {
      method: "POST",
      body: { passcode: "anything" },
    });

    expect(res.status).toBe(404);
  });
});

describe("Error Logs", () => {
  it("record a failed solve with its Problem text, filter by code and User, and resolve", async () => {
    const { accessToken } = await registerVerifiedUser();
    const userId = await userIdOf(accessToken);
    const problem = `integrate ${FAKE_SOLVER_FAILURE} dx`;

    expect((await solve(accessToken, problem)).status).toBe(500);

    // The Error Log is written in the background
    let errorId = "";
    await vi.waitFor(async () => {
      const res = await authedFetch(adminToken, `/admin/errors?userId=${userId}`);
      const { errors } = await res.json();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ problemText: problem, userId, resolved: false });
      errorId = errors[0].id;
    });

    // The fake solver throws a plain Error, which is not blamed on the AI
    const byCode = await authedFetch(adminToken, "/admin/errors?errorCode=UNKNOWN_ERROR");
    expect((await byCode.json()).errors.map((e: { id: string }) => e.id)).toContain(errorId);

    const resolve = await authedFetch(adminToken, `/admin/errors/${errorId}/resolve`, {
      method: "PATCH",
    });
    expect(resolve.status).toBe(200);
    const first = (await resolve.json()).error;
    expect(first).toMatchObject({ id: errorId, resolved: true });

    // Resolving again changes nothing: the first resolver and time are kept
    const again = await authedFetch(adminToken, `/admin/errors/${errorId}/resolve`, {
      method: "PATCH",
    });
    expect(again.status).toBe(200);
    expect((await again.json()).error).toMatchObject({
      resolvedBy: first.resolvedBy,
      resolvedAt: first.resolvedAt,
    });

    const afterResolve = await authedFetch(adminToken, `/admin/errors?userId=${userId}`);
    expect((await afterResolve.json()).errors).toEqual([]);
    const withResolved = await authedFetch(
      adminToken,
      `/admin/errors?userId=${userId}&includeResolved=true`
    );
    expect((await withResolved.json()).errors).toHaveLength(1);
  });

  it("keeps the whole problem (up to 2,000 characters), the error code and what failed", async () => {
    const { accessToken } = await registerVerifiedUser();
    const userId = await userIdOf(accessToken);
    // The longest problem a student can send (2,000 characters), with newlines, like a pasted worksheet
    const problem = `${FAKE_SOLVER_FAILURE} ${"∫ x sin x dx\n".repeat(200)}`.slice(0, 2000);

    expect((await solve(accessToken, problem)).status).toBe(500);

    await vi.waitFor(async () => {
      const { errors } = await (await authedFetch(adminToken, `/admin/errors?userId=${userId}`)).json();
      expect(errors).toHaveLength(1);
      expect(errors[0].problemText).toBe(problem);
      expect(errors[0].problemText).toHaveLength(2000);
      expect(errors[0].errorCode).toBe("UNKNOWN_ERROR");
      expect(errors[0].details).toEqual({
        attempts: [{ model: "unknown", error: FAKE_SOLVER_ERROR_MESSAGE }],
        promptVersion: PROMPT_VERSION,
        fullMessage: FAKE_SOLVER_ERROR_MESSAGE,
      });
    });
  });

  it("returns 404 when resolving an id that is not a UUID", async () => {
    const res = await authedFetch(adminToken, "/admin/errors/not-an-id/resolve", {
      method: "PATCH",
    });

    expect(res.status).toBe(404);
  });
});

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

describe("user management", () => {
  it("never lets an Admin delete themselves", async () => {
    const id = await userIdOf(adminToken);

    const res = await authedFetch(adminToken, `/admin/users/${id}`, { method: "DELETE" });

    expect(res.status).toBe(403);
  });

  it("treats regex-like characters in a search as plain text", async () => {
    const res = await authedFetch(adminToken, `/admin/users?search=${encodeURIComponent(".*")}`);

    expect(res.status).toBe(200);
    expect((await res.json()).users).toEqual([]);
  });
});
