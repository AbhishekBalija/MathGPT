import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "../src/features/solver/states/EmptyState";
import { ErrorState } from "../src/features/solver/states/ErrorState";
import { HintCard } from "../src/features/solver/states/HintCard";
import { ThinkingState } from "../src/features/solver/states/ThinkingState";
import { useChatStore } from "../src/stores/chatStore";
import { SOLVE_ERROR_COPY, toSolveError } from "../src/utils/errorMessages";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ErrorState", () => {
  it("counts down from the server's retryAfter and enables Try again at zero", () => {
    const retry = vi.fn();
    render(<ErrorState message="That's 5 problems in a minute." retryAfter={40} onRetry={retry} />);
    expect(screen.getByText("0:40")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Try again" }) as HTMLButtonElement).disabled).toBe(true);
    act(() => {
      vi.advanceTimersByTime(40_000);
    });
    const button = screen.getByRole("button", { name: "Try again" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledOnce();
  });
  it("shows minutes as m:ss", () => {
    render(<ErrorState message="Wait" retryAfter={75} onRetry={() => {}} />);
    expect(screen.getByText("1:15")).toBeTruthy();
  });
  it("is ready straight away with no retryAfter", () => {
    render(<ErrorState message="No internet. Your problem is still here." onRetry={() => {}} />);
    expect((screen.getByRole("button", { name: "Try again" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("clears its timer on unmount", () => {
    const { unmount } = render(<ErrorState message="Wait" retryAfter={10} onRetry={() => {}} />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("ThinkingState", () => {
  it("changes the thinking text after 15 seconds", () => {
    render(<ThinkingState onCancel={() => {}} />);
    expect(screen.getByText("Neo is working through it…")).toBeTruthy();
    expect(screen.getByText("Usually takes about 10 seconds.")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(screen.getByText("Still working on it. Tricky one!")).toBeTruthy();
  });
  it("calls onCancel and clears its timer on unmount", () => {
    const cancel = vi.fn();
    const { unmount } = render(<ThinkingState onCancel={cancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalledOnce();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("EmptyState", () => {
  it("shows the heading and line", () => {
    render(<EmptyState onPick={() => {}} />);
    expect(screen.getByText("What are we solving?")).toBeTruthy();
    expect(screen.getByText("Type a problem below. Neo shows every step.")).toBeTruthy();
  });
  it("picks an example problem", () => {
    const pick = vi.fn();
    render(<EmptyState onPick={pick} />);
    fireEvent.click(screen.getByText("Class 10").closest("button")!);
    expect(pick).toHaveBeenCalledWith("x^2 + 5x + 6 = 0");
    fireEvent.click(screen.getByText("Class 3").closest("button")!);
    expect(pick).toHaveBeenLastCalledWith("156 ÷ 4");
    fireEvent.click(screen.getByText("College").closest("button")!);
    expect(pick).toHaveBeenLastCalledWith("\\int x e^x dx");
  });
});

describe("HintCard", () => {
  it("wires its two buttons", () => {
    const show = vi.fn();
    const tryIt = vi.fn();
    render(<HintCard hint="Look for two numbers that multiply to 6." onShowSolution={show} onTryIt={tryIt} />);
    expect(screen.getByText(/multiply to 6/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show the full solution" }));
    expect(show).toHaveBeenCalledOnce();
    expect(tryIt).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "I'll try it" }));
    expect(tryIt).toHaveBeenCalledOnce();
  });
});

describe("toSolveError", () => {
  it("maps a rate limit and keeps retryAfter", () => {
    expect(toSolveError({ status: 429, code: "RATE_LIMITED", retryAfter: 40 })).toEqual({
      message: SOLVE_ERROR_COPY.rateLimit,
      retryAfter: 40,
    });
  });
  it("maps the daily limit (429 with resetAt, no countdown)", () => {
    expect(toSolveError({ status: 429, resetAt: "2026-10-10T00:00:00Z", dailyLimit: 5 })).toEqual({
      message: "You've used today's 5 free problems. Come back tomorrow.",
    });
  });
  it("maps an unreadable problem", () => {
    expect(toSolveError({ status: 422 }).message).toBe(
      "I couldn't read that problem. Try writing it like x^2 + 5x + 6 = 0.",
    );
  });
  it("maps no reply to the network message", () => {
    expect(toSolveError({})).toEqual({ message: "No internet. Your problem is still here." });
  });
});

describe("chat store solver fields", () => {
  it("starts empty and updates", () => {
    const s = useChatStore.getState();
    expect(s.pendingProblem).toBeNull();
    expect(s.solveError).toBeNull();
    expect(s.view).toBe("all");
    s.setPendingProblem("1+1");
    s.setSolveError({ message: "x", retryAfter: 3 });
    s.setView("hint");
    const next = useChatStore.getState();
    expect(next.pendingProblem).toBe("1+1");
    expect(next.solveError).toEqual({ message: "x", retryAfter: 3 });
    expect(next.view).toBe("hint");
  });
});
