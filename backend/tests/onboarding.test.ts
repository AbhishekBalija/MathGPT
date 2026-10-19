import { describe, expect, it } from "vitest";
import { apiUrl } from "./support/test-app";
import { TEST_PASSWORD, authedFetch, registerVerifiedUser, uniqueEmail } from "./support/users";

async function me(accessToken: string) {
  const res = await authedFetch(accessToken, "/auth/me");
  return (await res.json()).user;
}

function saveClass(accessToken: string, body: Record<string, unknown>) {
  return authedFetch(accessToken, "/api/profile/class", { method: "PUT", body });
}

function skip(accessToken: string) {
  return authedFetch(accessToken, "/api/profile/class/skip", { method: "POST" });
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

describe("PUT /api/profile/class", () => {
  it("saves a student with a class and a board", async () => {
    const { accessToken } = await registerVerifiedUser();

    const res = await saveClass(accessToken, { role: "student", ranges: ["class_6_8"], board: "cbse" });

    expect(res.status).toBe(200);
    const expected = {
      onboarding: "done",
      classInfo: { role: "student", ranges: ["class_6_8"], board: "cbse", state: null, institution: null },
    };
    expect((await res.json()).user).toMatchObject(expected);
    expect(await me(accessToken)).toMatchObject(expected);
  });

  it("saves a parent", async () => {
    const { accessToken } = await registerVerifiedUser();
    const res = await saveClass(accessToken, { role: "parent", ranges: ["class_1_5"], board: "icse" });
    expect((await res.json()).user.classInfo).toMatchObject({ role: "parent", ranges: ["class_1_5"] });
  });

  it("saves a teacher with several classes", async () => {
    const { accessToken } = await registerVerifiedUser();
    const res = await saveClass(accessToken, { role: "teacher", ranges: ["class_6_8", "class_9_10"], board: "cbse" });
    expect((await res.json()).user.classInfo).toMatchObject({ role: "teacher", ranges: ["class_6_8", "class_9_10"] });
  });

  it("saves a teacher with school and college, with a board and a university", async () => {
    const { accessToken } = await registerVerifiedUser();
    const res = await saveClass(accessToken, {
      role: "teacher",
      ranges: ["class_11_12", "college"],
      board: "cbse",
      institution: "VTU",
    });
    expect((await res.json()).user.classInfo).toMatchObject({ board: "cbse", institution: "VTU" });
  });

  it("saves a role on its own, and that is enough to be done", async () => {
    const { accessToken } = await registerVerifiedUser();
    const res = await saveClass(accessToken, { role: "parent" });
    expect((await res.json()).user).toMatchObject({
      onboarding: "done",
      classInfo: { role: "parent", ranges: [], board: null, state: null, institution: null },
    });
  });

  it("refuses a student with two classes", async () => {
    const { accessToken } = await registerVerifiedUser();
    const res = await saveClass(accessToken, { role: "student", ranges: ["class_6_8", "class_9_10"] });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID_CLASS");
    expect((await me(accessToken)).onboarding).toBe("needed");
  });

  it("needs a state for a state board", async () => {
    const { accessToken } = await registerVerifiedUser();
    expect((await saveClass(accessToken, { role: "student", ranges: ["class_9_10"], board: "state" })).status).toBe(400);
    const res = await saveClass(accessToken, { role: "student", ranges: ["class_9_10"], board: "state", state: "Karnataka" });
    expect((await res.json()).user.classInfo).toMatchObject({ board: "state", state: "Karnataka" });
  });

  it("refuses a board with only college", async () => {
    const { accessToken } = await registerVerifiedUser();
    expect((await saveClass(accessToken, { role: "student", ranges: ["college"], board: "cbse" })).status).toBe(400);
  });

  it("clears what no longer applies when the answer changes", async () => {
    const { accessToken } = await registerVerifiedUser();
    await saveClass(accessToken, { role: "student", ranges: ["class_9_10"], board: "state", state: "Karnataka" });

    const college = await saveClass(accessToken, { role: "student", ranges: ["college"], institution: "VTU" });
    expect((await college.json()).user.classInfo).toEqual({
      role: "student",
      ranges: ["college"],
      board: null,
      state: null,
      institution: "VTU",
    });

    const school = await saveClass(accessToken, { role: "teacher", ranges: ["class_11_12"], board: "cbse" });
    expect((await school.json()).user.classInfo).toMatchObject({ role: "teacher", institution: null, board: "cbse" });
  });

  it("turns an empty university into null", async () => {
    const { accessToken } = await registerVerifiedUser();
    const res = await saveClass(accessToken, { role: "student", ranges: ["college"], institution: "   " });
    expect((await res.json()).user.classInfo).toMatchObject({ ranges: ["college"], institution: null });
  });

  it("needs a login", async () => {
    const res = await fetch(apiUrl("/api/profile/class"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "student", ranges: ["class_6_8"] }),
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/profile/class/skip", () => {
  it("makes onboarding done and saves no answer", async () => {
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

  it("keeps a saved answer", async () => {
    const { accessToken } = await registerVerifiedUser();
    await saveClass(accessToken, { role: "student", ranges: ["class_6_8"], board: "cbse" });

    const res = await skip(accessToken);

    expect((await res.json()).user.classInfo).toMatchObject({ role: "student", ranges: ["class_6_8"], board: "cbse" });
  });

  it("needs a login", async () => {
    const res = await fetch(apiUrl("/api/profile/class/skip"), { method: "POST" });
    expect(res.status).toBe(401);
  });
});
