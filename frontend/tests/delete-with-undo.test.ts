import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteWithUndo } from "../src/features/solver/history/useDeleteWithUndo";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe("useDeleteWithUndo", () => {
  it("hides at once and deletes after 5 seconds", async () => {
    const commit = vi.fn(async () => true);
    const { result } = renderHook(() => useDeleteWithUndo(commit));
    act(() => result.current.remove("a"));
    expect(result.current.hidden.has("a")).toBe(true);
    expect(result.current.toast).toEqual({ kind: "undo", id: "a" });
    await wait(4900);
    expect(commit).not.toHaveBeenCalled();
    await wait(200);
    expect(commit).toHaveBeenCalledWith("a");
    expect(result.current.toast).toBeNull();
  });

  it("Undo brings it back and never deletes", async () => {
    const commit = vi.fn(async () => true);
    const { result } = renderHook(() => useDeleteWithUndo(commit));
    act(() => result.current.remove("a"));
    act(() => result.current.undo());
    expect(result.current.hidden.has("a")).toBe(false);
    await wait(6000);
    expect(commit).not.toHaveBeenCalled();
  });

  it("leaving the page deletes everything that is waiting", () => {
    const commit = vi.fn(async () => true);
    const { result, unmount } = renderHook(() => useDeleteWithUndo(commit));
    act(() => result.current.remove("a"));
    unmount();
    expect(commit).toHaveBeenCalledWith("a");
  });

  it("a failed delete unhides the item and shows a message", async () => {
    const commit = vi.fn(async () => false);
    const { result } = renderHook(() => useDeleteWithUndo(commit));
    act(() => result.current.remove("a"));
    await wait(5100);
    expect(result.current.hidden.has("a")).toBe(false);
    expect(result.current.toast).toEqual({ kind: "failed" });
    await wait(5100);
    expect(result.current.toast).toBeNull();
  });

  it("a second delete finishes the first one now and offers Undo for the second", async () => {
    const commit = vi.fn(async () => true);
    const { result } = renderHook(() => useDeleteWithUndo(commit));
    act(() => result.current.remove("a"));
    await wait(1000);
    act(() => result.current.remove("b"));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("a");
    expect(result.current.toast).toEqual({ kind: "undo", id: "b" });
    act(() => result.current.undo());
    await wait(6000);
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
