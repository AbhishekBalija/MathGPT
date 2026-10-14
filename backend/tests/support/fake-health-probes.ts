/**
 * Stands in for the real Gemini and Resend health checks during tests.
 * A test can make Gemini fail or hang, and see how often it was asked.
 */

import type { HealthProbes } from "../../src/modules/admin/health/probes";

type Behaviour = "ok" | "fail" | "hang";

export interface FakeHealthProbes extends HealthProbes {
  setGemini(behaviour: Behaviour): void;
  geminiCalls: number;
}

export function createFakeHealthProbes(): FakeHealthProbes {
  let gemini: Behaviour = "ok";
  const probes: FakeHealthProbes = {
    geminiCalls: 0,
    setGemini(behaviour) {
      gemini = behaviour;
    },
    async gemini() {
      probes.geminiCalls += 1;
      if (gemini === "fail") throw new Error("Gemini said 503");
      // Never answers, like a provider that hangs
      if (gemini === "hang") await new Promise(() => {});
    },
    async email() {},
  };
  return probes;
}
