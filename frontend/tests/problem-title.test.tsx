import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProblemTitle } from "../src/features/solver/history/ProblemTitle";
import { titleAsLatex } from "../src/features/solver/history/titleAsLatex";

afterEach(() => cleanup());

describe("titleAsLatex", () => {
  it("treats typed LaTeX as math", () => {
    expect(titleAsLatex("\\int 1/(x^2 - 16) dx")).toBe("\\int 1/(x^2 - 16) dx");
  });

  it("turns bare function names into LaTeX ones so they are not drawn in italics", () => {
    expect(titleAsLatex("∫ sin^2 ( 2x +5)")).toBe("∫ \\sin^2 ( 2x +5)");
    expect(titleAsLatex("\\int sec x (sec x + tan x)dx")).toBe("\\int \\sec x (\\sec x + \\tan x)dx");
  });

  it("leaves word problems and plain sums as text", () => {
    expect(titleAsLatex("Simplify (3x² + 6x) / 3x")).toBeNull();
    expect(titleAsLatex("Solve x^2 + 5x + 6 = 0")).toBeNull();
    expect(titleAsLatex("156 ÷ 4")).toBeNull();
  });

  it("falls back to text when the LaTeX is broken", () => {
    expect(titleAsLatex("\\frac{1}{")).toBeNull();
  });
});

describe("ProblemTitle", () => {
  it("draws math titles with KaTeX", () => {
    const { container } = render(<ProblemTitle problem="\int 1/(x^2 - 16) dx" />);
    expect(container.querySelector(".katex")).not.toBeNull();
    // The visible part only; KaTeX keeps the LaTeX in a hidden copy for screen readers
    expect(container.querySelector(".katex-html")?.textContent).not.toContain("\\int");
  });

  it("shows word titles as they were typed", () => {
    const { container } = render(<ProblemTitle problem="Simplify (3x² + 6x) / 3x" />);
    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toBe("Simplify (3x² + 6x) / 3x");
  });
});
