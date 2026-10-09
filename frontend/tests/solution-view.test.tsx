import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SolutionView } from "../src/features/solver/SolutionView";
import { division156, quadratic, trainProblem } from "./fixtures/solutions";

const noop = () => {};

describe("SolutionView", () => {
  it("numbers mark-earning steps pink and working steps grey", () => {
    render(<SolutionView solution={quadratic} mode="all" onModeChange={noop} />);
    expect(screen.getByTestId("step-num-1").dataset.marks).toBe("false");
    expect(screen.getByTestId("step-num-2").dataset.marks).toBe("true");
    expect(screen.getByText("Pink numbers are the steps that earn marks in exams.")).toBeTruthy();
  });
  it("hides the marks key for class 1-5", () => {
    render(<SolutionView solution={division156} mode="all" onModeChange={noop} />);
    expect(screen.queryByText(/earn marks/)).toBeNull();
    expect(screen.getByTestId("step-num-1").dataset.marks).toBe("false");
  });
  it("hides the marks key when no step earns marks", () => {
    const untagged = { ...quadratic, steps: quadratic.steps.map((s) => ({ ...s, earnsMarks: false })) };
    render(<SolutionView solution={untagged} mode="all" onModeChange={noop} />);
    expect(screen.queryByText(/earn marks/)).toBeNull();
  });
  it("puts the answer last with Copy, and no answer above the steps", () => {
    render(<SolutionView solution={quadratic} mode="all" onModeChange={noop} />);
    const items = screen.getAllByTestId(/^(step|answer)$/);
    expect(items.at(-1)?.dataset.testid).toBe("answer");
    expect(screen.getAllByTestId("answer")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
  });
  it("in step mode reveals one step at a time and hides the answer", () => {
    render(<SolutionView solution={quadratic} mode="one" onModeChange={noop} />);
    expect(screen.getAllByTestId("step")).toHaveLength(1);
    expect(screen.queryByTestId("answer")).toBeNull();
    expect(screen.getByText("The answer shows after the last step.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getAllByTestId("step")).toHaveLength(2);
  });
  it("shows the answer after the last step in step mode", () => {
    render(<SolutionView solution={quadratic} mode="one" onModeChange={noop} />);
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getAllByTestId("step")).toHaveLength(4);
    expect(screen.getByTestId("answer")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Next step" })).toBeNull();
  });
  it("reveals every step and the answer with Show it now", () => {
    render(<SolutionView solution={quadratic} mode="one" onModeChange={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "Show it now" }));
    expect(screen.getAllByTestId("step")).toHaveLength(4);
    expect(screen.getByTestId("answer")).toBeTruthy();
  });
  it("uses renderNextStep when the layout supplies its own button", () => {
    render(
      <SolutionView
        solution={quadratic}
        mode="one"
        onModeChange={noop}
        renderNextStep={(next, shown, total) => (
          <button onClick={next}>
            Go {shown}/{total}
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go 1/4" }));
    expect(screen.getAllByTestId("step")).toHaveLength(2);
  });
  it("toggles the longer why", () => {
    render(<SolutionView solution={quadratic} mode="all" onModeChange={noop} />);
    expect(screen.queryByText(/product is 6/)).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: /why/i })[0]);
    expect(screen.getByText(/product is 6/)).toBeTruthy();
  });
  it("shows the method with Change only when alternatives exist", () => {
    const { unmount } = render(<SolutionView solution={quadratic} mode="all" onModeChange={noop} />);
    expect(screen.getByText("Method: Factorisation")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Change" })).toBeTruthy();
    unmount();
    render(<SolutionView solution={division156} mode="all" onModeChange={noop} />);
    expect(screen.getByText("Method: Long division")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
  });
  it("shows Given / To find when the profile allows and sections exist", () => {
    const { unmount } = render(<SolutionView solution={trainProblem} mode="all" onModeChange={noop} />);
    expect(screen.getByText("Given:")).toBeTruthy();
    expect(screen.getByText("To find:")).toBeTruthy();
    unmount();
    // Same sections on a level that hides them.
    const young = { ...trainProblem, header: { ...trainProblem.header, level: "class1-5" as const } };
    render(<SolutionView solution={young} mode="all" onModeChange={noop} />);
    expect(screen.queryByText("Given:")).toBeNull();
  });
  it("shows the check line only when the answer has one", () => {
    const noCheck = { ...quadratic, answer: { latex: quadratic.answer.latex } };
    const { unmount } = render(<SolutionView solution={quadratic} mode="all" onModeChange={noop} />);
    expect(screen.getByText(/^Check:/)).toBeTruthy();
    unmount();
    render(<SolutionView solution={noCheck} mode="all" onModeChange={noop} />);
    expect(screen.queryByText(/^Check:/)).toBeNull();
  });
  it("links Jump to answer to the answer box", () => {
    render(<SolutionView solution={quadratic} mode="all" onModeChange={noop} />);
    expect(screen.getByRole("link", { name: "Jump to answer" }).getAttribute("href")).toBe("#answer");
    expect(document.getElementById("answer")).toBeTruthy();
  });
});
