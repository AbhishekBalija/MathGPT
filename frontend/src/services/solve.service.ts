/**
 * Solve Service
 *
 * API client for the /api/solve endpoint
 */

import api from "./api";
import type { Solution, ProblemType } from "../stores/chatStore";

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
}

/**
 * Solve a math problem using the backend AI
 */
export async function solveProblem(request: SolveRequest): Promise<{
  success: boolean;
  solution?: Solution;
  error?: string;
}> {
  try {
    const response = await api.post<SolveApiResponse>("/api/solve", {
      problem: request.problem,
      mode: request.mode || "step_by_step",
      chatId: request.chatId,
    });

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

    return {
      success: false,
      error: response.data.error || "Unknown error",
    };
  } catch (error) {
    // Handle axios errors - always sanitize before passing to UI
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response?: { status: number; data?: { error?: string } };
      };

      if (axiosError.response?.status === 401) {
        return {
          success: false,
          error: "Please login to solve problems",
        };
      }

      // Get error from response but it will be sanitized in ChatWindow
      const rawError =
        axiosError.response?.data?.error || "Failed to solve problem";
      return {
        success: false,
        error: rawError,
      };
    }

    return {
      success: false,
      error: "Network error. Please try again.",
    };
  }
}
