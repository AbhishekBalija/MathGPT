import { beforeAll, describe, expect, it } from "vitest";
import { authedFetch, registerAdmin, registerUser } from "./support/users";

let adminToken: string;

beforeAll(async () => {
  ({ accessToken: adminToken } = await registerAdmin());
});

async function userIdOf(accessToken: string): Promise<string> {
  const res = await authedFetch(accessToken, "/auth/me");
  return (await res.json()).user.id;
}

describe("admin access", () => {
  it("refuses a User who is not an Admin", async () => {
    const { accessToken } = await registerUser();

    const res = await authedFetch(accessToken, "/admin/users");

    expect(res.status).toBe(403);
  });

  it("refuses a request without a token", async () => {
    const res = await fetch(`${process.env.TEST_API_URL}/admin/users`);

    expect(res.status).toBe(401);
  });
});

describe("GET /admin/users", () => {
  it("finds a User by part of their email", async () => {
    const { email } = await registerUser();

    const res = await authedFetch(
      adminToken,
      `/admin/users?search=${encodeURIComponent(email.slice(0, 20))}`
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users.map((u: { email: string }) => u.email)).toContain(email);
  });

  it("treats % in a search as text, not a wildcard", async () => {
    const res = await authedFetch(adminToken, "/admin/users?search=%25%25%25");

    expect(res.status).toBe(200);
    expect((await res.json()).users).toEqual([]);
  });

  it("falls back to the first page for a page number that is not a number", async () => {
    const res = await authedFetch(adminToken, "/admin/users?page=abc&limit=xyz");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ page: 1, limit: 20 });
  });
});

describe("PATCH /admin/users/:id/role", () => {
  it("makes another User an Admin", async () => {
    const { accessToken } = await registerUser();
    const id = await userIdOf(accessToken);

    const res = await authedFetch(adminToken, `/admin/users/${id}/role`, {
      method: "PATCH",
      body: { isAdmin: true },
    });

    expect(res.status).toBe(200);
    const stats = await authedFetch(accessToken, "/admin/stats");
    expect(stats.status).toBe(200);
  });

  it("never lets an Admin remove their own admin rights", async () => {
    const id = await userIdOf(adminToken);

    const res = await authedFetch(adminToken, `/admin/users/${id}/role`, {
      method: "PATCH",
      body: { isAdmin: false },
    });

    expect(res.status).toBe(403);
  });

  it("returns 404 for an id that is not a UUID", async () => {
    const res = await authedFetch(adminToken, "/admin/users/not-a-uuid/role", {
      method: "PATCH",
      body: { isAdmin: true },
    });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /admin/users/:id", () => {
  it("deletes a User, who can then no longer use their token", async () => {
    const { accessToken } = await registerUser();
    const id = await userIdOf(accessToken);

    const res = await authedFetch(adminToken, `/admin/users/${id}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const me = await authedFetch(accessToken, "/auth/me");
    expect(me.status).toBe(401);
  });

  it("returns 404 for an id that is not a UUID", async () => {
    const res = await authedFetch(adminToken, "/admin/users/12345", {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
  });

  it("returns 404 for a User that does not exist", async () => {
    const res = await authedFetch(
      adminToken,
      "/admin/users/00000000-0000-4000-8000-000000000000",
      { method: "DELETE" }
    );

    expect(res.status).toBe(404);
  });
});
