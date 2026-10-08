import { beforeAll, describe, expect, it } from "vitest";
import { apiUrl } from "./support/test-app";
import { authedFetch, registerAdmin } from "./support/users";

describe("the waitlist and invites are gone", () => {
  let adminToken: string;

  beforeAll(async () => {
    ({ accessToken: adminToken } = await registerAdmin());
  });

  it.each([
    ["POST", "/api/waitlist"],
    ["POST", "/auth/register-invite"],
    ["POST", "/auth/refresh-invite"],
    ["GET", "/admin/waitlist"],
    ["POST", "/admin/invite-user"],
    ["POST", "/admin/resend-confirmation"],
  ])("%s %s returns 404, even for an Admin", async (method, path) => {
    const res = await authedFetch(adminToken, path, {
      method,
      body: method === "POST" ? { email: "someone@example.test" } : undefined,
    });

    expect(res.status).toBe(404);
  });
});

describe("GET /api/public-stats", () => {
  it("returns the number of Users and nothing about a waitlist", async () => {
    const res = await fetch(apiUrl("/api/public-stats"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ userCount: expect.any(Number) });
  });
});
