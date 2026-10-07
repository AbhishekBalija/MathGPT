import { describe, expect, it } from "vitest";
import { FAKE_FINAL_ANSWER } from "./support/fake-math-solver";
import { apiUrl } from "./support/test-app";
import { authedFetch, registerVerifiedUser } from "./support/users";

describe("POST /api/solve", () => {
  it("returns the Solution produced by the AI solver", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await fetch(apiUrl("/api/solve"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ problem: "2x = 4" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.solution.problem).toBe("2x = 4");
    expect(body.solution.finalAnswer).toBe(FAKE_FINAL_ANSWER);
    expect(body.solution.steps).toHaveLength(2);
  });
});

describe("Credits", () => {
  it("counts a solved Problem against today's Credits", async () => {
    const { accessToken } = await registerVerifiedUser();

    await authedFetch(accessToken, "/api/solve", {
      method: "POST",
      body: { problem: "2x = 4" },
    });

    const res = await authedFetch(accessToken, "/api/profile");
    expect(res.status).toBe(200);
    const { dailyCredits } = await res.json();
    expect(dailyCredits).toMatchObject({ used: 1, limit: 5, remaining: 4 });
  });

  it("blocks solving once the Daily Limit is used up", async () => {
    const { email, accessToken } = await registerVerifiedUser();
    // Setup: spend today's 5 Credits directly. Solving 5 times over HTTP
    // would hit the per-minute Rate Limit first (see #12).
    const { userRepository } = await import("../src/modules/users/user.repository");
    const user = await userRepository.findByEmail(email);
    for (let credit = 0; credit < 5; credit++) {
      await userRepository.incrementCredits(user?.id ?? "");
    }

    const res = await authedFetch(accessToken, "/api/solve", {
      method: "POST",
      body: { problem: "2x = 4" },
    });

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/daily limit/i);
    expect(body.resetAt).toBeDefined();
  });
});
