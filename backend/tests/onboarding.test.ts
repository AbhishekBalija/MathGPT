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

function saveClass(accessToken: string, body: Record<string, unknown>) {
  return authedFetch(accessToken, "/api/profile/class", { method: "PUT", body: { helping: false, ...body } });
}

function skip(accessToken: string) {
  return authedFetch(accessToken, "/api/profile/class/skip", { method: "POST" });
}

describe("PUT /api/profile/class", () => {
  it("saves a school class with a board", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await saveClass(accessToken, { range: "class_6_8", board: "cbse" });

    expect(res.status).toBe(200);
    const expected = {
      onboarding: "done",
      classInfo: { range: "class_6_8", helping: false, board: "cbse", state: null, institution: null },
    };
    expect((await res.json()).user).toMatchObject(expected);
    expect(await me(accessToken)).toMatchObject(expected);
  });

  it("saves a school class with no board", async () => {
    const { accessToken } = await registerVerifiedUser();
    const res = await saveClass(accessToken, { range: "class_1_5" });
    expect((await res.json()).user.classInfo).toMatchObject({ range: "class_1_5", board: null });
  });

  it("saves a parent's answer", async () => {
    const { accessToken } = await registerVerifiedUser();
    const res = await saveClass(accessToken, { range: "class_6_8", helping: true, board: "icse" });
    expect((await res.json()).user.classInfo).toMatchObject({ helping: true });
  });

  it("needs a state for a state board", async () => {
    const { accessToken } = await registerVerifiedUser();

    const missing = await saveClass(accessToken, { range: "class_9_10", board: "state" });
    expect(missing.status).toBe(400);
    expect((await missing.json()).code).toBe("INVALID_CLASS");

    const res = await saveClass(accessToken, { range: "class_9_10", board: "state", state: "Karnataka" });
    expect((await res.json()).user.classInfo).toMatchObject({ board: "state", state: "Karnataka" });
  });

  it("refuses a board for college", async () => {
    const { accessToken } = await registerVerifiedUser();
    const res = await saveClass(accessToken, { range: "college", board: "cbse" });
    expect(res.status).toBe(400);
    expect((await me(accessToken)).onboarding).toBe("needed");
  });

  it("switching to college clears the old board and state, and back clears the university", async () => {
    const { accessToken } = await registerVerifiedUser();
    await saveClass(accessToken, { range: "class_9_10", board: "state", state: "Karnataka" });

    const college = await saveClass(accessToken, { range: "college", institution: "VTU" });
    expect((await college.json()).user.classInfo).toEqual({
      range: "college",
      helping: false,
      board: null,
      state: null,
      institution: "VTU",
    });

    const school = await saveClass(accessToken, { range: "class_11_12", board: "cbse" });
    expect((await school.json()).user.classInfo).toMatchObject({ institution: null, board: "cbse" });
  });

  it("an empty university becomes null", async () => {
    const { accessToken } = await registerVerifiedUser();
    const res = await saveClass(accessToken, { range: "college", institution: "   " });
    expect((await res.json()).user.classInfo).toMatchObject({ range: "college", institution: null });
  });

  it("needs a login", async () => {
    const res = await fetch(apiUrl("/api/profile/class"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ range: "class_6_8", helping: false }),
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/profile/class/skip", () => {
  it("makes onboarding done and saves no class", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await skip(accessToken);

    expect(res.status).toBe(200);
    expect((await res.json()).user).toMatchObject({ onboarding: "done", classInfo: null });
    expect(await me(accessToken)).toMatchObject({ onboarding: "done", classInfo: null });
  });

  it("skipping twice is fine", async () => {
    const { accessToken } = await registerVerifiedUser();
    await skip(accessToken);
    const again = await skip(accessToken);
    expect(again.status).toBe(200);
    expect((await again.json()).user).toMatchObject({ onboarding: "done", classInfo: null });
  });

  it("skip after a class is set keeps the class", async () => {
    const { accessToken } = await registerVerifiedUser();
    await saveClass(accessToken, { range: "class_6_8", board: "cbse" });

    const res = await skip(accessToken);

    expect((await res.json()).user.classInfo).toMatchObject({ range: "class_6_8", board: "cbse" });
  });

  it("needs a login", async () => {
    const res = await fetch(apiUrl("/api/profile/class/skip"), { method: "POST" });
    expect(res.status).toBe(401);
  });
});
