import { describe, expect, it } from "vitest";
import { classAnswerSchema, needsOnboarding } from "../../src/modules/users/class-info";
import type { User } from "../../src/modules/users/user.repository";

function parse(answer: Record<string, unknown>) {
  return classAnswerSchema.safeParse({ helping: false, ...answer });
}

describe("classAnswerSchema", () => {
  it("accepts a school range with a board", () => {
    expect(parse({ range: "class_6_8", board: "cbse" }).success).toBe(true);
  });

  it("accepts a school range with no board", () => {
    expect(parse({ range: "class_1_5" }).success).toBe(true);
  });

  it("needs a state for a state board", () => {
    expect(parse({ range: "class_6_8", board: "state" }).success).toBe(false);
    expect(parse({ range: "class_6_8", board: "state", state: "Karnataka" }).success).toBe(true);
  });

  it("refuses a state without a state board", () => {
    expect(parse({ range: "class_6_8", board: "cbse", state: "Karnataka" }).success).toBe(false);
  });

  it("refuses a board for college", () => {
    expect(parse({ range: "college", board: "cbse" }).success).toBe(false);
  });

  it("refuses an institution for a school range", () => {
    expect(parse({ range: "class_9_10", institution: "VTU" }).success).toBe(false);
  });

  it("trims the institution and turns empty into null", () => {
    expect(parse({ range: "college", institution: "  VTU  " }).data?.institution).toBe("VTU");
    expect(parse({ range: "college", institution: "   " }).data?.institution).toBeNull();
  });

  it("refuses an institution over 120 characters", () => {
    expect(parse({ range: "college", institution: "a".repeat(121) }).success).toBe(false);
  });

  it("refuses a range it does not know", () => {
    expect(parse({ range: "class_13" }).success).toBe(false);
  });
});

describe("needsOnboarding", () => {
  const fresh = { classRange: null, onboardingSkippedAt: null } as unknown as User;

  it("is true for a new student", () => {
    expect(needsOnboarding(fresh)).toBe(true);
  });

  it("is false once a class is set or the student skipped", () => {
    expect(needsOnboarding({ ...fresh, classRange: "class_6_8" })).toBe(false);
    expect(needsOnboarding({ ...fresh, onboardingSkippedAt: new Date() })).toBe(false);
  });
});
