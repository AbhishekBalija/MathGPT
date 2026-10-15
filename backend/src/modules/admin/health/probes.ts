/**
 * Live checks against the outside services, for the admin Health screen.
 * Each throws when the service does not answer properly. Passed in through
 * AppServices so tests can use a fake instead.
 */

// The outside uptime check (a GitHub Actions workflow): when it last ran, and whether it is on
export interface UptimeCheck {
  lastRunAt: string | null;
  lastResult: "success" | "failure" | null;
  enabled: boolean;
}

export interface HealthProbes {
  gemini(): Promise<void>;
  email(): Promise<void>;
  github(): Promise<UptimeCheck>;
}

const UPTIME_WORKFLOW = "https://api.github.com/repos/AbhishekBalija/MathGPT/actions/workflows/uptime.yml";

// Stops the request itself, not just the wait, so a hung service can't keep the function running
const PROBE_TIMEOUT_MS = 3000;

async function expectOk(response: Response, name: string): Promise<void> {
  if (!response.ok) {
    throw new Error(`${name} answered ${response.status}`);
  }
}

export function createRealHealthProbes(env: NodeJS.ProcessEnv): HealthProbes {
  return {
    // Listing the models uses none of the free daily solves
    async gemini() {
      const key = env.GEMINI_MATH_AI_API;
      if (!key) throw new Error("GEMINI_MATH_AI_API is not set");
      const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(key)}`;
      // The key is in the address, so never pass the network error on as it is
      const response = await fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) }).catch(() => {
        throw new Error("Gemini did not answer");
      });
      await expectOk(response, "Gemini");
    },
    async email() {
      const key = env.RESEND_API;
      if (!key) throw new Error("RESEND_API is not set");
      const response = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      await expectOk(response, "Resend");
    },
    // The repo is public, so this needs no token
    async github() {
      const headers = { Accept: "application/vnd.github+json" };
      const signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);
      const workflow = await fetch(UPTIME_WORKFLOW, { headers, signal });
      // Not merged yet, or renamed
      if (workflow.status === 404) return { lastRunAt: null, lastResult: null, enabled: false };
      await expectOk(workflow, "GitHub");
      const { state } = (await workflow.json()) as { state: string };

      const runs = await fetch(`${UPTIME_WORKFLOW}/runs?per_page=1&status=completed`, { headers, signal });
      await expectOk(runs, "GitHub");
      const { workflow_runs: [last] = [] } = (await runs.json()) as { workflow_runs?: Array<{ updated_at: string; conclusion: string | null }> };
      return {
        lastRunAt: last?.updated_at ?? null,
        lastResult: last ? (last.conclusion === "success" ? "success" : "failure") : null,
        enabled: state === "active",
      };
    },
  };
}
