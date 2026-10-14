import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnswerStep } from "../src/features/solver/AnswerStep";

// The plain-text copies inside the answer box (KaTeX output is separate)
function plainAnswerText() {
  return screen.queryByTestId("answer-text")?.textContent ?? null;
}

describe("answer shown once", () => {
  it("hides a text copy that only repeats the formula", () => {
    render(<AnswerStep answer={{ latex: "x = 2", text: "x = 2" }} />);
    expect(plainAnswerText()).toBeNull();
  });

  it("hides a plain number or fraction next to the formula", () => {
    render(<AnswerStep answer={{ latex: "\\frac{1}{2}", text: "1/2" }} />);
    expect(plainAnswerText()).toBeNull();
  });

  it("hides copies with joining words or function names in them", () => {
    render(<AnswerStep answer={{ latex: "x = 2 \\text{ and } x = 3", text: "x = 2 and x = 3" }} />);
    expect(plainAnswerText()).toBeNull();
  });

  it("hides a copy of a trig answer", () => {
    render(<AnswerStep answer={{ latex: "2x \\cos(x^2)", text: "2x cos(x^2)" }} />);
    expect(plainAnswerText()).toBeNull();
  });

  // Real pairs saved by the AI
  it.each([
    ["x = 2", "x = 2"],
    ["x = 2", "x equals 2"],
    ["\\angle B = \\angle C", "angle B = angle C"],
  ])("hides %j written again as %j", (latex, text) => {
    render(<AnswerStep answer={{ latex, text }} />);
    expect(plainAnswerText()).toBeNull();
  });

  it("keeps a text answer in words next to the formula", () => {
    render(<AnswerStep answer={{ latex: "7", text: "Yes, 7 is a prime number" }} />);
    expect(plainAnswerText()).toBe("Yes, 7 is a prime number");
  });

  it("shows the text when there is no formula", () => {
    render(<AnswerStep answer={{ text: "x = 2" }} />);
    expect(plainAnswerText()).toBe("x = 2");
  });
});
