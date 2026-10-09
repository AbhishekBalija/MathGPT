/**
 * The AI solver as the rest of the app sees it: give it a Problem, get back
 * a checked solution in the new format. Routes depend on this interface, not
 * on Gemini, so tests can swap in a fake that returns deterministic results.
 */

import { solveMathProblem } from "../../services/ai/ai.service";
import type { ProblemType } from "../../types/solve.types";
import type { SolutionV2Content } from "../solutions/solution-v2.schema";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type SolveResult = {
  content: SolutionV2Content;
  problemType: ProblemType;
  processingTimeMs: number;
  tokenUsage?: TokenUsage;
};

export interface MathSolver {
  /**
   * Throws `UnsolvableProblemError` when the Problem cannot be solved and
   * `InvalidSolverOutputError` when the AI keeps returning a broken format.
   * `method` is the id of the method the student asked for.
   */
  solve(problem: string, options?: { method?: string }): Promise<SolveResult>;
}

export const geminiMathSolver: MathSolver = {
  solve: solveMathProblem,
};
