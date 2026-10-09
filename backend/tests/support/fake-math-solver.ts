/**
 * Stands in for the AI during tests. Every Problem gets the same Solution
 * (with a fresh id), so tests can rely on the content and never call Gemini.
 * A Problem containing FAKE_SOLVER_FAILURE fails instead, for error tests.
 */

import { randomUUID } from "node:crypto";
import type { MathSolver } from "../../src/modules/ai/math-solver";
import type { SolutionV2Content } from "../../src/modules/solutions/solution-v2.schema";
import type { Solution } from "../../src/types/solve.types";

export const FAKE_FINAL_ANSWER = "x = 2";

// A Problem containing this text makes the fake solver fail, like the AI timing out
export const FAKE_SOLVER_FAILURE = "FAKE_SOLVER_FAILURE";
export const FAKE_SOLVER_ERROR_MESSAGE = "The AI did not answer in time";

// A Problem containing this text gets a Solution in the new format
export const FAKE_NEW_FORMAT = "FAKE_NEW_FORMAT";
// Like FAKE_NEW_FORMAT, but the content is broken, to check it is never saved
export const FAKE_BROKEN_FORMAT = "FAKE_BROKEN_FORMAT";

export const FAKE_CONTENT: SolutionV2Content = {
  formatVersion: 2,
  header: {
    level: "class9-10",
    questionType: "Algebra",
    method: { id: "inverse-operations", label: "Inverse operations", alternatives: [] },
  },
  problem: { latex: "2x = 4", task: "Solve for x" },
  steps: [
    {
      kind: "calculation",
      reason: "Divide both sides by 2",
      why: "Dividing both sides by 2 leaves x on its own.",
      earnsMarks: true,
      block: { type: "equation", latex: "x = \\frac{4}{2} = 2" },
    },
  ],
  answer: { latex: "x = 2" },
};

export function createFakeMathSolver(): MathSolver {
  return {
    async solve(problem): Promise<Solution> {
      if (problem.includes(FAKE_SOLVER_FAILURE)) {
        throw new Error(FAKE_SOLVER_ERROR_MESSAGE);
      }
      const content = problem.includes(FAKE_BROKEN_FORMAT)
        ? { ...FAKE_CONTENT, steps: [] }
        : problem.includes(FAKE_NEW_FORMAT)
          ? FAKE_CONTENT
          : undefined;
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
        ...(content && { content }),
      };
    },
  };
}
