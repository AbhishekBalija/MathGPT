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

async function idOf(accessToken: string): Promise<string> {
  return (await (await authedFetch(accessToken, "/auth/me")).json()).user.id;
}

async function solve(accessToken: string, problem: string) {
  return (await authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem } })).json();
}

async function student(id: string) {
  const res = await authedFetch(adminToken, `/admin/students/${id}`);
  expect(res.status).toBe(200);
  return res.json();
}

describe("GET /admin/students/:id", () => {
  it("counts what the student did and lists it newest first", async () => {
    const { accessToken, email } = await registerVerifiedUser();
    const id = await idOf(accessToken);
    const solved = await solve(accessToken, uniqueProblem("2x = 4"));
    await solve(accessToken, uniqueProblem("2x = 4"));
    vi.spyOn(fakeMathSolver, "solve").mockRejectedValueOnce(new AllModelsFailedError([{ label: "gemini", reason: "timed out" }]));
    await solve(accessToken, uniqueProblem("2x = 4"));
    await authedFetch(accessToken, `/api/solutions/${solved.solution.id}/report`, { method: "POST", body: {} });

    // The failure is logged in the background
    await vi.waitFor(async () => expect((await student(id)).failed).toBe(1));
    const body = await student(id);

    expect(body).toMatchObject({
      id,
      email,
      name: "Test User",
      provider: "email",
      isAdmin: false,
      isTeam: false,
      solves: 2,
      failed: 1,
      reports: 1,
      usedToday: 2,
      dailyLimit: 5,
    });
    expect(body.history.map((item: { kind: string }) => item.kind).sort()).toEqual(["failed", "joined", "reported", "solved", "solved"]);
    const times = body.history.map((item: { at: string }) => new Date(item.at).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(body.history.at(-1)).toMatchObject({ kind: "joined", title: "Joined with email" });
  });

  it("gives 404 for an unknown student", async () => {
    expect((await authedFetch(adminToken, "/admin/students/00000000-0000-4000-8000-000000000000")).status).toBe(404);
    expect((await authedFetch(adminToken, "/admin/students/nope")).status).toBe(404);
  });
});

describe("GET /admin/users", () => {
  it("gives each student's solves, last solve and team flag", async () => {
    const { accessToken, email } = await registerVerifiedUser();
    await solve(accessToken, uniqueProblem("2x = 4"));

    const res = await authedFetch(adminToken, `/admin/users?search=${encodeURIComponent(email)}`);
    const [user] = (await res.json()).users;

    expect(user).toMatchObject({ email, isTeam: false, solves: 1 });
    expect(user.lastSolvedAt).toEqual(expect.any(String));
  });
});

describe("GET /admin/analytics", () => {
  it("gives the newest events of every kind, or of one kind with ?event=", async () => {
    const { accessToken } = await registerVerifiedUser();
    await solve(accessToken, uniqueProblem("2x = 4"));

    await vi.waitFor(async () => {
      const saved = await (await authedFetch(adminToken, "/admin/analytics?event=solution_saved")).json();
      expect(saved.recentEvents.length).toBeGreaterThan(0);
      expect(saved.recentEvents.every((event: { eventName: string }) => event.eventName === "solution_saved")).toBe(true);
    });
    const none = await (await authedFetch(adminToken, "/admin/analytics?event=no_such_event")).json();
    expect(none.recentEvents).toEqual([]);
    const all = await authedFetch(adminToken, "/admin/analytics?event=bad%20name!");
    expect(all.status).toBe(200);
  });
});
