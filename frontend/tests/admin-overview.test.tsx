import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted, because vi.mock runs before the rest of the file
const { getOverview } = vi.hoisted(() => ({ getOverview: vi.fn() }));
vi.mock("../src/services/admin.service", () => ({ default: { getOverview } }));

import Overview from "../src/pages/Admin/Overview";
import type { AdminOverview } from "../src/services/admin.service";
import { formatAdminTime } from "../src/pages/Admin/shared/formatAdminTime";

const today = new Date().toISOString().slice(0, 10);

function overview(overrides: Partial<AdminOverview> = {}): AdminOverview {
  return {
    status: { state: "fine", failingSince: null },
    numbers: { solves: 0, solvesToday: 0, realStudents: 0, teamStudents: 0, activeThisWeek: 0, failedTries: 0, failedTries24h: 0, tries24h: 0 },
    solvesPerDay: Array.from({ length: 7 }, (_, i) => ({ day: `2026-10-${String(8 + i).padStart(2, "0")}`, count: 0 })),
    aiUsage: { ai: 0, backup: 0, cache: 0, instant: 0, tokensToday: 0, avgTokensPerSolve: 0, limit: null, resetsAt: `${today}T07:00:00.000Z` },
    needsYou: [],
    funnel: { signedUp: 0, verified: 0, solved: 0, cameBack: 0 },
    topTopics: [],
    ...overrides,
  };
}

function renderOverview() {
  return render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  );
}

beforeEach(() => getOverview.mockReset());
afterEach(() => cleanup());

describe("admin Overview", () => {
  it("says all is fine when there is nothing, and never shows NaN", async () => {
    getOverview.mockResolvedValue(overview());
    const { container } = renderOverview();

    expect(await screen.findByText("All fine")).toBeTruthy();
    expect(screen.getByText("Nothing needs you right now.")).toBeTruthy();
    expect(screen.getByText("No real students yet.")).toBeTruthy();
    expect(container.textContent).not.toContain("NaN");
  });

  it("lists what needs you, and opens one in the details panel", async () => {
    getOverview.mockResolvedValue(
      overview({
        status: { state: "attention", failingSince: null },
        needsYou: [{ kind: "failed", id: "e1", title: "(logx)^2/x", subtitle: "UNKNOWN_ERROR · 3 tries", at: "2026-10-10T16:43:00.000Z" }],
      }),
    );
    renderOverview();

    expect(await screen.findByRole("heading", { name: "Needs you" })).toBeTruthy();
    expect(screen.getByText("1 thing needs a look.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /\(logx\)\^2\/x/ }));

    const panel = screen.getByRole("complementary", { name: "Details" });
    expect(panel.textContent).toContain("UNKNOWN_ERROR · 3 tries");
    expect(screen.getByRole("link", { name: "Open in Failed solves" }).getAttribute("href")).toBe("/admin/failed/e1");
  });

  it("closes the details when a refresh drops that item", async () => {
    const item = { kind: "failed" as const, id: "e1", title: "(logx)^2/x", subtitle: "UNKNOWN_ERROR", at: "2026-10-10T16:43:00.000Z" };
    getOverview.mockResolvedValueOnce(overview({ status: { state: "attention", failingSince: null }, needsYou: [item] })).mockResolvedValue(overview());
    renderOverview();

    fireEvent.click(await screen.findByRole("button", { name: /\(logx\)\^2\/x/ }));
    expect(screen.getByRole("complementary", { name: "Details" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByText("All fine")).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: "Details" })).toBeNull();
  });

  it("says when solving is failing", async () => {
    const since = new Date(Date.now() - 10 * 60 * 1000);
    getOverview.mockResolvedValue(overview({ status: { state: "down", failingSince: since.toISOString() } }));
    renderOverview();

    expect(await screen.findByText("Something is down")).toBeTruthy();
    expect(screen.getByText(`Solving is failing since ${formatAdminTime(since)}.`)).toBeTruthy();
  });

  it("shows Couldn't load this with Retry when the overview fails", async () => {
    getOverview.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(overview());
    renderOverview();

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByText("All fine")).toBeTruthy();
  });
});
