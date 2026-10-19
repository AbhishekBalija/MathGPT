import { describe, expect, it } from "vitest";
import { INDIAN_STATES, RANGES, ROLES, describeClass } from "../src/features/onboarding/class-options";
import type { ClassInfo } from "../src/features/onboarding/class-options";

const base: ClassInfo = { role: "student", ranges: ["class_6_8"], board: null, state: null, institution: null };

describe("describeClass", () => {
  it("says Not set yet with no answer", () => {
    expect(describeClass(null)).toBe("Not set yet");
    expect(describeClass(undefined)).toBe("Not set yet");
  });

  it("leads with the role, then the class and board", () => {
    expect(describeClass({ ...base, board: "cbse" })).toBe("Student · Class 6–8 · CBSE");
    expect(describeClass({ ...base, role: "parent", ranges: ["class_1_5"], board: "cbse" })).toBe("Parent · Class 1–5 · CBSE");
  });

  it("lists a teacher's classes together", () => {
    expect(describeClass({ ...base, role: "teacher", ranges: ["class_6_8", "class_9_10"], board: "cbse" })).toBe(
      "Teacher · Class 6–8, 9–10 · CBSE"
    );
  });

  it("names the state for a state board", () => {
    expect(describeClass({ ...base, ranges: ["class_9_10"], board: "state", state: "Karnataka" })).toBe(
      "Student · Class 9–10 · State board · Karnataka"
    );
  });

  it("names the university when given", () => {
    expect(describeClass({ ...base, ranges: ["college"], institution: "VTU" })).toBe("Student · College & above · VTU");
    expect(describeClass({ ...base, ranges: ["college"] })).toBe("Student · College & above");
  });

  it("is just the role when no class was given", () => {
    expect(describeClass({ ...base, role: "parent", ranges: [] })).toBe("Parent");
  });
});

describe("options", () => {
  it("lists the three roles", () => {
    expect(ROLES.map((role) => role.label)).toEqual(["Student", "Parent", "Teacher"]);
  });

  it("lists the five ranges with an example each", () => {
    expect(RANGES.map((range) => range.label)).toEqual([
      "Class 1–5",
      "Class 6–8",
      "Class 9–10",
      "Class 11–12",
      "College & above",
    ]);
    expect(RANGES.map((range) => range.example)).toEqual(["156 ÷ 4", "3x + 5 = 20", "x² + 5x + 6 = 0", "d/dx (sin x)", "∫ x eˣ dx"]);
  });

  it("puts Karnataka first in the state list", () => {
    expect(INDIAN_STATES[0]).toBe("Karnataka");
  });
});
