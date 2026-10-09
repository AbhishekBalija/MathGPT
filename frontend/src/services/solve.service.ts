/**
 * Solve Service
 *
 * API client for the /api/solve endpoint
 */

import axios from "axios";
import api from "./api";
import type { Solution, ProblemType } from "../stores/chatStore";
import type { SolveFailure } from "../utils/errorMessages";

// Response type from backend
interface SolveApiResponse {
  success: boolean;
  solution?: {
    id: string;
    problem: string;
    problemType: ProblemType;
    steps: Array<{
      stepNumber: number;
      expression: string;
      justification: string;
      explanation: string;
      status: "VERIFIED" | "CORRECTED" | "FAILED" | "PENDING";
      notes?: string;
    }>;
    finalAnswer: string;
    summary: string;
    processingTimeMs: number;
    createdAt: string;
  };
  error?: string;
}

export interface SolveRequest {
  problem: string;
  mode?: "step_by_step" | "hint" | "full";
  chatId?: string;
  // Another method to solve with. The backend ignores it until PR 2.
  method?: string;
  // Lets the page cancel the request.
  signal?: AbortSignal;
}

export interface SolveResult {
  success: boolean;
  solution?: Solution;
  error?: string;
  // Set when the backend refuses because the email is not verified yet
  code?: "EMAIL_NOT_VERIFIED";
  // What went wrong, in the shape toSolveError understands. No status = no reply.
  failure?: SolveFailure;
  // The student pressed Cancel.
  aborted?: boolean;
}

// What the server sends back with an error status.
interface ErrorBody {
  error?: string;
  code?: string;
  retryAfter?: number;
  resetAt?: string;
  dailyLimit?: number;
}

/**
 * Solve a math problem using the backend AI
 */
export async function solveProblem(request: SolveRequest): Promise<SolveResult> {
  try {
    const response = await api.post<SolveApiResponse>(
      "/api/solve",
      {
        problem: request.problem,
        mode: request.mode || "step_by_step",
        chatId: request.chatId,
        method: request.method,
      },
      { signal: request.signal }
    );

    if (response.data.success && response.data.solution) {
      // Convert API response to frontend Solution type
      const apiSolution = response.data.solution;
      const solution: Solution = {
        id: apiSolution.id,
        problem: apiSolution.problem,
        problemType: apiSolution.problemType,
        steps: apiSolution.steps,
        finalAnswer: apiSolution.finalAnswer,
        summary: apiSolution.summary,
        processingTimeMs: apiSolution.processingTimeMs,
        createdAt: new Date(apiSolution.createdAt),
      };

      return { success: true, solution };
    }

    // A 200 reply that says it failed: treat it as a server problem
    return {
      success: false,
      error: response.data.error || "Unknown error",
      failure: { status: 500 },
    };
  } catch (error) {
    if (axios.isCancel(error)) {
      return { success: false, aborted: true };
    }

    // Axios puts the server's reply on error.response. No response = no network.
    const reply = (error as { response?: { status?: number; data?: ErrorBody } } | null)?.response;
    if (!reply || typeof reply.status !== "number") {
      return {
        success: false,
        error: "Network error. Please try again.",
        failure: {},
      };
    }

    const body = reply.data ?? {};
    // Pass the real status and details so the page can show the right message
    const failure: SolveFailure = {
      status: reply.status,
      code: body.code,
      retryAfter: body.retryAfter,
      resetAt: body.resetAt,
      dailyLimit: body.dailyLimit,
    };

    if (body.code === "EMAIL_NOT_VERIFIED") {
      return {
        success: false,
        error: "Please verify your email to start solving.",
        code: "EMAIL_NOT_VERIFIED",
        failure,
      };
    }

    return {
      success: false,
      error: body.error || "Failed to solve problem",
      failure,
    };
  }
}
