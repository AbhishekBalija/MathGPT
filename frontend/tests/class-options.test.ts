import { describe, expect, it } from "vitest";
import { INDIAN_STATES, RANGES, describeClass } from "../src/features/onboarding/class-options";
import type { ClassInfo } from "../src/features/onboarding/class-options";

const base: ClassInfo = { range: "class_6_8", helping: false, board: null, state: null, institution: null };

describe("describeClass", () => {
  it("says Not set yet with no class", () => {
    expect(describeClass(null)).toBe("Not set yet");
    expect(describeClass(undefined)).toBe("Not set yet");
  });

  it("names the range and the board", () => {
    expect(describeClass({ ...base, board: "cbse" })).toBe("Class 6–8 · CBSE");
  });

  it("names the state for a state board", () => {
    expect(describeClass({ ...base, range: "class_9_10", board: "state", state: "Karnataka" })).toBe(
      "Class 9–10 · State board · Karnataka"
    );
  });

  it("names the university for college, or nothing when it was left empty", () => {
    expect(describeClass({ ...base, range: "college", institution: "VTU" })).toBe("College & above · VTU");
    expect(describeClass({ ...base, range: "college" })).toBe("College & above");
  });

  it("is just the range when no board was given", () => {
    expect(describeClass({ ...base, range: "class_1_5" })).toBe("Class 1–5");
  });

  it("says Helping with for a parent or teacher", () => {
    expect(describeClass({ ...base, helping: true, board: "cbse" })).toBe("Helping with Class 6–8 · CBSE");
  });
});

describe("options", () => {
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
    expect(INDIAN_STATES).toContain("Delhi");
  });
});
