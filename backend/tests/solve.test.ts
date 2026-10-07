import { describe, expect, it } from "vitest";
import { FAKE_FINAL_ANSWER } from "./support/fake-math-solver";
import { apiUrl } from "./support/test-app";
import { registerUser } from "./support/users";

describe("POST /api/solve", () => {
  it("returns the Solution produced by the AI solver", async () => {
    const { accessToken } = await registerUser();

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
