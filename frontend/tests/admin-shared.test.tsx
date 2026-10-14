import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAdminTime } from "../src/pages/Admin/shared/formatAdminTime";
import { NeoStatus } from "../src/pages/Admin/shared/NeoStatus";
import { useAutoRefresh } from "../src/pages/Admin/shared/useAutoRefresh";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("formatAdminTime", () => {
  it("shows only the time for today, in IST", () => {
    expect(formatAdminTime(new Date("2026-10-14T17:19:00Z"), new Date("2026-10-14T18:00:00Z"))).toBe("22:49");
  });

  it("adds the date for other days", () => {
    expect(formatAdminTime(new Date("2026-10-10T16:37:00Z"), new Date("2026-10-14T18:00:00Z"))).toBe("10 Oct, 22:07");
  });

  it("uses the IST day, not the UTC day", () => {
    // 19:00 UTC on 14 Oct is 00:30 IST on 15 Oct, the same IST day as 05:00 UTC on 15 Oct
    expect(formatAdminTime(new Date("2026-10-14T19:00:00Z"), new Date("2026-10-15T05:00:00Z"))).toBe("00:30");
  });
});

describe("useAutoRefresh", () => {
  it("loads now, again every minute, and not while the tab is hidden", async () => {
    vi.useFakeTimers();
    setVisibility("visible");
    const load = vi.fn(async () => "fresh");

    const { result } = renderHook(() => useAutoRefresh(load, 60_000));
    await act(async () => {});
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe("fresh");
    expect(result.current.updatedAt).toBeInstanceOf(Date);

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(load).toHaveBeenCalledTimes(2);

    setVisibility("hidden");
    await act(async () => {
      vi.advanceTimersByTime(180_000);
    });
    expect(load).toHaveBeenCalledTimes(2);

    // Coming back loads straight away
    await act(async () => {
      setVisibility("visible");
    });
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("keeps the last data and shows an error when a load fails", async () => {
    vi.useFakeTimers();
    setVisibility("visible");
    const load = vi.fn().mockResolvedValueOnce("first").mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() => useAutoRefresh(load, 60_000));
    await act(async () => {});
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.data).toBe("first");
    expect(result.current.error).toBe("offline");
  });
});

describe("useAutoRefresh with slow loads", () => {
  it("never lets an older load overwrite a newer one", async () => {
    setVisibility("visible");
    let finishSlow: (value: string) => void = () => {};
    const load = vi
      .fn()
      .mockImplementationOnce(() => new Promise<string>((resolve) => (finishSlow = resolve)))
      .mockResolvedValueOnce("new");

    const { result } = renderHook(() => useAutoRefresh(load, 60_000));
    await act(async () => {
      result.current.refresh();
    });
    expect(result.current.data).toBe("new");

    await act(async () => finishSlow("old"));
    expect(result.current.data).toBe("new");
  });
});

describe("NeoStatus", () => {
  it.each([
    ["fine", "All fine"],
    ["attention", "Needs you"],
    ["down", "Something is down"],
  ] as const)("labels the %s state", (state, label) => {
    render(<NeoStatus state={state} title="t" text="x" />);

    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByRole("status").getAttribute("data-state")).toBe(state);
  });
});
