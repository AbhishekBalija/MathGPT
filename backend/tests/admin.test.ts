import { beforeAll, describe, expect, it, vi } from "vitest";
import { FAKE_SOLVER_FAILURE } from "./support/fake-math-solver";
import { apiUrl } from "./support/test-app";
import {
  authedFetch,
  registerAdmin,
  registerUser,
  registerVerifiedUser,
} from "./support/users";

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

    const byCode = await authedFetch(adminToken, "/admin/errors?errorCode=Error");
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

    expect((await solve(accessToken, "2x = 4")).status).toBe(200);

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
