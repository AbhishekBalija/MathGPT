import { describe, expect, it } from "vitest";
import { classAnswerSchema, needsOnboarding } from "../../src/modules/users/class-info";
import type { User } from "../../src/modules/users/user.repository";

function parse(answer: Record<string, unknown>) {
  return classAnswerSchema.safeParse(answer);
}

describe("classAnswerSchema", () => {
  it("accepts a student with one school class and a board", () => {
    expect(parse({ role: "student", ranges: ["class_6_8"], board: "cbse" }).success).toBe(true);
  });

  it("accepts a role on its own (Skip on the class step)", () => {
    expect(parse({ role: "parent" }).success).toBe(true);
    expect(parse({ role: "parent", ranges: [] }).success).toBe(true);
  });

  it("needs a role", () => {
    expect(parse({ ranges: ["class_6_8"] }).success).toBe(false);
    expect(parse({ role: "tutor", ranges: ["class_6_8"] }).success).toBe(false);
  });

  it("gives a student or a parent exactly one class", () => {
    expect(parse({ role: "student", ranges: ["class_6_8", "class_9_10"] }).success).toBe(false);
    expect(parse({ role: "parent", ranges: ["class_1_5", "class_6_8"] }).success).toBe(false);
  });

  it("lets a teacher pick up to five different classes", () => {
    expect(parse({ role: "teacher", ranges: ["class_6_8", "class_9_10"], board: "cbse" }).success).toBe(true);
    expect(parse({ role: "teacher", ranges: ["class_6_8", "class_6_8"] }).success).toBe(false);
    expect(
      parse({ role: "teacher", ranges: ["class_1_5", "class_6_8", "class_9_10", "class_11_12", "college", "college"] })
        .success
    ).toBe(false);
  });

  it("refuses a class it does not know", () => {
    expect(parse({ role: "student", ranges: ["class_13"] }).success).toBe(false);
  });

  it("needs a state for a state board, and only then", () => {
    expect(parse({ role: "student", ranges: ["class_6_8"], board: "state" }).success).toBe(false);
    expect(parse({ role: "student", ranges: ["class_6_8"], board: "state", state: "Karnataka" }).success).toBe(true);
    expect(parse({ role: "student", ranges: ["class_6_8"], board: "cbse", state: "Karnataka" }).success).toBe(false);
  });

  it("allows a board only with a school class", () => {
    expect(parse({ role: "student", ranges: ["college"], board: "cbse" }).success).toBe(false);
    expect(parse({ role: "parent", board: "cbse" }).success).toBe(false);
  });

  it("allows a university only with college", () => {
    expect(parse({ role: "student", ranges: ["class_9_10"], institution: "VTU" }).success).toBe(false);
  });

  it("lets a teacher with school and college give a board and a university", () => {
    expect(
      parse({ role: "teacher", ranges: ["class_11_12", "college"], board: "cbse", institution: "VTU" }).success
    ).toBe(true);
  });

  it("trims the university, turns empty into null and caps it at 120", () => {
    expect(parse({ role: "student", ranges: ["college"], institution: "  VTU  " }).data?.institution).toBe("VTU");
    expect(parse({ role: "student", ranges: ["college"], institution: "   " }).data?.institution).toBeNull();
    expect(parse({ role: "student", ranges: ["college"], institution: "a".repeat(121) }).success).toBe(false);
  });
});

describe("needsOnboarding", () => {
  const fresh = { role: null, onboardingSkippedAt: null } as unknown as User;

  it("is true for a new student", () => {
    expect(needsOnboarding(fresh)).toBe(true);
  });

  it("is false once a role is given or the student skipped", () => {
    expect(needsOnboarding({ ...fresh, role: "student" })).toBe(false);
    expect(needsOnboarding({ ...fresh, onboardingSkippedAt: new Date() })).toBe(false);
  });
});
