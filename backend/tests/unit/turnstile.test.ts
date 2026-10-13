import { describe, expect, it, vi } from "vitest";
import { createTurnstileCheck, verifyTurnstile } from "../../src/modules/auth/turnstile";

function fakeFetch(success: boolean) {
  return vi.fn(async () => new Response(JSON.stringify({ success }), { status: 200 }));
}

describe("verifyTurnstile", () => {
  it("sends the secret, token and IP to Cloudflare and returns its answer", async () => {
    const fetchImpl = fakeFetch(true);

    expect(await verifyTurnstile("token-1", "10.0.0.1", "secret-1", fetchImpl)).toBe(true);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const sent = new URLSearchParams(String(init.body));
    expect(Object.fromEntries(sent)).toEqual({ secret: "secret-1", response: "token-1", remoteip: "10.0.0.1" });
  });

  it("says no when Cloudflare says no, errors or cannot be reached", async () => {
    expect(await verifyTurnstile("t", "ip", "s", fakeFetch(false))).toBe(false);
    expect(await verifyTurnstile("t", "ip", "s", vi.fn(async () => new Response("oops", { status: 500 })))).toBe(false);
    expect(await verifyTurnstile("t", "ip", "s", vi.fn(async () => Promise.reject(new Error("offline"))))).toBe(false);
  });
});

describe("createTurnstileCheck", () => {
  it("skips the check outside production when no secret is set", async () => {
    const check = createTurnstileCheck({ NODE_ENV: "development" });
    expect(await check(undefined, "ip")).toBe(true);
  });

  it("refuses sign-ups in production when the secret is missing", async () => {
    const check = createTurnstileCheck({ NODE_ENV: "production" });
    expect(await check("token", "ip")).toBe(false);
  });

  it("refuses a missing token when a secret is set", async () => {
    const fetchImpl = fakeFetch(true);
    const check = createTurnstileCheck({ NODE_ENV: "production", TURNSTILE_SECRET_KEY: "s" }, fetchImpl);
    expect(await check(undefined, "ip")).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("asks Cloudflare when a secret and a token are present", async () => {
    const check = createTurnstileCheck({ NODE_ENV: "production", TURNSTILE_SECRET_KEY: "s" }, fakeFetch(true));
    expect(await check("token", "ip")).toBe(true);
  });
});
