import { describe, expect, it } from "vitest";
import { apiUrl } from "./support/test-app";
import { TEST_PASSWORD, uniqueEmail } from "./support/users";

describe("POST /auth/register", () => {
  it("never lets a new User give themselves admin rights", async () => {
    const res = await fetch(apiUrl("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: uniqueEmail(),
        password: TEST_PASSWORD,
        name: "Mallory",
        isAdmin: true,
      }),
    });
    const { accessToken } = await res.json();

    const me = await fetch(apiUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect((await me.json()).user.isAdmin).toBe(false);

    const adminStats = await fetch(apiUrl("/admin/stats"), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(adminStats.status).toBe(403);
  });
});
