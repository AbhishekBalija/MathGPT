/**
 * The daily free limit follows the India day: a fresh 5 at midnight IST,
 * not at midnight UTC (05:30 IST). The test app runs in this process, so
 * faking Date moves the server's clock too.
 */

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "../src/db/client";
import { uniqueProblem } from "./support/problems";
import { authedFetch, registerVerifiedUser } from "./support/users";

afterEach(() => {
  vi.useRealTimers();
});

async function usedAllFiveAt(accessToken: string, at: string) {
  const id = (await (await authedFetch(accessToken, "/auth/me")).json()).user.id;
  await db.execute(sql`update users set daily_credits_used = 5, last_credit_reset = ${at}::timestamptz where id = ${id}`);
}

// A moment before the real now, so the student's token is still valid
const JUST_AFTER_MIDNIGHT_IST = "2026-10-14T19:00:00Z"; // 00:30 IST on 15 Oct
const LATE_EVENING_IST = "2026-10-14T18:00:00Z"; // 23:30 IST on 14 Oct, the same UTC day
const EARLY_MORNING_IST = "2026-10-14T21:00:00Z"; // 02:30 IST on 15 Oct

describe("daily free limit, India day", () => {
  it("gives a fresh 5 just after midnight India time", async () => {
    const { accessToken } = await registerVerifiedUser();
    await usedAllFiveAt(accessToken, LATE_EVENING_IST);
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(JUST_AFTER_MIDNIGHT_IST) });

    const profile = await (await authedFetch(accessToken, "/api/profile")).json();
    const res = await authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem: uniqueProblem("2x = 4") } });

    expect(profile.dailyCredits).toMatchObject({ used: 0, remaining: 5 });
    expect(res.status).toBe(200);
  });

  it("keeps the limit for the rest of the same India day", async () => {
    const { accessToken } = await registerVerifiedUser();
    await usedAllFiveAt(accessToken, JUST_AFTER_MIDNIGHT_IST);
    // 06:30 IST on 15 Oct: the same India day, but the next UTC date
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-15T01:00:00Z") });

    const res = await authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem: uniqueProblem("2x = 4") } });

    expect(res.status).toBe(429);
  });

  it("says the limit resets at the next midnight India time", async () => {
    const { accessToken } = await registerVerifiedUser();
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(EARLY_MORNING_IST) });

    const profile = await (await authedFetch(accessToken, "/api/profile")).json();

    // Midnight IST on 16 Oct is 18:30 UTC on 15 Oct
    expect(profile.dailyCredits.resetsAt).toBe("2026-10-15T18:30:00.000Z");
  });
});
