/**
 * History Service
 *
 * API client for user history
 */

import api from "./api";

export interface HistoryItem {
  id: string;
  chatId?: string;
  problem: string;
  problemType: string;
  finalAnswer: string;
  summary: string;
  stepsCount: number;
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
