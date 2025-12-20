/**
 * Solution Service
 *
 * Business logic layer for solution operations.
 * Wraps the repository and adds any additional logic.
 */

import {
  solutionRepository,
  SolutionCreate,
  SolutionDocument,
} from "../../repositories/solution.repository";
import type { Solution, ProblemType } from "../../types/solve.types";

export const SolutionService = {
  /**
   * Save a solution from the AI response
   */
  async saveSolution(
    solution: Solution,
    chatId?: string,
    userId?: string
  ): Promise<SolutionDocument> {
    const data: SolutionCreate = {
      problem: solution.problem,
      problemType: solution.problemType,
      steps: solution.steps,
      finalAnswer: solution.finalAnswer,
      summary: solution.summary,
      processingTimeMs: solution.processingTimeMs,
      chatId,
      userId,
    };

    return solutionRepository.create(data);
  },

  /**
   * Get a solution by ID
   */
  async getSolutionById(id: string): Promise<SolutionDocument | null> {
    return solutionRepository.findById(id);
  },

  /**
   * Get solutions for a chat
   */
  async getSolutionsByChatId(chatId: string): Promise<SolutionDocument[]> {
    return solutionRepository.findByChatId(chatId);
  },

  /**
   * Get solution history for a user (for sidebar)
   */
  async getUserHistory(userId: string, limit = 20) {
    return solutionRepository.getHistoryByUserId(userId, limit);
  },

  /**
   * Get user statistics
   */
  async getUserStats(userId: string) {
    return solutionRepository.getUserStats(userId);
  },

  /**
   * Get analytics by problem type
   */
  async getProblemTypeAnalytics(): Promise<Record<string, number>> {
    return solutionRepository.countByProblemType();
  },

  /**
   * Delete a solution (for user)
   */
  async deleteSolution(id: string, userId: string): Promise<boolean> {
    // First verify the solution belongs to the user
    const solution = await solutionRepository.findById(id);
    if (!solution || solution.userId !== userId) {
      return false;
    }
    return solutionRepository.delete(id);
  },

  /**
   * Delete all solutions for a user (account deletion)
   */
  async deleteAllUserSolutions(userId: string): Promise<number> {
    return solutionRepository.deleteByUserId(userId);
  },
};
