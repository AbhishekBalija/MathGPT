/**
 * Types for the Math Solve API
 * Structured to support notebook-style step-by-step solutions
 */

import type { SolutionV2Content } from "../modules/solutions/solution-v2.schema";

// Problem types we can handle
export const PROBLEM_TYPES = [
  "algebra",
  "calculus_derivative",
  "calculus_integral",
  "calculus_limit",
  "trigonometry",
  "linear_algebra",
  "geometry",
  "statistics",
  "unknown",
] as const;
export type ProblemType = (typeof PROBLEM_TYPES)[number];

// Mode of solution delivery
export type SolveMode = "step_by_step" | "hint" | "full";

// Verification status for each step
export type StepStatus = "VERIFIED" | "CORRECTED" | "FAILED" | "PENDING";

/**
 * Individual step in a solution
 * Designed to match the notebook-style UI requirements
 */
export interface SolutionStep {
  /** Step number (1-indexed) */
  stepNumber: number;

  /** The mathematical expression in LaTeX format */
  expression: string;

  /** Brief one-liner justification of what was done */
  justification: string;

  /** Detailed explanation of HOW and WHY this step works (shown on click) */
  explanation: string;

  /** Verification status */
  status: StepStatus;

  /** Optional notes (e.g., for corrections or additional context) */
  notes?: string;
}

/**
 * Complete solution response
 */
export interface Solution {
  /** Unique identifier */
  id: string;

  /** The original problem statement */
  problem: string;

  /** Classified problem type */
  problemType: ProblemType;

  /** Array of solution steps */
  steps: SolutionStep[];

  /** Final answer/summary */
  finalAnswer: string;

  /** Brief summary of the solution approach */
  summary: string;

  /** The new step-by-step format. Absent on old-style solutions. */
  content?: SolutionV2Content;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Token usage for cost tracking */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  /** Timestamp */
  createdAt: string;
}

/**
 * Request payload for /api/solve
 */
export interface SolveRequest {
  /** The math problem to solve */
  problem: string;

  /** Solution mode */
  mode?: SolveMode;

  /** Optional chat ID for history tracking */
  chatId?: string;
}

/**
 * Response from /api/solve
 */
export interface SolveResponse {
  success: boolean;
  solution?: Solution;
  error?: string;
}
