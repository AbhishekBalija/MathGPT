import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteSolution = vi.fn(async () => true);
vi.mock("../src/services/history.service", () => ({ deleteSolution }));

import { useChatStore } from "../src/stores/chatStore";

describe("chatStore.deleteChat", () => {
  beforeEach(() => {
    deleteSolution.mockClear();
    useChatStore.setState({ globalLoading: false });
  });

  it("never shows the full-screen overlay for a silent delete (delete with Undo)", async () => {
    const seen: boolean[] = [];
    const stop = useChatStore.subscribe((state) => seen.push(state.globalLoading));

    await useChatStore.getState().deleteChat("chat-1", "solution-1", { silent: true });
    stop();

    expect(deleteSolution).toHaveBeenCalledWith("solution-1");
    expect(seen.every((loading) => loading === false)).toBe(true);
    expect(useChatStore.getState().globalLoading).toBe(false);
  });
});

describe("chatStore.fetchSolution", () => {
  it("tells the student when a saved solution cannot be read", async () => {
    const { useAppDataStore } = await import("../src/stores/appDataStore");
    // A reply with neither the new content nor the old fields
    vi.spyOn(useAppDataStore.getState(), "getCachedSolution").mockReturnValue(null);
    vi.spyOn(useAppDataStore.getState(), "fetchAndCacheSolution").mockResolvedValue({
      id: "solution-1",
      createdAt: "2026-10-14T00:00:00.000Z",
    } as never);
    useChatStore.setState({ solveError: null });

    await useChatStore.getState().fetchSolution("chat-1", "solution-1");

    expect(useChatStore.getState().solveError).toEqual({
      message: "We couldn't open that solution. Try again from History.",
      noAction: true,
    });
  });
});
