import { describe, expect, it } from "vitest";
import { randomIp } from "./support/network";
import { apiUrl } from "./support/test-app";
import {
  TEST_PASSWORD,
  authedFetch,
  registerVerifiedUser,
  uniqueEmail,
} from "./support/users";

function postFrom(ip: string, path: string, body: unknown) {
  return fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
    body: JSON.stringify(body),
  });
}

function signUpFrom(ip: string) {
  return postFrom(ip, "/auth/register", {
    email: uniqueEmail(),
    password: TEST_PASSWORD,
    name: "Rate Test",
  });
}

function solve(accessToken: string) {
  return authedFetch(accessToken, "/api/solve", {
    method: "POST",
    body: { problem: "2x = 4" },
  });
}

async function expectRateLimited(res: Response) {
  expect(res.status).toBe(429);
  const body = await res.json();
  expect(body.code).toBe("RATE_LIMITED");
  expect(body.retryAfter).toBeGreaterThan(0);
}

describe("sign-up limit per IP", () => {
  it("refuses the 6th sign-up from one IP within an hour", async () => {
    const ip = randomIp();
    for (let signUp = 0; signUp < 5; signUp++) {
      expect((await signUpFrom(ip)).status).toBe(200);
    }

    await expectRateLimited(await signUpFrom(ip));
  });

  it("does not count sign-ups from a different IP", async () => {
    const busyIp = randomIp();
    for (let signUp = 0; signUp < 6; signUp++) {
      await signUpFrom(busyIp);
    }

    expect((await signUpFrom(randomIp())).status).toBe(200);
  });
});

describe("login limit per IP", () => {
  it("refuses the 11th login attempt from one IP within 15 minutes", async () => {
    const ip = randomIp();
    for (let attempt = 0; attempt < 10; attempt++) {
      const res = await postFrom(ip, "/auth/login", {
        email: uniqueEmail(),
        password: TEST_PASSWORD,
      });
      expect(res.status).toBe(401);
    }

    await expectRateLimited(
      await postFrom(ip, "/auth/login", { email: uniqueEmail(), password: TEST_PASSWORD })
    );
  });
});

describe("Google sign-in limit per IP", () => {
  it("shares the login budget, so the 11th attempt from one IP is refused", async () => {
    const ip = randomIp();
    for (let attempt = 0; attempt < 10; attempt++) {
      // A bogus token fails verification, but the attempt still counts
      const res = await postFrom(ip, "/auth/google", { idToken: "not-a-real-token" });
      expect(res.status).toBe(401);
    }

    const blocked = await postFrom(ip, "/auth/google", { idToken: "not-a-real-token" });

    await expectRateLimited(blocked);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});

describe("solve limit per User", () => {
  it("lets 5 parallel solves through and refuses the 6th", async () => {
    const { accessToken } = await registerVerifiedUser();

    const first = await Promise.all(Array.from({ length: 5 }, () => solve(accessToken)));

    expect(first.map((res) => res.status)).toEqual([200, 200, 200, 200, 200]);
    await expectRateLimited(await solve(accessToken));
  });

  it("never lets more than 5 of 10 parallel solves through", async () => {
    const { accessToken } = await registerVerifiedUser();

    const results = await Promise.all(Array.from({ length: 10 }, () => solve(accessToken)));

    expect(results.filter((res) => res.status === 200).length).toBeLessThanOrEqual(5);
    expect(results.filter((res) => res.status === 429).length).toBeGreaterThanOrEqual(5);
  });

  it("keeps each User's limit separate", async () => {
    const busy = await registerVerifiedUser();
    const other = await registerVerifiedUser();
    await Promise.all(Array.from({ length: 6 }, () => solve(busy.accessToken)));

    expect((await solve(other.accessToken)).status).toBe(200);
  });
});
