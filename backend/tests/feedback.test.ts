import { beforeAll, describe, expect, it } from "vitest";
import { uniqueProblem } from "./support/problems";
import { authedFetch, registerAdmin, registerVerifiedUser } from "./support/users";

let adminToken: string;

beforeAll(async () => {
  ({ accessToken: adminToken } = await registerAdmin());
});

function sendFeedback(accessToken: string, body: Record<string, unknown>) {
  return authedFetch(accessToken, "/api/feedback", { method: "POST", body });
}

async function listFeedback(query = "") {
  const res = await authedFetch(adminToken, `/admin/feedback${query}`);
  expect(res.status).toBe(200);
  return (await res.json()).feedback as Array<Record<string, unknown>>;
}

async function solve(accessToken: string) {
  const res = await authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem: uniqueProblem() } });
  return res.json();
}

// A message no other test uses, so each test finds its own Feedback
function uniqueMessage(): string {
  return `The dark mode button is hard to find ${Math.random().toString(36).slice(2, 10)}`;
}

describe("Feedback", () => {
  it("a student sends Feedback and an Admin sees it, with the sender's email", async () => {
    const student = await registerVerifiedUser();
    const message = uniqueMessage();

    const res = await sendFeedback(student.accessToken, { kind: "idea", message, page: "/app" });

    expect(res.status).toBe(201);
    const item = (await listFeedback()).find((f) => f.message === message);
    expect(item).toMatchObject({ kind: "idea", message, page: "/app", email: student.email, done: false });
  });

  it("attaches the Solution the student had open", async () => {
    const student = await registerVerifiedUser();
    const solved = await solve(student.accessToken);
    const message = uniqueMessage();

    await sendFeedback(student.accessToken, { kind: "bug", message, page: "/app", solutionId: solved.solution.id });

    const item = (await listFeedback()).find((f) => f.message === message);
    expect(item?.solutionId).toBe(solved.solution.id);
  });

  it("drops a Solution id that is not the student's own", async () => {
    const owner = await registerVerifiedUser();
    const solved = await solve(owner.accessToken);
    const stranger = await registerVerifiedUser();
    const message = uniqueMessage();

    const res = await sendFeedback(stranger.accessToken, { kind: "bug", message, solutionId: solved.solution.id });

    expect(res.status).toBe(201);
    const item = (await listFeedback()).find((f) => f.message === message);
    expect(item?.solutionId).toBeNull();
  });

  it("allows 5 an hour, so one account cannot flood the inbox", async () => {
    const student = await registerVerifiedUser();
    for (let i = 0; i < 5; i++) {
      expect((await sendFeedback(student.accessToken, { kind: "other", message: uniqueMessage() })).status).toBe(201);
    }

    const res = await sendFeedback(student.accessToken, { kind: "other", message: uniqueMessage() });

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "RATE_LIMITED" });
  });

  it.each([
    ["an empty message", { kind: "bug", message: "   " }],
    ["a message over 1000 characters", { kind: "bug", message: "x".repeat(1001) }],
    ["an unknown kind", { kind: "praise", message: "Nice app" }],
    ["a page that is not a path in the app", { kind: "bug", message: "Hi", page: "https://evil.example" }],
    ["a page that is another site", { kind: "bug", message: "Hi", page: "//evil.example" }],
  ])("rejects %s", async (_name, body) => {
    const student = await registerVerifiedUser();

    expect((await sendFeedback(student.accessToken, body)).status).toBe(400);
  });

  it("needs a logged-in user", async () => {
    const res = await fetch(`${process.env.TEST_API_URL}/api/feedback`, { method: "POST" });

    expect(res.status).toBe(401);
  });

  it("an Admin marks Feedback done, and it leaves the open list", async () => {
    const student = await registerVerifiedUser();
    const message = uniqueMessage();
    await sendFeedback(student.accessToken, { kind: "idea", message });
    const item = (await listFeedback()).find((f) => f.message === message);

    const res = await authedFetch(adminToken, `/admin/feedback/${String(item?.id)}/done`, { method: "PATCH" });

    expect(res.status).toBe(200);
    expect((await listFeedback()).find((f) => f.message === message)).toBeUndefined();
    const withDone = (await listFeedback("?includeDone=true")).find((f) => f.message === message);
    expect(withDone?.done).toBe(true);
  });

  it("gives 404 when marking unknown Feedback done", async () => {
    for (const id of ["00000000-0000-4000-8000-000000000000", "not-an-id"]) {
      const res = await authedFetch(adminToken, `/admin/feedback/${id}/done`, { method: "PATCH" });
      expect(res.status).toBe(404);
    }
  });

  it("is deleted with the student's account", async () => {
    const student = await registerVerifiedUser();
    const message = uniqueMessage();
    await sendFeedback(student.accessToken, { kind: "bug", message });
    const me = await (await authedFetch(student.accessToken, "/auth/me")).json();

    const deleted = await authedFetch(adminToken, `/admin/users/${me.user.id}`, { method: "DELETE" });

    expect(deleted.status).toBe(200);
    expect((await listFeedback("?includeDone=true")).find((f) => f.message === message)).toBeUndefined();
  });
});
