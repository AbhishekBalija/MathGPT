/**
 * Live checks against the outside services, for the admin Health screen.
 * Each throws when the service does not answer properly. Passed in through
 * AppServices so tests can use a fake instead.
 */

export interface HealthProbes {
  gemini(): Promise<void>;
  email(): Promise<void>;
}

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
      await expectOk(await fetch(url), "Gemini");
    },
    async email() {
      const key = env.RESEND_API;
      if (!key) throw new Error("RESEND_API is not set");
      await expectOk(await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } }), "Resend");
    },
  };
}
