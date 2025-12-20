/**
 * Types for the Math Solve API
 * Structured to support notebook-style step-by-step solutions
 */

// Problem types we can handle
export type ProblemType =
  | "algebra"
  | "calculus_derivative"
  | "calculus_integral"
  | "calculus_limit"
  | "trigonometry"
  | "linear_algebra"
  | "geometry"
  | "statistics"
  | "unknown";

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

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Timestamp */
  createdAt: Date;
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

/**
 * Raw response structure from Gemini AI
 * This is what we expect the AI to return (before parsing)
 */
export interface AISolutionResponse {
  problemType: ProblemType;
  steps: Array<{
    expression: string;
    justification: string;
    explanation: string;
  }>;
  finalAnswer: string;
  summary: string;
}
