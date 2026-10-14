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
    for (const name of ["API", "Database", "Gemini", "Backup model", "Email", "Robot check", "Error tracking"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeTruthy();
    }
    expect(screen.getByText("Needs you")).toBeTruthy();
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
    getHealth.mockResolvedValue(health({ solving: { ...health().solving, failed24h: 0 } }));
    renderHealth();

    expect(await screen.findByText("All fine")).toBeTruthy();
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
    expect(report).not.toMatch(/@/);
  });
});
