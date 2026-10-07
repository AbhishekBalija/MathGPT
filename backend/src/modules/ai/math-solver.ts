/**
 * The AI solver as the rest of the app sees it: give it a Problem, get back
 * a Solution. Routes depend on this interface, not on Gemini, so tests can
 * swap in a fake that returns deterministic Solutions.
 */

import { solveMathProblem } from "../../services/ai/ai.service";
import type { Solution } from "../../types/solve.types";

export interface MathSolver {
  /** Throws `UnsolvableProblemError` when the Problem cannot be solved. */
  solve(problem: string): Promise<Solution>;
}

export const geminiMathSolver: MathSolver = {
  solve: solveMathProblem,
};
