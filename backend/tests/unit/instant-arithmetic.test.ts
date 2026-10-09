import { describe, expect, it } from "vitest";
import { trySolveArithmetic } from "../../src/modules/solver/instant/arithmetic";
import { solutionV2Schema } from "../../src/modules/solutions/solution-v2.schema";
import { UnsolvableProblemError } from "../../src/services/ai/solver-errors";

function solve(problem: string) {
  const content = trySolveArithmetic(problem);
  if (!content) throw new Error(`Expected an instant answer for "${problem}"`);
  return content;
}

describe("trySolveArithmetic", () => {
  it("answers 5+3 with one equation step", () => {
    const content = solve("5+3");
    expect(content.steps).toHaveLength(1);
    expect(content.steps[0].block.type).toBe("equation");
    expect(content.answer.latex).toBe("8");
  });

  it("uses column addition for bigger numbers", () => {
    const block = solve("47 + 38").steps[0].block;
    expect(block).toEqual({ type: "columnArithmetic", op: "+", operands: [47, 38] });
  });

  it("uses column subtraction when the first number is not smaller", () => {
    const block = solve("100 - 38").steps[0].block;
    expect(block).toEqual({ type: "columnArithmetic", op: "-", operands: [100, 38] });
  });

  it("uses an equation for a negative result", () => {
    const content = solve("3 - 5");
    expect(content.steps[0].block.type).toBe("equation");
    expect(content.answer.latex).toBe("-2");
  });

  it.each(["156 ÷ 4", "Divide 156 by 4", "156 / 4"])("uses long division for %s", (problem) => {
    const content = solve(problem);
    expect(content.steps[0].block).toEqual({ type: "longDivision", dividend: 156, divisor: 4 });
    expect(content.answer.sentence).toBe("Quotient = 39, remainder = 0");
  });

  it("reports the remainder of a long division", () => {
    expect(solve("157 ÷ 4").answer.sentence).toBe("Quotient = 39, remainder = 1");
  });

  it("gives an exact decimal for 7 / 2", () => {
    const content = solve("7 / 2");
    expect(content.steps[0].block.type).toBe("equation");
    expect(content.answer.latex).toBe("3.5");
  });

  it("follows BODMAS for 2 + 3 × 4", () => {
    const content = solve("2 + 3 × 4");
    expect(content.steps.map((s) => s.block)).toEqual([
      { type: "equation", latex: "3 \\times 4 = 12" },
      { type: "equation", latex: "2 + 12 = 14" },
    ]);
    expect(content.answer.latex).toBe("14");
  });

  it("handles nested brackets", () => {
    const content = solve("(2 + 3) × (4 - 1)");
    expect(content.steps).toHaveLength(3);
    expect(content.answer.latex).toBe("15");
  });

  it("reads the phrases and the letter x between numbers", () => {
    expect(solve("add 12 and 30").answer.latex).toBe("42");
    expect(solve("9 minus 4").answer.latex).toBe("5");
    expect(solve("6 times 7").answer.latex).toBe("42");
    expect(solve("6 plus 7").answer.latex).toBe("13");
    expect(solve("6 x 7").answer.latex).toBe("42");
    expect(solve("6 * 7").answer.latex).toBe("42");
  });

  it("adds decimals exactly", () => {
    expect(solve("0.1 + 0.2").answer.latex).toBe("0.3");
  });

  it("returns null for anything that is not plain arithmetic", () => {
    for (const problem of [
      "x + 3 = 5",
      "sqrt(16)",
      "a = 5",
      "5",
      "-5",
      "2 ^ 3",
      "2 3",
      "5 +",
      "1234567890123 + 1",
      "10 ÷ 3 + 1",
      "1 + ".repeat(100) + "1",
      "",
    ]) {
      expect(trySolveArithmetic(problem)).toBeNull();
    }
  });

  it("throws a friendly error for division by zero", () => {
    expect(() => trySolveArithmetic("7 ÷ 0")).toThrow(UnsolvableProblemError);
    expect(() => trySolveArithmetic("7 ÷ 0")).toThrow("You can't divide by zero.");
  });

  it("always produces content that passes the solution schema", () => {
    for (const problem of [
      "5+3",
      "47 + 38",
      "100 - 38",
      "3 - 5",
      "156 ÷ 4",
      "157 ÷ 4",
      "10 ÷ 3",
      "7 / 2",
      "2 + 3 × 4",
      "(2 + 3) × (4 - 1)",
      "0.1 + 0.2",
      "-(2 + 3) * 4",
      "999999999999 * 999999999999",
    ]) {
      const content = trySolveArithmetic(problem);
      expect(content, problem).not.toBeNull();
      expect(solutionV2Schema.safeParse(content).success, problem).toBe(true);
    }
  });

  it("labels the answer as class 1 to 5 arithmetic", () => {
    const content = solve("5+3");
    expect(content.header.level).toBe("class1-5");
    expect(content.header.method).toEqual({ id: "arithmetic", label: "Arithmetic", alternatives: [] });
  });
});
