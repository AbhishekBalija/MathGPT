/**
 * The AI solver as the rest of the app sees it: give it a Problem, get back
 * a checked solution in the new format. Routes depend on this interface, not
 * on Gemini, so tests can swap in a fake that returns deterministic results.
 */

import { askSecondOpinion, solveMathProblem } from "../../services/ai/ai.service";
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
  /** Which model wrote the solution, e.g. "gemini-2.5-flash" */
  model?: string;
};

/** A second model's final answer, used to check the first model's answer. */
export interface SecondOpinion {
  answer: string;
  model: string;
}

export interface MathSolver {
  /**
   * Throws `UnsolvableProblemError` when the Problem cannot be solved and
   * `InvalidSolverOutputError` when the AI keeps returning a broken format.
   * `method` is the id of the method the student asked for.
   */
  solve(problem: string, options?: { method?: string }): Promise<SolveResult>;

  /**
   * Asks a model from a different maker than `primaryModel` for the final
   * answer only. Null when it cannot answer.
   */
  secondOpinion(problem: string, primaryModel: string | undefined): Promise<SecondOpinion | null>;
}

export const geminiMathSolver: MathSolver = {
  solve: solveMathProblem,
  secondOpinion: askSecondOpinion,
};
