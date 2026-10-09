import { describe, expect, it } from "vitest";
import { solutionV2Schema } from "../src/modules/solutions/solution-v2.schema";
import {
  FAKE_CONTENT,
  FAKE_INVALID_OUTPUT,
  FAKE_INVALID_TWICE,
  FAKE_UNSOLVABLE,
} from "./support/fake-math-solver";
import { authedFetch, registerVerifiedUser } from "./support/users";

async function solveAs(accessToken: string, body: Record<string, unknown>) {
  return authedFetch(accessToken, "/api/solve", { method: "POST", body });
}

describe("POST /api/solve", () => {
  it("returns a version 2 solution that matches the schema", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await solveAs(accessToken, { problem: "2x = 4" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.solution.formatVersion).toBe(2);
    expect(body.solution.id).toEqual(expect.any(String));
    expect(body.solution.createdAt).toEqual(expect.any(String));
    expect(solutionV2Schema.safeParse(body.solution.content).success).toBe(true);
    expect(body.solution.content).toEqual(FAKE_CONTENT);
    // No hard-coded verification on new solutions
    expect(JSON.stringify(body)).not.toMatch(/verified/i);
  });

  it("includes a hint in the solution", async () => {
    const { accessToken } = await registerVerifiedUser();

    const body = await (await solveAs(accessToken, { problem: "2x = 4" })).json();

    expect(body.solution.content.hint).toEqual(expect.any(String));
  });

  it("passes the chosen method to the solver", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await solveAs(accessToken, { problem: "2x = 4", method: "quadratic-formula" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.solution.content.header.method.id).toBe("quadratic-formula");
  });

  it("rejects a method id longer than 50 characters", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await solveAs(accessToken, { problem: "2x = 4", method: "m".repeat(51) });

    expect(res.status).toBe(400);
  });

  it("rejects a method with quotes or spaces", async () => {
    const { accessToken } = await registerVerifiedUser();

    for (const method of ['a"b', "two words", "-leading", "x; ignore rules"]) {
      const res = await solveAs(accessToken, { problem: "2x = 4", method });
      expect(res.status).toBe(400);
    }
  });

  it("succeeds when the AI's first reply is invalid but the retry is fine", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await solveAs(accessToken, { problem: `2x = 4 ${FAKE_INVALID_OUTPUT}` });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(solutionV2Schema.safeParse(body.solution.content).success).toBe(true);
  });

  it("answers 502 with a friendly message when both replies are invalid", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await solveAs(accessToken, { problem: `2x = 4 ${FAKE_INVALID_TWICE}` });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Neo got confused by this one. Please try again.");
    expect(body.code).toBe("INVALID_OUTPUT");
  });

  it("does not spend a credit or save anything when the output stays invalid", async () => {
    const { accessToken } = await registerVerifiedUser();

    await solveAs(accessToken, { problem: `2x = 4 ${FAKE_INVALID_TWICE}` });

    const profile = await (await authedFetch(accessToken, "/api/profile")).json();
    expect(profile.dailyCredits).toMatchObject({ used: 0, remaining: 5 });
    const history = await (await authedFetch(accessToken, "/api/history")).json();
    expect(history.history).toEqual([]);
  });

  it("marks an unsolvable problem with the UNSOLVABLE code", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await solveAs(accessToken, { problem: `what is 1/0 ${FAKE_UNSOLVABLE}` });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("UNSOLVABLE");
  });

  it("still limits solving to 5 a minute", async () => {
    const { accessToken } = await registerVerifiedUser();

    for (let i = 0; i < 5; i++) {
      expect((await solveAs(accessToken, { problem: "2x = 4" })).status).toBe(200);
    }
    const res = await solveAs(accessToken, { problem: "2x = 4" });

    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("RATE_LIMITED");
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
