import { afterEach, describe, expect, it, vi } from "vitest";
import { FAKE_SOLVER_FAILURE } from "./support/fake-math-solver";
import { uniqueProblem } from "./support/problems";
import { authedFetch, registerVerifiedUser } from "./support/users";

const MONITOR_SECRET = "test-monitor-secret";

function getMonitor(headers: Record<string, string> = {}) {
  return fetch(`${process.env.TEST_API_URL}/internal/monitor`, { headers });
}

const withSecret = { Authorization: `Bearer ${MONITOR_SECRET}` };

afterEach(() => vi.unstubAllEnvs());

describe("GET /internal/monitor", () => {
  it("is closed without the secret, with a wrong one, and when no secret is set", async () => {
    vi.stubEnv("MONITOR_SECRET", MONITOR_SECRET);
    expect((await getMonitor()).status).toBe(401);
    expect((await getMonitor({ Authorization: "Bearer wrong" })).status).toBe(401);

    vi.stubEnv("MONITOR_SECRET", "");
    expect((await getMonitor({ Authorization: "Bearer " })).status).toBe(401);
  });

  it("does not open with the cron secret", async () => {
    vi.stubEnv("MONITOR_SECRET", MONITOR_SECRET);
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    expect((await getMonitor({ Authorization: "Bearer test-cron-secret" })).status).toBe(401);
  });

  it("returns the Monitor Snapshot with the secret", async () => {
    vi.stubEnv("MONITOR_SECRET", MONITOR_SECRET);

    const res = await getMonitor(withSecret);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(["fine", "attention", "down"]).toContain(body.status.state);
  });

  it("counts solves, failures and guard rejections, with no student details in it", async () => {
    vi.stubEnv("MONITOR_SECRET", MONITOR_SECRET);
    const before = await (await getMonitor(withSecret)).json();
    const { accessToken, email } = await registerVerifiedUser();
    const solved = uniqueProblem("2x = 4");
    const failing = uniqueProblem(`integrate ${FAKE_SOLVER_FAILURE}`);

    await authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem: solved } });
    await authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem: failing } });
    await authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem: "887" } });

    // Guard rejections are recorded in the background, so wait for this one to land
    const after = await vi.waitFor(async () => {
      const body = await (await getMonitor(withSecret)).json();
      expect(body.last24h.guardRejections.number ?? 0).toBeGreaterThan(before.last24h.guardRejections.number ?? 0);
      return body;
      // Slow polling, so the route's own limit of 30 calls a minute is never hit
    }, { timeout: 5000, interval: 300 });

    expect(after.today.solves).toBeGreaterThan(before.today.solves);
    expect(after.last24h.failed).toBeGreaterThan(before.last24h.failed);
    expect(after.last24h.failures).toContainEqual(expect.objectContaining({ model: "unknown" }));
    expect(after.waiting.failedProblems).toBeGreaterThan(0);
    expect(after.services.map((service: { id: string }) => service.id)).toContain("database");
    expect(after.settings).toMatchObject({ maintenance: expect.any(Object) });

    // Numbers only: nothing a student typed or who they are
    const text = JSON.stringify(after);
    expect(text).not.toContain(email);
    expect(text).not.toContain(solved);
    expect(text).not.toContain(failing);
  });
});
