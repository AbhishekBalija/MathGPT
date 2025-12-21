/**
 * Save Solution Event Handler
 *
 * Subscribes to: problem-solved
 *
 * Saves the solution to MongoDB for history and retrieval.
 * Also updates user statistics.
 */

import { EventConfig, Handlers } from "motia";
import { z } from "zod";
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
    createdAt: z.string(),
  }),
  problemType: z.string(),
  stepsCount: z.number(),
  processingTimeMs: z.number(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "SaveSolution",
  description: "Saves solution to database for history tracking",
  subscribes: ["problem-solved"],
  emits: [{ topic: "analytics-track", label: "Track Analytics" }],
  input: SolutionSavedSchema,
  flows: ["SolutionFlow"],
};

export const handler: Handlers["SaveSolution"] = async (
  data,
  { emit, logger, state }
) => {
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
      createdAt: solution.createdAt,
    };

    // Save to MongoDB via SolutionService
    const savedSolution = await SolutionService.saveSolution(
      solutionData,
      chatId,
      userId
    );

    logger.info("Solution saved to MongoDB successfully", {
      mongoId: savedSolution._id.toString(),
      originalId: solution.id,
    });

    // Also cache in state for quick retrieval
    await state.set("solutions", solution.id, {
      ...solution,
      mongoId: savedSolution._id.toString(),
      chatId,
      userId,
      savedAt: new Date().toISOString(),
    });

    // Track analytics
    emit({
      topic: "analytics-track",
      data: {
        event: "solution_saved",
        properties: {
          problemType,
          stepsCount,
          processingTimeMs,
          userId,
        },
        timestamp,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to save solution to MongoDB", {
      solutionId: solution.id,
      error: errorMessage,
    });

    // Still try to cache in state even if MongoDB fails
    try {
      await state.set("solutions", solution.id, {
        ...solution,
        chatId,
        userId,
        savedAt: new Date().toISOString(),
        mongoSaveError: errorMessage,
      });
      logger.info("Solution cached in state as fallback", {
        solutionId: solution.id,
      });
    } catch (stateError) {
      logger.error("Failed to cache solution in state", {
        solutionId: solution.id,
        error: stateError instanceof Error ? stateError.message : "Unknown",
      });
    }
  }
};
