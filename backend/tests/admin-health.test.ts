import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { resetHealthCache } from "../src/modules/admin/health/health.service";
import { fakeHealthProbes } from "./support/test-app";
import { authedFetch, registerAdmin } from "./support/users";

let adminToken: string;

beforeAll(async () => {
  ({ accessToken: adminToken } = await registerAdmin());
});

afterEach(() => {
  fakeHealthProbes.setGemini("ok");
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
});
