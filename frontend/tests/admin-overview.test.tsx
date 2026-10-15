import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted, because vi.mock runs before the rest of the file
const { getOverview, getHealth } = vi.hoisted(() => ({ getOverview: vi.fn(), getHealth: vi.fn() }));
vi.mock("../src/services/admin.service", () => ({ default: { getOverview, getHealth } }));
const appStatus = vi.hoisted(() => ({ value: null as null | { maintenance: { on: boolean; message: string }; signupsOpen: boolean } }));
vi.mock("../src/stores/appStatusStore", () => ({ useAppStatus: () => ({ status: appStatus.value, load: vi.fn() }) }));

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

const upServices = ["api", "database", "gemini", "backup", "email", "turnstile", "sentry"].map((id) => ({
  id,
  status: id === "backup" || id === "turnstile" || id === "sentry" ? "key_set" : "up",
  ms: 10,
  detail: null,
}));

function healthWith(services = upServices) {
  return {
    checkedAt: new Date().toISOString(),
    services,
    solving: { tries24h: 0, failed24h: 0, days: [], byCode: [] },
    speed: { avgMs: 0, p90Ms: 0 },
    live: { backendCommit: "local", migrations: { applied: 11, latest: "0010_admin_redesign", pending: [] }, env: [] },
  };
}

beforeEach(() => {
  getOverview.mockReset();
  getHealth.mockReset();
  getHealth.mockResolvedValue(healthWith());
});
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

  it("says so while maintenance mode is on, so it isn't forgotten", async () => {
    appStatus.value = { maintenance: { on: true, message: "Back soon." }, signupsOpen: true };
    getOverview.mockResolvedValue(overview());
    renderOverview();

    expect(await screen.findByText("Maintenance mode is on: students can't solve.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Settings" }).getAttribute("href")).toBe("/admin/settings");
    appStatus.value = null;
  });

  it("puts a service that is down in Neo's line, even when nothing else needs you", async () => {
    getOverview.mockResolvedValue(overview());
    getHealth.mockResolvedValue(healthWith(upServices.map((s) => (s.id === "gemini" ? { ...s, status: "down", detail: "503" } : s))));
    renderOverview();

    expect(await screen.findByText("Something is down")).toBeTruthy();
    expect(screen.getByText("Gemini is down.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Health" }).getAttribute("href")).toBe("/admin/health");
  });

  it("still shows the rest when the health check fails", async () => {
    getOverview.mockResolvedValue(overview());
    getHealth.mockRejectedValue(new Error("offline"));
    renderOverview();

    expect(await screen.findByText("All fine")).toBeTruthy();
    expect(await screen.findByText("Couldn't check services.")).toBeTruthy();
  });

  it("shows Couldn't load this with Retry when the overview fails", async () => {
    getOverview.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(overview());
    renderOverview();

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByText("All fine")).toBeTruthy();
  });
});
