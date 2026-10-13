import { describe, expect, it } from "vitest";
import type { SolutionV2Content } from "../../src/modules/solutions/solution-v2.schema";
import { verifyAnswer } from "../../src/modules/solver/verify/verify-answer";
import { FAKE_CONTENT } from "../support/fake-math-solver";

// The fake solution with a different final answer, as the AI would give it
function withAnswer(latex: string): SolutionV2Content {
  return { ...FAKE_CONTENT, answer: { latex } };
}

describe("verifyAnswer: equations in one variable", () => {
  it("passes both roots of a quadratic", () => {
    expect(verifyAnswer("x^2 + 5x + 6 = 0", withAnswer("x = -2 \\text{ or } x = -3"))).toBe(
      "passed"
    );
  });

  it("fails a wrong root", () => {
    expect(verifyAnswer("x^2 + 5x + 6 = 0", withAnswer("x = 2"))).toBe("failed");
  });

  it("reads 'Solve' in front of the equation and a comma-separated answer", () => {
    expect(verifyAnswer("Solve 2x + 3 = 7", withAnswer("x = 2"))).toBe("passed");
    expect(verifyAnswer("Solve x² - 1 = 0", withAnswer("x = 1, x = -1"))).toBe("passed");
  });

  it("does not pass an answer with a root missing", () => {
    // x = -3 is also a root, so "x = -2" alone must not count as checked
    expect(verifyAnswer("x^2 + 5x + 6 = 0", withAnswer("x = -2"))).toBe("unchecked");
  });

  it("does not pass equations that have more roots than can be listed", () => {
    // sin x = 0 has infinitely many solutions
    expect(verifyAnswer("sin(x) = 0", withAnswer("x = 0"))).toBe("unchecked");
  });

  it("leaves a repeated root unchecked rather than guessing", () => {
    expect(verifyAnswer("x^2 - 2x + 1 = 0", withAnswer("x = 1"))).toBe("unchecked");
  });

  it("checks fractions written in LaTeX", () => {
    expect(verifyAnswer("3x = 1", withAnswer("x = \\frac{1}{3}"))).toBe("passed");
  });
});

describe("verifyAnswer: plain arithmetic", () => {
  it("passes a right answer and fails a wrong one", () => {
    expect(verifyAnswer("47 + 38", withAnswer("85"))).toBe("passed");
    expect(verifyAnswer("47 + 38", withAnswer("86"))).toBe("failed");
  });
});

describe("verifyAnswer: derivatives", () => {
  it("passes d/dx sin(x) = cos(x)", () => {
    expect(verifyAnswer("d/dx sin(x)", withAnswer("\\cos(x)"))).toBe("passed");
  });

  it("fails d/dx sin(x) = -cos(x)", () => {
    expect(verifyAnswer("d/dx sin(x)", withAnswer("-\\cos(x)"))).toBe("failed");
  });

  it("reads 'Differentiate' and an answer with f'(x) =", () => {
    expect(verifyAnswer("Differentiate x^3 + 2x", withAnswer("f'(x) = 3x^{2} + 2"))).toBe("passed");
  });
});

describe("verifyAnswer: integrals", () => {
  it("passes the definite integral of x^2 from 0 to 1 = 1/3", () => {
    expect(verifyAnswer("integrate x^2 from 0 to 1", withAnswer("\\frac{1}{3}"))).toBe("passed");
  });

  it("fails a wrong definite integral", () => {
    expect(verifyAnswer("integrate x^2 from 0 to 1", withAnswer("\\frac{1}{2}"))).toBe("failed");
  });

  it("passes an indefinite integral, whatever the constant", () => {
    expect(verifyAnswer("∫ x^2 dx", withAnswer("\\frac{x^{3}}{3} + C"))).toBe("passed");
    expect(verifyAnswer("∫ sin^2(2x+5) dx", withAnswer("\\frac{x}{2} - \\frac{\\sin(4x+10)}{8} + C"))).toBe(
      "passed"
    );
  });

  it("fails an antiderivative of x^2 given as x^3/3 + x(x-1)(x-2)(x-3)", () => {
    expect(
      verifyAnswer("integrate x^2 dx", withAnswer("\\frac{x^{3}}{3} + x(x-1)(x-2)(x-3) + C"))
    ).toBe("failed");
  });

  it("reads ln of an absolute value, as the AI writes it", () => {
    expect(
      verifyAnswer(
        "integrate 1/(x^2 - 16) dx",
        withAnswer("\\frac{1}{8} \\ln\\left|\\frac{x-4}{x+4}\\right| + C")
      )
    ).toBe("passed");
  });

  it("reads log written without brackets, as students type it", () => {
    expect(verifyAnswer("integrate (logx)^2/x", withAnswer("\\frac{(\\log x)^{3}}{3} + C"))).toBe(
      "passed"
    );
  });
});

describe("verifyAnswer: anything else stays unchecked", () => {
  it("does not check a geometry proof", () => {
    const content: SolutionV2Content = {
      ...FAKE_CONTENT,
      answer: { text: "Hence the angles of the triangle add up to 180 degrees." },
    };
    expect(verifyAnswer("Prove that the angles of a triangle add up to 180°", content)).toBe(
      "unchecked"
    );
  });

  it("does not check a bare expression with no task", () => {
    expect(verifyAnswer("(logx)^2/x", withAnswer("\\frac{(\\log x)^{3}}{3} + C"))).toBe("unchecked");
  });

  it("refuses an answer with more than 200 nodes", () => {
    const huge = Array.from({ length: 300 }, () => "x").join(" + ");
    expect(verifyAnswer("d/dx x^2", withAnswer(huge))).toBe("unchecked");
  });

  it("refuses an answer nested too deep", () => {
    const deep = "(".repeat(40) + "x" + ")".repeat(40);
    expect(verifyAnswer("d/dx x^2", withAnswer(deep))).toBe("unchecked");
  });

  it('refuses import("fs") and unknown functions', () => {
    expect(verifyAnswer("d/dx x^2", withAnswer('import("fs")'))).toBe("unchecked");
    expect(verifyAnswer("d/dx x^2", withAnswer("evaluate(x)"))).toBe("unchecked");
    expect(verifyAnswer("x + 1 = 3", withAnswer("x = createUnit(2)"))).toBe("unchecked");
  });

  it("refuses a second variable", () => {
    expect(verifyAnswer("d/dx x^2", withAnswer("2y"))).toBe("unchecked");
  });

  it("does not check an answer with ±", () => {
    expect(verifyAnswer("x^2 - 2 = 0", withAnswer("x = \\pm \\sqrt{2}"))).toBe("unchecked");
  });
});
