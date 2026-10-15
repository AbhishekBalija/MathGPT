import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted, because vi.mock runs before the rest of the file
const { getHealth } = vi.hoisted(() => ({ getHealth: vi.fn() }));
vi.mock("../src/services/admin.service", () => ({ default: { getHealth } }));

import Health from "../src/pages/Admin/Health";
import { buildHealthReport } from "../src/pages/Admin/health/buildHealthReport";
import type { AdminHealth } from "../src/services/admin.service";

function health(overrides: Partial<AdminHealth> = {}): AdminHealth {
  return {
    checkedAt: "2026-10-14T17:20:00.000Z",
    services: [
      { id: "api", status: "up", ms: 0, detail: null },
      { id: "database", status: "up", ms: 38, detail: null },
      { id: "gemini", status: "up", ms: 210, detail: null },
      { id: "backup", status: "key_set", ms: null, detail: null },
      { id: "email", status: "up", ms: 120, detail: null },
      { id: "turnstile", status: "key_set", ms: null, detail: null },
      { id: "sentry", status: "key_missing", ms: null, detail: null },
      { id: "uptime", status: "up", ms: null, detail: null },
    ],
    solving: {
      tries24h: 9,
      failed24h: 2,
      days: Array.from({ length: 7 }, (_, i) => ({ day: `2026-10-${String(8 + i).padStart(2, "0")}`, tries: i, failed: i > 4 ? 1 : 0 })),
      byCode: [{ errorCode: "AI_TIMEOUT", count: 2 }],
    },
    speed: { avgMs: 8724, p90Ms: 14298 },
    live: {
      backendCommit: "c43d379",
      migrations: { applied: 11, latest: "0010_admin_redesign", pending: [] },
      env: [
        { name: "DATABASE_URL", set: true },
        { name: "SENTRY_DSN", set: false },
      ],
      uptimeCheck: { lastRunAt: "2026-10-14T17:15:00.000Z", lastResult: "success", enabled: true },
      settings: {
        current: { dailyLimit: 6, signupsOpen: true, maintenance: { on: false, message: "Back soon." } },
        recentChanges: [{ key: "dailyLimit", oldValue: 5, newValue: 6, changedAt: "2026-10-15T11:10:00.000Z" }],
      },
    },
    ...overrides,
  };
}

function renderHealth() {
  return render(
    <MemoryRouter>
      <Health />
    </MemoryRouter>,
  );
}

beforeEach(() => getHealth.mockReset());
afterEach(() => cleanup());

describe("admin Health", () => {
  it("leads with the last 24 hours and lists every service", async () => {
    getHealth.mockResolvedValue(health());
    renderHealth();

    expect(await screen.findByText("2 of 9 tries failed in the last 24 hours")).toBeTruthy();
    for (const name of ["API", "Database", "Gemini", "Backup model", "Email", "Robot check", "Error tracking", "Uptime check"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeTruthy();
    }
    // Something failed today and the Sentry key is missing
    expect(screen.getByText("Needs you")).toBeTruthy();
  });

  it("says a key is missing when nothing failed but a service has no key", async () => {
    getHealth.mockResolvedValue(health({ solving: { ...health().solving, failed24h: 0 } }));
    renderHealth();

    expect(await screen.findByText("A key is missing.")).toBeTruthy();
    expect(screen.getByText("Error tracking: key missing.")).toBeTruthy();
  });

  it("tells you how to turn the uptime check back on", async () => {
    const off = health();
    off.services = off.services.map((s) => (s.id === "uptime" ? { ...s, status: "down", detail: "Switched off in GitHub" } : s));
    getHealth.mockResolvedValue(off);
    renderHealth();

    fireEvent.click(await screen.findByRole("button", { name: /Uptime check/ }));

    expect(screen.getByText(/GitHub → Actions → Uptime check → Enable workflow/)).toBeTruthy();
  });

  it("opens a service's runbook", async () => {
    getHealth.mockResolvedValue(health());
    renderHealth();

    fireEvent.click(await screen.findByRole("button", { name: /Gemini/ }));

    expect(screen.getByText(/If this is down:/)).toBeTruthy();
    expect(screen.getByText(/free-tier limit/)).toBeTruthy();
  });

  it("says something is down, naming the service", async () => {
    const down = health();
    down.services = down.services.map((s) => (s.id === "gemini" ? { ...s, status: "down", detail: "Gemini answered 503" } : s));
    getHealth.mockResolvedValue({ ...down, solving: { ...down.solving, failed24h: 0 } });
    renderHealth();

    expect(await screen.findByText("Something is down")).toBeTruthy();
    expect(screen.getByText("Gemini is down.")).toBeTruthy();
  });

  it("is all fine when everything is up and nothing failed today", async () => {
    const allUp = health();
    allUp.services = allUp.services.map((s) => (s.status === "key_missing" ? { ...s, status: "key_set" } : s));
    getHealth.mockResolvedValue({ ...allUp, solving: { ...allUp.solving, failed24h: 0 } });
    renderHealth();

    expect(await screen.findByText("All fine")).toBeTruthy();
  });

  it("shows the report to copy by hand when the clipboard is blocked", async () => {
    getHealth.mockResolvedValue(health());
    renderHealth();

    fireEvent.click(await screen.findByRole("button", { name: "Copy health report for Claude" }));

    const box = (await screen.findByLabelText("Health report for Claude")) as HTMLTextAreaElement;
    expect(box.value).toContain("Backend: c43d379");
  });
});

describe("buildHealthReport", () => {
  it("has every service, the failures, what is live, and no email address", () => {
    const report = buildHealthReport(health(), "5b0eedd");

    for (const id of ["api", "database", "gemini", "backup", "email", "turnstile", "sentry"]) {
      expect(report).toContain(`${id}:`);
    }
    expect(report).toContain("Last 24 hours: 2 of 9 tries failed");
    expect(report).toContain("AI_TIMEOUT: 2");
    expect(report).toContain("Backend: c43d379");
    expect(report).toContain("Frontend: 5b0eedd");
    expect(report).toContain("Migrations: 11 applied, latest 0010_admin_redesign, none missing");
    expect(report).toContain("Env not set: SENTRY_DSN");
    expect(report).toContain("Uptime check: on, last ran 2026-10-14T17:15:00.000Z, success");
    expect(report).toContain("Settings: 6 free problems a day, sign-ups open, maintenance off");
    expect(report).toContain("  dailyLimit: 5 -> 6 at 2026-10-15T11:10:00.000Z");
    expect(report).not.toMatch(/@/);
  });
});
