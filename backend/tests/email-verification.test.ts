import { describe, expect, it, vi } from "vitest";
import { fakeEmailSender } from "./support/test-app";
import { expireVerificationCode, moveRateLimitWindowsBack } from "./support/time-travel";
import {
  authedFetch,
  latestVerificationCode,
  registerUser,
  registerVerifiedUser,
} from "./support/users";

function solve(accessToken: string) {
  return authedFetch(accessToken, "/api/solve", {
    method: "POST",
    body: { problem: "2x = 4" },
  });
}

describe("email verification", () => {
  it("lets a User solve after entering the code from their email", async () => {
    const { email, accessToken } = await registerUser();
    const code = await latestVerificationCode(email);

    const verify = await authedFetch(accessToken, "/auth/verify-email", {
      method: "POST",
      body: { code },
    });

    expect(verify.status).toBe(200);
    expect(await verify.json()).toEqual({ emailVerified: true });
    const me = await authedFetch(accessToken, "/auth/me");
    expect((await me.json()).user.emailVerified).toBe(true);
    expect((await solve(accessToken)).status).toBe(200);
  });

  it("stops an unverified User from solving, but not from their profile and History", async () => {
    const { accessToken } = await registerUser();

    const res = await solve(accessToken);

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    expect((await authedFetch(accessToken, "/api/profile")).status).toBe(200);
    expect((await authedFetch(accessToken, "/api/history")).status).toBe(200);
  });
});

function verify(accessToken: string, code: string) {
  return authedFetch(accessToken, "/auth/verify-email", {
    method: "POST",
    body: { code },
  });
}

function resend(accessToken: string) {
  return authedFetch(accessToken, "/auth/resend-verification", { method: "POST" });
}

// A 6-digit code guaranteed to differ from the real one
function wrongCodeFor(code: string): string {
  return code === "000000" ? "111111" : "000000";
}

describe("wrong and expired codes", () => {
  it("rejects a wrong code", async () => {
    const { email, accessToken } = await registerUser();
    const code = await latestVerificationCode(email);

    const res = await verify(accessToken, wrongCodeFor(code));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/not correct/);
  });

  it("rejects an expired code", async () => {
    const { email, accessToken } = await registerUser();
    const code = await latestVerificationCode(email);
    await expireVerificationCode(email);

    const res = await verify(accessToken, code);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/expired/);
  });

  it("refuses even the right code after 5 wrong attempts", async () => {
    const { email, accessToken } = await registerUser();
    const code = await latestVerificationCode(email);
    for (let attempt = 0; attempt < 5; attempt++) {
      await verify(accessToken, wrongCodeFor(code));
    }

    const res = await verify(accessToken, code);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too many wrong attempts/i);
  });

  it("never lets parallel guesses go past 5 attempts", async () => {
    const { email, accessToken } = await registerUser();
    const code = await latestVerificationCode(email);

    await Promise.all(
      Array.from({ length: 10 }, () => verify(accessToken, wrongCodeFor(code)))
    );
    const res = await verify(accessToken, code);

    expect(res.status).toBe(400);
  });

  it("accepts a new code after the old one was used up", async () => {
    const { email, accessToken } = await registerUser();
    const oldCode = await latestVerificationCode(email);
    for (let attempt = 0; attempt < 5; attempt++) {
      await verify(accessToken, wrongCodeFor(oldCode));
    }

    expect((await resend(accessToken)).status).toBe(200);
    await vi.waitFor(async () => {
      expect(await latestVerificationCode(email)).not.toBe(oldCode);
    });
    const newCode = await latestVerificationCode(email);

    expect((await verify(accessToken, newCode)).status).toBe(200);
  });
});

describe("requesting a new code", () => {
  it("allows one new code per minute", async () => {
    const { accessToken } = await registerUser();

    expect((await resend(accessToken)).status).toBe(200);
    const second = await resend(accessToken);

    expect(second.status).toBe(429);
    const body = await second.json();
    expect(body).toMatchObject({ code: "RATE_LIMITED" });
    expect(body.retryAfter).toBeGreaterThan(0);
    expect(body.retryAfter).toBeLessThanOrEqual(60);
  });

  it("allows at most 5 new codes per hour", async () => {
    const { email, accessToken } = await registerUser();
    for (let request = 0; request < 5; request++) {
      expect((await resend(accessToken)).status).toBe(200);
      // Skip past the one-minute window, but stay inside the hour
      await moveRateLimitWindowsBack(email, 61);
    }

    const sixth = await resend(accessToken);

    expect(sixth.status).toBe(429);
    expect((await sixth.json()).code).toBe("RATE_LIMITED");
  });

  it("refuses when the email is already verified", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await resend(accessToken);

    expect(res.status).toBe(400);
  });
});

describe("welcome email", () => {
  it("arrives once, after verification, not at sign-up", async () => {
    const { email, accessToken } = await registerUser();
    const code = await latestVerificationCode(email);
    const welcomes = () =>
      fakeEmailSender.emailsTo(email).filter((sent) => sent.subject.includes("Welcome"));
    expect(welcomes()).toHaveLength(0);

    await verify(accessToken, code);
    await verify(accessToken, code);

    await vi.waitFor(() => expect(welcomes()).toHaveLength(1));
  });
});
