import { describe, expect, it } from "vitest";
import { apiUrl } from "./support/test-app";
import { TEST_PASSWORD, authedFetch, registerVerifiedUser, uniqueEmail } from "./support/users";

async function me(accessToken: string) {
  const res = await authedFetch(accessToken, "/auth/me");
  return (await res.json()).user;
}

describe("Onboarding on auth responses", () => {
  it("a new student needs onboarding", async () => {
    const res = await fetch(apiUrl("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail(), password: TEST_PASSWORD, name: "Test User" }),
    });
    const registered = await res.json();
    expect(registered.user).toMatchObject({ onboarding: "needed", classInfo: null });

    const { accessToken } = await registerVerifiedUser();
    expect(await me(accessToken)).toMatchObject({ onboarding: "needed", classInfo: null });
  });
});
