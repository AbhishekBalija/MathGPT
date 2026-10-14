import { describe, expect, it } from "vitest";
import { FAKE_TURNSTILE_FAIL } from "./support/fake-human-check";
import { randomIp } from "./support/network";
import { apiUrl } from "./support/test-app";
import { TEST_PASSWORD, registerVerifiedUser, uniqueEmail } from "./support/users";

function signUp(body: Record<string, unknown>, ip = randomIp()) {
  return fetch(apiUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
    body: JSON.stringify({ password: TEST_PASSWORD, name: "Asha", ...body }),
  });
}

describe("sign-up abuse guards", () => {
  it("turns away a disposable email address", async () => {
    const res = await signUp({ email: `user-${Date.now()}@mailinator.com` });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Please use a school or personal email address.");
  });

  it("turns away a failed robot check", async () => {
    const res = await signUp({ email: uniqueEmail(), turnstileToken: FAKE_TURNSTILE_FAIL });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Please confirm you're not a robot and try again.");
  });

  it("signs up when the robot check passes", async () => {
    const res = await signUp({ email: uniqueEmail(), turnstileToken: "a-passing-token" });

    expect(res.status).toBe(200);
  });
});

describe("solving limit per IP", () => {
  it("allows 100 solves an hour from one IP across accounts, then refuses", async () => {
    const ip = randomIp();
    const solveFrom = (accessToken: string, n: number) =>
      fetch(apiUrl("/api/solve"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Forwarded-For": ip,
        },
        // Plain arithmetic: answered instantly, no AI and no Credit
        body: JSON.stringify({ problem: `${n} + 1` }),
      });

    // Each account may solve 5 a minute, so 20 accounts make 100 solves
    let solved = 0;
    for (let account = 0; account < 21; account++) {
      const { accessToken } = await registerVerifiedUser();
      for (let i = 0; i < 5 && solved < 101; i++) {
        const res = await solveFrom(accessToken, solved);
        solved += 1;
        if (solved <= 100) {
          expect(res.status).toBe(200);
        } else {
          expect(res.status).toBe(429);
          expect((await res.json()).code).toBe("RATE_LIMITED");
        }
      }
      if (solved > 100) break;
    }
    expect(solved).toBe(101);
  }, 120_000);
});
