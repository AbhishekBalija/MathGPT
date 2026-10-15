/**
 * Admin Settings. Settings apply to the whole app, so this file runs on its
 * own after all the others (see "test" in package.json), and every test puts
 * the defaults back.
 */

import { sql } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db/client";
import { userRepository } from "../src/modules/users/user.repository";
import { OAuth2Client } from "google-auth-library";
import { uniqueProblem } from "./support/problems";
import { apiUrl } from "./support/test-app";
import { authedFetch, registerUser, registerVerifiedUser, uniqueEmail } from "./support/users";

let admin: { email: string; accessToken: string };

beforeAll(async () => {
  // Verified, so the admin can solve too
  admin = await registerVerifiedUser();
  await userRepository.setAdmin(await idOf(admin.accessToken), true);
});

// As if the student solved 5 problems earlier today (5 solves in a row would hit the per-minute limit)
async function usedFiveToday(accessToken: string) {
  await db.execute(sql`update users set daily_credits_used = 5, last_credit_reset = now() where id = ${await idOf(accessToken)}`);
}

afterEach(async () => {
  vi.restoreAllMocks();
  await db.execute(sql`delete from app_settings`);
  const { resetSettingsCache } = await import("../src/modules/settings/settings");
  resetSettingsCache();
});

function patch(body: unknown, token = admin.accessToken) {
  return authedFetch(token, "/admin/settings", { method: "PATCH", body });
}

function solve(accessToken: string) {
  return authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem: uniqueProblem("2x = 4") } });
}

async function idOf(accessToken: string): Promise<string> {
  return (await (await authedFetch(accessToken, "/auth/me")).json()).user.id;
}

describe("GET and PATCH /admin/settings", () => {
  it("starts with the defaults", async () => {
    const body = await (await authedFetch(admin.accessToken, "/admin/settings")).json();

    expect(body.settings).toEqual({
      dailyLimit: 5,
      signupsOpen: true,
      maintenance: { on: false, message: "Neo is taking a short break to get better. Please try again in a little while." },
    });
  });

  it("saves a change and logs who changed what, from and to", async () => {
    const res = await patch({ dailyLimit: 6 });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings.dailyLimit).toBe(6);
    expect(body.changes[0]).toMatchObject({ key: "dailyLimit", oldValue: 5, newValue: 6, by: { id: await idOf(admin.accessToken) } });
  });

  it("logs nothing when the value is the same", async () => {
    await patch({ dailyLimit: 7 });
    const before = (await (await authedFetch(admin.accessToken, "/admin/settings")).json()).changes.length;

    const body = await (await patch({ dailyLimit: 7, signupsOpen: true })).json();

    expect(body.changes.length).toBe(before);
  });

  it("refuses values out of range, and non-admins", async () => {
    expect((await patch({ dailyLimit: 0 })).status).toBe(400);
    expect((await patch({ dailyLimit: 51 })).status).toBe(400);
    expect((await patch({ maintenance: { on: true, message: "   " } })).status).toBe(400);
    expect((await patch({ maintenance: { on: true, message: "x".repeat(301) } })).status).toBe(400);
    const student = await registerVerifiedUser();
    expect((await patch({ dailyLimit: 6 }, student.accessToken)).status).toBe(403);
  });
});

describe("the daily limit setting", () => {
  it("lets a student who used 5 solve again once it is raised to 6", async () => {
    const { accessToken } = await registerVerifiedUser();
    await usedFiveToday(accessToken);
    const refused = await solve(accessToken);
    expect(refused.status).toBe(429);
    expect((await refused.json()).dailyLimit).toBe(5);

    await patch({ dailyLimit: 6 });

    expect((await solve(accessToken)).status).toBe(200);
    const profile = await (await authedFetch(accessToken, "/api/profile")).json();
    expect(profile.dailyCredits).toMatchObject({ used: 6, limit: 6, remaining: 0 });
  });

  it("never limits an admin", async () => {
    await patch({ dailyLimit: 1 });
    await usedFiveToday(admin.accessToken);
    expect((await solve(admin.accessToken)).status).toBe(200);

    const profile = await (await authedFetch(admin.accessToken, "/api/profile")).json();
    expect(profile.dailyCredits).toMatchObject({ limit: null, remaining: null });
  });
});

describe("maintenance mode", () => {
  it("pauses solving for students with the message, but not for team accounts or admins", async () => {
    const student = await registerVerifiedUser();
    const tester = await registerVerifiedUser();
    await userRepository.setTeam(await idOf(tester.accessToken), true);
    await patch({ maintenance: { on: true, message: "Back at 6 pm." } });

    const res = await solve(student.accessToken);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "MAINTENANCE", message: "Back at 6 pm." });
    expect((await solve(tester.accessToken)).status).toBe(200);
    expect((await solve(admin.accessToken)).status).toBe(200);
    // Saved solutions still open
    expect((await authedFetch(student.accessToken, "/api/history")).status).toBe(200);
  });
});

describe("pausing sign-ups", () => {
  it("refuses new email accounts, but lets existing students log in", async () => {
    const existing = await registerUser();
    await patch({ signupsOpen: false });

    const res = await fetch(apiUrl("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail(), password: "Test123!", name: "New Student" }),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("SIGNUPS_PAUSED");

    const login = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: existing.email, password: "Test123!" }),
    });
    expect(login.status).toBe(200);
  });

  it("refuses a new Google account, but not an existing one", async () => {
    // Google's check of the sign-in token, stood in for: the token is the email
    vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockImplementation((async (options: { idToken: string }) => ({
      getPayload: () => ({ sub: `google-${options.idToken}`, email: options.idToken, email_verified: true, name: "Google Student" }),
    })) as unknown as OAuth2Client["verifyIdToken"]);
    const google = (email: string) =>
      fetch(apiUrl("/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: email }),
      });
    const returning = uniqueEmail();
    expect((await google(returning)).status).toBe(200);
    await patch({ signupsOpen: false });

    const fresh = await google(uniqueEmail());
    expect(fresh.status).toBe(403);
    expect((await fresh.json()).code).toBe("SIGNUPS_PAUSED");
    expect((await google(returning)).status).toBe(200);
  });
});

describe("GET /api/app-status", () => {
  it("tells anyone, without a login, about maintenance and sign-ups", async () => {
    await patch({ signupsOpen: false, maintenance: { on: true, message: "Back soon." } });

    const res = await fetch(apiUrl("/api/app-status"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ maintenance: { on: true, message: "Back soon." }, signupsOpen: false });
  });
});

describe("settings on the Health report", () => {
  it("lists the current settings and the newest changes, without who made them", async () => {
    await patch({ dailyLimit: 8 });

    const health = await (await authedFetch(admin.accessToken, "/admin/health")).json();

    expect(health.live.settings.current.dailyLimit).toBe(8);
    expect(health.live.settings.recentChanges[0]).toMatchObject({ key: "dailyLimit", oldValue: 5, newValue: 8 });
    expect(JSON.stringify(health.live.settings)).not.toContain(admin.email);
    expect(health.live.settings.recentChanges[0].by).toBeUndefined();
  });
});
