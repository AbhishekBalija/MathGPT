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
