import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/api", () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import axios from "axios";
import api from "../src/services/api";
import { solveProblem } from "../src/services/solve.service";
import { useChatStore } from "../src/stores/chatStore";
import { SOLVE_ERROR_COPY, toSolveError } from "../src/utils/errorMessages";

const post = vi.mocked(api.post);

beforeEach(() => {
  post.mockReset();
  useChatStore.setState({ solveError: null });
});

describe("solveProblem failures", () => {
  it("maps UNSOLVABLE and INVALID_OUTPUT to calm copy", () => {
    expect(toSolveError({ status: 400, code: "UNSOLVABLE" }).message).toBe(SOLVE_ERROR_COPY.unsolvable);
    expect(toSolveError({ status: 502, code: "INVALID_OUTPUT" }).message).toBe(SOLVE_ERROR_COPY.serverTrouble);
  });

  it("passes a 429 RATE_LIMITED reply through to the store", async () => {
    post.mockRejectedValue({
      response: { status: 429, data: { error: "Too many requests.", code: "RATE_LIMITED", retryAfter: 40 } },
    });
    const result = await solveProblem({ problem: "x+1=2" });
    expect(result.success).toBe(false);
    expect(result.failure).toEqual({
      status: 429,
      code: "RATE_LIMITED",
      retryAfter: 40,
      resetAt: undefined,
      dailyLimit: undefined,
    });
    useChatStore.getState().setSolveError(toSolveError(result.failure ?? {}));
    expect(useChatStore.getState().solveError).toEqual({ message: SOLVE_ERROR_COPY.rateLimit, retryAfter: 40 });
  });

  it("tells the daily limit apart from the short rate limit", async () => {
    post.mockRejectedValue({
      response: { status: 429, data: { error: "Daily limit", resetAt: "2026-10-10T00:00:00.000Z", dailyLimit: 5 } },
    });
    const result = await solveProblem({ problem: "x+1=2" });
    expect(toSolveError(result.failure ?? {}).message).toBe(SOLVE_ERROR_COPY.dailyLimit);
  });

  it("treats no reply as a network failure", async () => {
    post.mockRejectedValue(new Error("Network Error"));
    const result = await solveProblem({ problem: "x+1=2" });
    expect(result.failure).toEqual({});
    useChatStore.getState().setSolveError(toSolveError(result.failure ?? {}));
    expect(useChatStore.getState().solveError?.message).toBe(SOLVE_ERROR_COPY.network);
  });

  it("reports a cancelled request as aborted, not as an error", async () => {
    post.mockRejectedValue(new axios.CanceledError("canceled"));
    const result = await solveProblem({ problem: "x+1=2", signal: new AbortController().signal });
    expect(result.aborted).toBe(true);
    expect(result.failure).toBeUndefined();
  });

  it("sends the method and the abort signal with the request", async () => {
    post.mockRejectedValue(new Error("stop"));
    const controller = new AbortController();
    await solveProblem({ problem: "x", method: "quadratic-formula", signal: controller.signal });
    expect(post).toHaveBeenCalledWith(
      "/api/solve",
      expect.objectContaining({ problem: "x", method: "quadratic-formula" }),
      { signal: controller.signal },
    );
  });
});
