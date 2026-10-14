import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProblemHeader } from "../src/features/solver/ProblemHeader";
import { quadratic } from "./fixtures/solutions";

afterEach(() => cleanup());

describe("ProblemHeader", () => {
  it("shows a word problem once, as words, even when the AI also wrote it as LaTeX", () => {
    // What a real proof solve stored: the same sentence in both fields
    const proof = {
      ...quadratic,
      problem: {
        latex: "\\text{Prove that the angles of a triangle add up to } 180^{\\circ}",
        text: "Prove that the angles of a triangle add up to 180 degrees",
        task: "Prove the angle sum property of a triangle",
      },
    };
    const { container } = render(<ProblemHeader solution={proof} />);
    expect(screen.getByText("Prove that the angles of a triangle add up to 180 degrees")).toBeTruthy();
    expect(container.querySelector(".katex-display")).toBeNull();
  });

  it("still shows a formula problem as a formula", () => {
    const { container } = render(<ProblemHeader solution={quadratic} />);
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });
});
