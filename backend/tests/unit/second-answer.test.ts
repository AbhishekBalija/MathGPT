import { describe, expect, it } from "vitest";
import { readSecondAnswer } from "../../src/services/ai/ai.service";

describe("readSecondAnswer", () => {
  it("keeps LaTeX backslashes exactly as written", () => {
    expect(readSecondAnswer("\\frac{x}{2} - \\frac{1}{8} \\sin(4x+10) + C")).toBe(
      "\\frac{x}{2} - \\frac{1}{8} \\sin(4x+10) + C"
    );
  });

  it("drops $ signs, code fences and an 'Answer:' label", () => {
    expect(readSecondAnswer("```\n$x = 2$\n```")).toBe("x = 2");
    expect(readSecondAnswer("Final answer: 49\\pi")).toBe("49\\pi");
  });

  it("takes the last line when the model adds working", () => {
    expect(readSecondAnswer("First factor it.\nx = -2 \\text{ or } x = -3")).toBe(
      "x = -2 \\text{ or } x = -3"
    );
  });

  it("returns null for UNKNOWN, an empty reply or a huge one", () => {
    expect(readSecondAnswer("UNKNOWN")).toBeNull();
    expect(readSecondAnswer("   ")).toBeNull();
    expect(readSecondAnswer("x".repeat(600))).toBeNull();
  });
});
