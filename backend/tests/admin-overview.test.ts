import { beforeAll, describe, expect, it, vi } from "vitest";
import { istDay } from "../src/modules/admin/overview/ist";
import { uniqueProblem } from "./support/problems";
import { moveSolutionTo } from "./support/time-travel";
import { authedFetch, registerAdmin, registerVerifiedUser } from "./support/users";

let adminToken: string;

beforeAll(async () => {
  ({ accessToken: adminToken } = await registerAdmin());
});

interface Overview {
  status: { state: "fine" | "attention" | "down"; failingSince: string | null };
  numbers: Record<string, number>;
  solvesPerDay: Array<{ day: string; count: number }>;
  aiUsage: Record<string, number | string | null>;
  needsYou: Array<{ kind: string; id: string; title: string; subtitle: string; at: string }>;
  funnel: { signedUp: number; verified: number; solved: number; cameBack: number };
  topTopics: Array<{ problemType: string; count: number }>;
}

async function overview(): Promise<Overview> {
  const res = await authedFetch(adminToken, "/admin/overview");
  expect(res.status).toBe(200);
  return res.json();
}

async function idOf(accessToken: string): Promise<string> {
  return (await (await authedFetch(accessToken, "/auth/me")).json()).user.id;
}

function solve(accessToken: string, problem = uniqueProblem()) {
  return authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem } });
}

function markTeam(userId: string, isTeam: boolean) {
  return authedFetch(adminToken, `/admin/users/${userId}/team`, { method: "PATCH", body: { isTeam } });
}

describe("GET /admin/overview", () => {
  it("gives every number as a number, never NaN or null, even when parts are empty", async () => {
    const data = await overview();

    for (const value of Object.values(data.numbers)) expect(Number.isFinite(value)).toBe(true);
    for (const value of Object.values(data.funnel)) expect(Number.isFinite(value)).toBe(true);
    expect(data.solvesPerDay).toHaveLength(7);
    expect(data.solvesPerDay.at(-1)?.day).toBe(istDay(new Date()));
    expect(["fine", "attention", "down"]).toContain(data.status.state);
    expect(typeof data.aiUsage.resetsAt).toBe("string");
  });

  it("counts a solve at 00:30 India time on the India day", async () => {
    const student = await registerVerifiedUser();
    const solved = await (await solve(student.accessToken)).json();
    // 19:00 UTC yesterday is 00:30 today in India
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const before = (await overview()).solvesPerDay;

    await moveSolutionTo(solved.solution.id, `${yesterday}T19:00:00Z`);
    const after = (await overview()).solvesPerDay;

    const day = istDay(new Date(`${yesterday}T19:00:00Z`));
    const countOn = (days: Overview["solvesPerDay"], d: string) => days.find((entry) => entry.day === d)?.count ?? 0;
    // Moved off today (unless that is the same India day) and onto the right India day
    if (day !== istDay(new Date())) {
      expect(countOn(after, day) - countOn(before, day)).toBe(1);
    }
    expect(after.find((entry) => entry.day === day)).toBeDefined();
  });

  it("lists open failed problems in Needs you", async () => {
    const { accessToken } = await registerVerifiedUser();
    const problem = uniqueProblem("integrate FAKE_SOLVER_FAILURE");
    await solve(accessToken, problem);

    await vi.waitFor(async () => {
      const data = await overview();
      expect(data.status.state).not.toBe("fine");
      expect(data.needsYou).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "failed", title: problem })]));
    });
  });
});

describe("PATCH /admin/users/:id/team", () => {
  it("keeps Admins as team, and gives 404 for an unknown User", async () => {
    const admin = await registerAdmin();
    const adminId = await idOf(admin.accessToken);

    const res = await markTeam(adminId, false);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: adminId, isTeam: true });

    expect((await markTeam("00000000-0000-4000-8000-000000000000", true)).status).toBe(404);
    expect((await markTeam(adminId, "yes" as unknown as boolean)).status).toBe(400);
  });
});
