import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SolutionView } from "../src/features/solver/SolutionView";
import { quadratic } from "./fixtures/solutions";

const noop = () => {};
const WARNING = "This answer didn't pass our check. Please double-check it.";

describe("answer warning", () => {
  it("shows the warning inside the answer box when the check failed", () => {
    const solution = { ...quadratic, answer: { ...quadratic.answer, warning: WARNING } };
    render(<SolutionView solution={solution} mode="all" onModeChange={noop} />);

    const answer = screen.getByTestId("answer");
    expect(answer.textContent).toContain(WARNING);
  });

  it("shows nothing extra for a normal answer", () => {
    render(<SolutionView solution={quadratic} mode="all" onModeChange={noop} />);
    expect(screen.queryByText(WARNING)).toBeNull();
  });
});
