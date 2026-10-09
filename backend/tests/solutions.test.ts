import { describe, expect, it } from "vitest";
import {
  FAKE_BROKEN_FORMAT,
  FAKE_CONTENT,
  FAKE_FINAL_ANSWER,
} from "./support/fake-math-solver";
import { solutionRepository } from "../src/modules/solutions/solution.repository";
import { authedFetch, registerAdmin, registerVerifiedUser } from "./support/users";

async function solve(accessToken: string, problem = "2x = 4") {
  const res = await authedFetch(accessToken, "/api/solve", {
    method: "POST",
    body: { problem },
  });
  expect(res.status).toBe(200);
  return (await res.json()).solution as { id: string; createdAt: string };
}

describe("a User's Solutions", () => {
  it("can be opened and deleted with the ID that solving returned", async () => {
    const { accessToken } = await registerVerifiedUser();
    const solution = await solve(accessToken);

    const opened = await authedFetch(accessToken, `/api/solution/${solution.id}`);
    expect(opened.status).toBe(200);
    const body = await opened.json();
    expect(body.solution).toMatchObject({
      id: solution.id,
      problem: "2x = 4",
      finalAnswer: FAKE_FINAL_ANSWER,
      formatVersion: 2,
      // Same moment the solve response reported
      createdAt: solution.createdAt,
    });

    const deleted = await authedFetch(accessToken, `/api/solution/${solution.id}`, {
      method: "DELETE",
    });
    expect(deleted.status).toBe(200);
    const reopened = await authedFetch(accessToken, `/api/solution/${solution.id}`);
    expect(reopened.status).toBe(404);
  });

  it("saved in the new format come back with their content unchanged", async () => {
    const { accessToken } = await registerVerifiedUser();
    const solution = await solve(accessToken);

    const res = await authedFetch(accessToken, `/api/solution/${solution.id}`);

    const body = await res.json();
    expect(body.solution.formatVersion).toBe(2);
    expect(body.solution.content).toEqual(FAKE_CONTENT);
    const history = await (await authedFetch(accessToken, "/api/history")).json();
    expect(history.history[0].formatVersion).toBe(2);
    // History stays light
    expect(history.history[0].content).toBeUndefined();
  });

  it("saved in the old format come back as version 1 with their steps and no content", async () => {
    const { accessToken } = await registerVerifiedUser();
    // The solver no longer makes old-format solutions, so save one the way it used to be
    const me = await (await authedFetch(accessToken, "/auth/me")).json();
    const id = crypto.randomUUID();
    await solutionRepository.create(me.user.id, {
      id,
      problem: "2x = 4",
      problemType: "algebra",
      steps: [
        {
          stepNumber: 1,
          expression: "x = 2",
          justification: "Divide both sides by 2",
          explanation: "Dividing both sides by 2 leaves x on its own.",
          status: "VERIFIED",
        },
        {
          stepNumber: 2,
          expression: "x = 2",
          justification: "State the answer",
          explanation: "This is the answer.",
          status: "VERIFIED",
        },
      ],
      finalAnswer: FAKE_FINAL_ANSWER,
      summary: "Isolate x.",
      processingTimeMs: 1,
      createdAt: new Date().toISOString(),
    });

    const res = await authedFetch(accessToken, `/api/solution/${id}`);

    const body = await res.json();
    expect(body.solution.formatVersion).toBe(1);
    expect(body.solution.content).toBeNull();
    expect(body.solution.steps).toHaveLength(2);
    const history = await (await authedFetch(accessToken, "/api/history")).json();
    expect(history.history[0].formatVersion).toBe(1);
  });

  it("with broken new-format content are not saved", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await authedFetch(accessToken, "/api/solve", {
      method: "POST",
      body: { problem: `2x = 4 ${FAKE_BROKEN_FORMAT}` },
    });

    expect(res.status).toBe(500);
    const history = await (await authedFetch(accessToken, "/api/history")).json();
    expect(history.history).toEqual([]);
  });

  it("show in History newest first", async () => {
    const { accessToken } = await registerVerifiedUser();
    await solve(accessToken, "first problem");
    await solve(accessToken, "second problem");

    const res = await authedFetch(accessToken, "/api/history");

    expect(res.status).toBe(200);
    const { history } = await res.json();
    expect(history.map((item: { problem: string }) => item.problem)).toEqual([
      "second problem",
      "first problem",
    ]);
  });

  it("count towards profile statistics", async () => {
    const { accessToken } = await registerVerifiedUser();
    await solve(accessToken);

    const res = await authedFetch(accessToken, "/api/profile");

    const { stats } = await res.json();
    expect(stats.totalSolutions).toBe(1);
    expect(stats.problemTypes).toEqual({ algebra: 1 });
    expect(stats.lastSolvedAt).not.toBeNull();
  });

  it("can all be cleared at once from the History page", async () => {
    const { accessToken } = await registerVerifiedUser();
    await solve(accessToken);
    await solve(accessToken);

    // The path the frontend calls
    const res = await authedFetch(accessToken, "/api/history", { method: "DELETE" });

    expect(res.status).toBe(200);
    expect((await res.json()).deletedCount).toBe(2);
    const history = await authedFetch(accessToken, "/api/history");
    expect((await history.json()).history).toEqual([]);
  });

  it("return 404 for an ID that is not a UUID", async () => {
    const { accessToken } = await registerVerifiedUser();

    const opened = await authedFetch(accessToken, "/api/solution/507f1f77bcf86cd799439011");
    const deleted = await authedFetch(accessToken, "/api/solution/not-an-id", {
      method: "DELETE",
    });

    expect(opened.status).toBe(404);
    expect(deleted.status).toBe(404);
  });
});

describe("another User's Solutions", () => {
  it("can be neither opened nor deleted", async () => {
    const owner = await registerVerifiedUser();
    const other = await registerVerifiedUser();
    const solution = await solve(owner.accessToken);

    const opened = await authedFetch(other.accessToken, `/api/solution/${solution.id}`);
    const deleted = await authedFetch(other.accessToken, `/api/solution/${solution.id}`, {
      method: "DELETE",
    });

    // 404, not 403, so the response does not even confirm the ID exists
    expect(opened.status).toBe(404);
    expect(deleted.status).toBe(404);
    const stillThere = await authedFetch(owner.accessToken, `/api/solution/${solution.id}`);
    expect(stillThere.status).toBe(200);
  });

  it("never appear in someone else's History", async () => {
    const owner = await registerVerifiedUser();
    const other = await registerVerifiedUser();
    await solve(owner.accessToken);

    const res = await authedFetch(other.accessToken, "/api/history");

    expect((await res.json()).history).toEqual([]);
  });
});

describe("deleting a User", () => {
  it("removes their Solutions too", async () => {
    const { accessToken: adminToken } = await registerAdmin();
    const user = await registerVerifiedUser();
    await solve(user.accessToken);
    await solve(user.accessToken);
    const me = await authedFetch(user.accessToken, "/auth/me");
    const { id } = (await me.json()).user;

    const res = await authedFetch(adminToken, `/admin/users/${id}`, { method: "DELETE" });

    expect(res.status).toBe(200);
    expect((await res.json()).deletedSolutions).toBe(2);
  });
});
