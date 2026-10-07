/**
 * Stands in for the AI during tests. Every Problem gets the same Solution
 * (with a fresh id), so tests can rely on the content and never call Gemini.
 */

import { randomUUID } from "node:crypto";
import type { MathSolver } from "../../src/modules/ai/math-solver";
import type { Solution } from "../../src/types/solve.types";

export const FAKE_FINAL_ANSWER = "x = 2";

export function createFakeMathSolver(): MathSolver {
  return {
    async solve(problem): Promise<Solution> {
      return {
        id: randomUUID(),
        problem,
        problemType: "algebra",
        steps: [
          {
            stepNumber: 1,
            expression: "2x = 4",
            justification: "Start from the equation",
            explanation: "This is the equation we were given.",
            status: "VERIFIED",
          },
          {
            stepNumber: 2,
            expression: "x = 2",
            justification: "Divide both sides by 2",
            explanation: "Dividing both sides by 2 leaves x on its own.",
            status: "VERIFIED",
          },
        ],
        finalAnswer: FAKE_FINAL_ANSWER,
        summary: "Isolate x by dividing both sides by 2.",
        processingTimeMs: 1,
        tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        createdAt: new Date().toISOString(),
      };
    },
  };
}
