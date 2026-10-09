/**
 * History Service
 *
 * API client for user history
 */

import api from "./api";
import type { SolutionContent } from "../features/solver/model/resolve";

export interface HistoryItem {
  id: string;
  chatId?: string;
  problem: string;
  problemType: string;
  finalAnswer: string;
  summary: string;
  stepsCount: number;
  // 1 for old rows, 2 for typed-block solutions
  formatVersion?: number;
  createdAt: string;
}

interface HistoryResponse {
  success: boolean;
  history: HistoryItem[];
}

/**
 * Load user's solution history
 */
export async function getUserHistory(): Promise<HistoryItem[]> {
  try {
    const response = await api.get<HistoryResponse>("/api/history");

    if (response.data.success) {
      return response.data.history;
    }
    return [];
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
}

export interface FullSolution {
  id: string;
  problem: string;
  problemType: string;
  steps: Array<{
    stepNumber: number;
    expression: string;
    justification: string;
    explanation: string;
    status: string;
    notes?: string;
  }>;
  finalAnswer: string;
  summary: string;
  processingTimeMs: number;
  createdAt: string;
  // The typed blocks of a v2 solution. null for old rows.
  formatVersion?: number;
  content?: SolutionContent | null;
}

interface SolutionResponse {
  success: boolean;
  solution: FullSolution;
}

/**
 * Fetch full solution by ID
 */
export async function getSolutionById(
  solutionId: string
): Promise<FullSolution | null> {
  try {
    const response = await api.get<SolutionResponse>(
      `/api/solution/${solutionId}`
    );

    if (response.data.success) {
      return response.data.solution;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch solution:", error);
    return null;
  }
}

/**
 * Delete a solution by ID
 */
export async function deleteSolution(solutionId: string): Promise<boolean> {
  try {
    const response = await api.delete<{ success: boolean }>(
      `/api/solution/${solutionId}`
    );
    return response.data.success;
  } catch (error) {
    console.error("Failed to delete solution:", error);
    return false;
  }
}

/**
 * Clear all user history
 */
export async function clearAllHistory(): Promise<boolean> {
  try {
    const response = await api.delete<{ success: boolean }>("/api/history");
    return response.data.success;
  } catch (error) {
    console.error("Failed to clear history:", error);
    return false;
  }
}
