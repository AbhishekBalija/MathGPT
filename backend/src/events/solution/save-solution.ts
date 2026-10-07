/**
 * Save Solution Event Handler
 *
 * Saves the solution to MongoDB for history and retrieval.
 * Also updates user statistics.
 */

import { z } from "zod";
import { runInBackground } from "../../lib/background";
import { logger } from "../../lib/logger";
import { trackAnalytics } from "./track-analytics";
import { SolutionService } from "../../services/solution/solution.service";
import type {
  Solution,
  ProblemType,
  SolutionStep,
  StepStatus,
} from "../../types/solve.types";

const SolutionSavedSchema = z.object({
  chatId: z.string().optional(),
  userId: z.string().optional(),
  solution: z.object({
    id: z.string(),
    problem: z.string(),
    problemType: z.string(),
    steps: z.array(
      z.object({
        stepNumber: z.number(),
        expression: z.string(),
        justification: z.string(),
        explanation: z.string(),
        status: z.string(),
        notes: z.string().optional(),
      })
    ),
    finalAnswer: z.string(),
    summary: z.string(),
    processingTimeMs: z.number(),
    tokenUsage: z
      .object({
        inputTokens: z.number(),
        outputTokens: z.number(),
        totalTokens: z.number(),
      })
      .optional(),
    createdAt: z.string(),
  }),
  problemType: z.string(),
  stepsCount: z.number(),
  processingTimeMs: z.number(),
  timestamp: z.string(),
});

export type SolutionSolvedEvent = z.infer<typeof SolutionSavedSchema>;

// Saves a solved problem to MongoDB so it shows up in the user's history
export async function saveSolution(data: SolutionSolvedEvent): Promise<void> {
  const {
    chatId,
    userId,
    solution,
    problemType,
    stepsCount,
    processingTimeMs,
    timestamp,
  } = data;

  logger.info("Saving solution to database", {
    solutionId: solution.id,
    chatId,
    userId,
    problemType,
    stepsCount,
  });

  try {
    // Convert to proper Solution type for the service
    const solutionData: Solution = {
      id: solution.id,
      problem: solution.problem,
      problemType: solution.problemType as ProblemType,
      steps: solution.steps.map((step) => ({
        ...step,
        status: step.status as StepStatus,
      })) as SolutionStep[],
      finalAnswer: solution.finalAnswer,
      summary: solution.summary,
      processingTimeMs: solution.processingTimeMs,
      tokenUsage: solution.tokenUsage,
      createdAt: solution.createdAt,
    };

    const savedSolution = await SolutionService.saveSolution(
      solutionData,
      chatId,
      userId
    );

    logger.info("Solution saved to MongoDB successfully", {
      mongoId: savedSolution._id.toString(),
      originalId: solution.id,
    });

    // Analytics is not urgent, so it runs without delaying the response
    runInBackground("track-analytics", () =>
      trackAnalytics({
        event: "solution_saved",
        properties: {
          problemType,
          stepsCount,
          processingTimeMs,
          userId,
        },
        timestamp,
      })
    );
  } catch (error) {
    logger.error("Failed to save solution to MongoDB", {
      solutionId: solution.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
