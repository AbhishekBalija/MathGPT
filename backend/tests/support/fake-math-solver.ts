/**
 * Stands in for the AI during tests. Every Problem gets the same solution
 * content, so tests can rely on it and never call Gemini.
 * A Problem containing FAKE_SOLVER_FAILURE fails instead, for error tests.
 */

import type { MathSolver, SolveResult } from "../../src/modules/ai/math-solver";
import { UnsolvableProblemError } from "../../src/services/ai/solver-errors";
import { generateValidSolution } from "../../src/services/ai/generate-solution";
import type { SolutionV2Content } from "../../src/modules/solutions/solution-v2.schema";

export const FAKE_FINAL_ANSWER = "x = 2";

// A Problem containing this text makes the fake solver fail, like the AI timing out
export const FAKE_SOLVER_FAILURE = "FAKE_SOLVER_FAILURE";
export const FAKE_SOLVER_ERROR_MESSAGE = "The AI did not answer in time";

// The fake AI's first reply is invalid and its retry is fine
export const FAKE_INVALID_OUTPUT = "FAKE_INVALID_OUTPUT";
// Like the real solver turning away a problem it cannot solve
export const FAKE_UNSOLVABLE = "FAKE_UNSOLVABLE";
// Both replies are invalid, so solving fails with the friendly 502
export const FAKE_INVALID_TWICE = "FAKE_INVALID_TWICE";
// The content is broken, to check it is never saved
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
  hint: "What can you divide both sides by to get x alone?",
};

export function createFakeMathSolver(): MathSolver {
  return {
    async solve(problem, options): Promise<SolveResult> {
      if (problem.includes(FAKE_SOLVER_FAILURE)) {
        throw new Error(FAKE_SOLVER_ERROR_MESSAGE);
      }

      if (problem.includes(FAKE_UNSOLVABLE)) {
        throw new UnsolvableProblemError("This problem cannot be solved.");
      }

      // The method the student asked for is echoed back, so tests can see it arrived
      const content: SolutionV2Content = options?.method
        ? {
            ...FAKE_CONTENT,
            header: {
              ...FAKE_CONTENT.header,
              method: { ...FAKE_CONTENT.header.method, id: options.method },
            },
          }
        : FAKE_CONTENT;

      if (problem.includes(FAKE_BROKEN_FORMAT)) {
        // Skips the checks on purpose, to prove broken content is never saved
        return { content: { ...content, steps: [] }, ...fakeResultDetails() };
      }

      // Goes through the real check-and-retry code, with a scripted "AI"
      const badReplies = problem.includes(FAKE_INVALID_TWICE)
        ? 2
        : problem.includes(FAKE_INVALID_OUTPUT)
          ? 1
          : 0;
      let calls = 0;
      const checked = await generateValidSolution(problem, "fake prompt", async () => {
        calls += 1;
        const text =
          calls <= badReplies
            ? JSON.stringify({ problemType: "algebra", solution: { formatVersion: 2 } })
            : JSON.stringify({ problemType: "algebra", solution: content });
        return { text, tokenUsage: FAKE_TOKEN_USAGE };
      });
      return { ...checked, processingTimeMs: 1 };
    },
  };
}

const FAKE_TOKEN_USAGE = { inputTokens: 10, outputTokens: 20, totalTokens: 30 };

function fakeResultDetails() {
  return {
    problemType: "algebra" as const,
    processingTimeMs: 1,
    tokenUsage: FAKE_TOKEN_USAGE,
  };
}
