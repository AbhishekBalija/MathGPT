import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SolutionView } from "../src/features/solver/SolutionView";
import { quadratic } from "./fixtures/solutions";

const noop = () => {};
const LINK = "Something looks wrong? Tell us";

describe("reporting a solution", () => {
  it("shows the link under the answer and thanks the student after sending", async () => {
    const onReport = vi.fn(() => Promise.resolve(true));
    render(<SolutionView solution={quadratic} mode="all" onModeChange={noop} onReport={onReport} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: LINK }));
    });

    expect(onReport).toHaveBeenCalledOnce();
    expect(screen.getByText("Thanks. We'll check it.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: LINK })).toBeNull();
  });

  it("lets the student try again when sending fails", async () => {
    const onReport = vi.fn(() => Promise.resolve(false));
    render(<SolutionView solution={quadratic} mode="all" onModeChange={noop} onReport={onReport} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: LINK }));
    });

    expect(screen.getByText("That didn't send.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("has no link when reporting is not available", () => {
    render(<SolutionView solution={quadratic} mode="all" onModeChange={noop} />);
    expect(screen.queryByRole("button", { name: LINK })).toBeNull();
  });

  it("waits for the answer in step mode", () => {
    render(<SolutionView solution={quadratic} mode="one" onModeChange={noop} onReport={() => Promise.resolve(true)} />);
    expect(screen.queryByRole("button", { name: LINK })).toBeNull();
  });
});
