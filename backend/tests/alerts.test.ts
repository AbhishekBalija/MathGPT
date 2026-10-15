import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createSolveAlerts } from "../src/modules/alerts/solve-alerts";
import { AllModelsFailedError } from "../src/services/ai/failover";
import { uniqueProblem } from "./support/problems";
import { fakeEmailSender, fakeMathSolver, recordingAlerts } from "./support/test-app";
import { authedFetch, registerAdmin, registerVerifiedUser } from "./support/users";

const CRON_SECRET = "test-cron-secret";
let admin: { email: string; accessToken: string };

beforeAll(async () => {
  admin = await registerAdmin();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function solve(accessToken: string, problem: string) {
  return authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem } });
}

function timeoutOnce() {
  vi.spyOn(fakeMathSolver, "solve").mockRejectedValueOnce(
    new AllModelsFailedError([
      { label: "gemini-2.5-flash", reason: "timed out after 25000ms" },
      { label: "backup", reason: "timed out after 8000ms" },
    ]),
  );
}

describe("solves tell the alerts what happened", () => {
  it("a failed AI solve reports its code, and a working one reports success", async () => {
    const { accessToken } = await registerVerifiedUser();
    const failedBefore = recordingAlerts.failed.length;
    const succeededBefore = recordingAlerts.succeeded;

    timeoutOnce();
    await solve(accessToken, uniqueProblem("2x = 4"));
    await vi.waitFor(() => expect(recordingAlerts.failed.slice(failedBefore)).toContain("AI_TIMEOUT"));

    expect((await solve(accessToken, uniqueProblem("2x = 4"))).status).toBe(200);
    await vi.waitFor(() => expect(recordingAlerts.succeeded).toBeGreaterThan(succeededBefore));
  });
});

describe("the real alerts", () => {
  // Their own alert row, so other test files never see this one failing
  const kind = () => `test-${randomUUID()}`;

  it("never email while ALERT_EMAILS_ENABLED is not set", async () => {
    const alerts = createSolveAlerts(fakeEmailSender, { env: {}, kind: kind(), origin: "https://neomath.test" });
    const before = fakeEmailSender.outbox.length;

    for (let i = 0; i < 3; i++) await alerts.onSolveFailed("AI_TIMEOUT");
    await alerts.onSolveSucceeded();

    expect(fakeEmailSender.outbox.length).toBe(before);
  });

  it("email every admin once on the 3rd failure, and again when it is back", async () => {
    const alerts = createSolveAlerts(fakeEmailSender, { env: { ALERT_EMAILS_ENABLED: "true" }, kind: kind(), origin: "https://neomath.test" });
    const subjects = () => fakeEmailSender.emailsTo(admin.email).map((email) => email.subject);
    const before = subjects().length;

    await alerts.onSolveFailed("AI_TIMEOUT");
    await alerts.onSolveFailed("AI_TIMEOUT");
    expect(subjects().length).toBe(before);
    await alerts.onSolveFailed("AI_TIMEOUT");
    await alerts.onSolveFailed("AI_TIMEOUT");
    await alerts.onSolveSucceeded();

    expect(subjects().slice(before)).toEqual(["NeoMath: solving is failing (AI_TIMEOUT)", "NeoMath: solving is back"]);
  });
});

describe("GET /internal/daily-summary", () => {
  it("needs the cron secret", async () => {
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    const call = (headers: Record<string, string>) => fetch(`${process.env.TEST_API_URL}/internal/daily-summary`, { headers });

    expect((await call({})).status).toBe(401);
    expect((await call({ Authorization: "Bearer wrong" })).status).toBe(401);
  });

  it("emails each admin what failed in the last 24 hours", async () => {
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    const { accessToken } = await registerVerifiedUser();
    const problem = uniqueProblem("integrate sec x");
    timeoutOnce();
    await solve(accessToken, problem);
    // The failure is logged in the background
    await vi.waitFor(async () => {
      const groups = (await (await authedFetch(admin.accessToken, "/admin/failed")).json()).groups;
      expect(groups.some((group: { problem: string }) => group.problem === problem)).toBe(true);
    });
    const before = fakeEmailSender.emailsTo(admin.email).length;

    const res = await fetch(`${process.env.TEST_API_URL}/internal/daily-summary`, { headers: { Authorization: `Bearer ${CRON_SECRET}` } });

    expect(res.status).toBe(200);
    const [email] = fakeEmailSender.emailsTo(admin.email).slice(before);
    expect(email?.subject).toMatch(/^NeoMath: \d+ new things? to look at$/);
    expect(email?.html).toContain(problem);
  });

  it("never runs without a secret set, even with an empty header", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await fetch(`${process.env.TEST_API_URL}/internal/daily-summary`, { headers: { Authorization: "Bearer " } });
    expect(res.status).toBe(401);
  });
});
