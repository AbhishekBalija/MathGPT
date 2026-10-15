import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { healthRepository } from "../src/modules/admin/health/health.repository";
import { resetHealthCache } from "../src/modules/admin/health/health.service";
import { fakeHealthProbes } from "./support/test-app";
import { authedFetch, registerAdmin } from "./support/users";

let adminToken: string;

beforeAll(async () => {
  ({ accessToken: adminToken } = await registerAdmin());
});

afterEach(() => {
  vi.restoreAllMocks();
  fakeHealthProbes.setGemini("ok");
  fakeHealthProbes.setUptime(fakeHealthProbes.recentUptimeRun());
  resetHealthCache();
});

interface Service {
  id: string;
  status: "up" | "down" | "key_set" | "key_missing";
  ms: number | null;
  detail: string | null;
}

async function health() {
  const res = await authedFetch(adminToken, "/admin/health");
  expect(res.status).toBe(200);
  return res;
}

function service(body: { services: Service[] }, id: string): Service | undefined {
  return body.services.find((entry) => entry.id === id);
}

describe("GET /admin/health", () => {
  it("checks each service and says what is live", async () => {
    const body = await (await health()).json();

    expect(service(body, "api")?.status).toBe("up");
    expect(service(body, "database")?.status).toBe("up");
    expect(service(body, "gemini")?.status).toBe("up");
    expect(service(body, "email")?.status).toBe("up");
    for (const id of ["backup", "turnstile", "sentry"]) {
      expect(["key_set", "key_missing"]).toContain(service(body, id)?.status);
    }
    expect(body.live.migrations.pending).toEqual([]);
    expect(body.live.migrations.latest).toMatch(/^\d{4}_/);
    expect(body.live.env.every((entry: { set: boolean }) => typeof entry.set === "boolean")).toBe(true);
    expect(body.solving.days).toHaveLength(7);
    expect(Number.isFinite(body.speed.avgMs)).toBe(true);
  });

  it("marks a hanging check as down after 3 seconds, and still answers", async () => {
    fakeHealthProbes.setGemini("hang");
    const started = Date.now();

    const body = await (await health()).json();

    expect(Date.now() - started).toBeLessThan(4000);
    expect(service(body, "gemini")).toMatchObject({ status: "down" });
    expect(service(body, "gemini")?.detail).toMatch(/timed out after 3000ms/);
    expect(service(body, "database")?.status).toBe("up");
  });

  it("marks a failing check as down with what it said", async () => {
    fakeHealthProbes.setGemini("fail");

    const body = await (await health()).json();

    expect(service(body, "gemini")).toMatchObject({ status: "down", detail: "Gemini said 503" });
  });

  it("never sends the value of a secret, only its name", async () => {
    const text = await (await health()).text();

    expect(text).toContain("JWT_SECRET");
    expect(text).not.toContain("test-access-secret");
  });

  it("runs the live checks at most once a minute", async () => {
    const before = fakeHealthProbes.geminiCalls;

    await health();
    await health();

    expect(fakeHealthProbes.geminiCalls - before).toBe(1);
  });

  it("still answers when the database is down, and says so", async () => {
    const down = new Error("connect ECONNREFUSED");
    vi.spyOn(healthRepository, "ping").mockRejectedValue(down);
    vi.spyOn(healthRepository, "solving").mockRejectedValue(down);
    vi.spyOn(healthRepository, "speed").mockRejectedValue(down);
    vi.spyOn(healthRepository, "appliedMigrations").mockRejectedValue(down);

    const body = await (await health()).json();

    expect(service(body, "database")).toMatchObject({ status: "down", detail: "connect ECONNREFUSED" });
    expect(body.solving.tries24h).toBe(0);
    expect(body.solving.days).toHaveLength(7);
    expect(body.speed).toEqual({ avgMs: 0, p90Ms: 0 });
    expect(body.live.migrations.applied).toBe(0);
  });

  it("shows the outside uptime check as down when its last run is over 30 minutes old", async () => {
    const lastRunAt = new Date(Date.now() - 45 * 60_000).toISOString();
    fakeHealthProbes.setUptime({ lastRunAt, lastResult: "success", enabled: true });

    const body = await (await health()).json();

    expect(body.live.uptimeCheck).toEqual({ lastRunAt, lastResult: "success", enabled: true });
    expect(service(body, "uptime")).toMatchObject({ status: "down" });
    expect(service(body, "uptime")?.detail).toMatch(/45 minutes ago/);
  });

  it("shows the uptime check as down when GitHub switched it off", async () => {
    fakeHealthProbes.setUptime({ ...fakeHealthProbes.recentUptimeRun(), enabled: false });

    const body = await (await health()).json();

    expect(service(body, "uptime")).toMatchObject({ status: "down", detail: "Switched off in GitHub" });
  });

  it("shows the uptime check as up after a recent passing run", async () => {
    const body = await (await health()).json();
    expect(service(body, "uptime")?.status).toBe("up");
  });
});
