import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnswerStep } from "../src/features/solver/AnswerStep";
import { StepItem } from "../src/features/solver/StepItem";
import { quadratic } from "./fixtures/solutions";

function mockClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

describe("Copy button", () => {
  afterEach(() => vi.useRealTimers());

  it("says Copied, then goes back to Copy after 1.5 seconds", async () => {
    vi.useFakeTimers();
    mockClipboard(() => Promise.resolve());
    render(<AnswerStep answer={{ latex: "x = 2" }} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();

    act(() => vi.advanceTimersByTime(1499));
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
  });

  it("starts no timer if the answer goes away while copying", async () => {
    vi.useFakeTimers();
    let finish: () => void = () => {};
    mockClipboard(() => new Promise<void>((resolve) => (finish = resolve)));
    const { unmount } = render(<AnswerStep answer={{ latex: "x = 2" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    unmount();
    await act(async () => finish());

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Why? toggle", () => {
  it("tells screen readers whether it shows or hides the reason", () => {
    const step = quadratic.steps[0]!;
    render(<StepItem id="s-0" step={step} number={1} showMarks={false} />);

    const toggle = screen.getByRole("button", { name: "Why? Show the reason" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Why? Hide the reason" })).toBeTruthy();
  });
});
