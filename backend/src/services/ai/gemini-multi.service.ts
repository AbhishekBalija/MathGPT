/**
 * Gemini Multi-Model Service
 *
 * Calls multiple Gemini models in parallel using your API key.
 * No rate limits like OpenRouter!
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type AISolutionResponse,
  type Solution,
  type SolutionStep,
  type ProblemType,
} from "../../types/solve.types";
import { MATH_TUTOR_SYSTEM_PROMPT, buildSolvePrompt } from "./prompts";

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_MATH_AI_API || "");

// Gemini models to use (all with your API key - no limits!)
const GEMINI_MODELS = [
  { id: "gemini-3-flash-preview", weight: 1.0 }, // Newest
  { id: "gemini-2.5-flash", weight: 1.5 }, // Best
  { id: "gemini-2.5-flash-lite", weight: 1.3 }, // Fast
  { id: "gemini-2.0-flash", weight: 1.1 }, // Closed model
  { id: "gemma-3-27b-it", weight: 1.2 }, // Open model
  { id: "gemini-3-pro-preview", weight: 1.2 }, // Good backup
];

// Timeout for multi-model (20 seconds)
const TIMEOUT_MS = 20000;

interface ModelResponse {
  model: string;
  solution: AISolutionResponse;
  latencyMs: number;
  weight: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

// Store successful responses as they arrive
let successfulResponses: ModelResponse[] = [];

/**
 * Call a single Gemini model
 */
async function callGeminiModel(
  modelId: string,
  prompt: string,
  systemPrompt: string
): Promise<{
  response: AISolutionResponse;
  tokenUsage?: ModelResponse["tokenUsage"];
}> {
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4096,
    },
  });

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: prompt },
  ]);

  const response = result.response;
  const text = response.text();

  // Get token usage
  const usageMetadata = response.usageMetadata;
  const tokenUsage = usageMetadata
    ? {
        inputTokens: usageMetadata.promptTokenCount || 0,
        outputTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      }
    : undefined;

  return { response: parseAIResponse(text), tokenUsage };
}

/**
 * Parse AI response JSON
 */
function parseAIResponse(text: string): AISolutionResponse {
  let cleanedText = text.trim();

  if (cleanedText.startsWith("```json")) {
    cleanedText = cleanedText.slice(7);
  } else if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.slice(3);
  }

  if (cleanedText.endsWith("```")) {
    cleanedText = cleanedText.slice(0, -3);
  }

  cleanedText = cleanedText.trim();

  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
  }

  return JSON.parse(cleanedText) as AISolutionResponse;
}

/**
 * Call multiple Gemini models in parallel, return the best one
 */
export async function solveWithGeminiModels(
  problem: string
): Promise<Solution> {
  const startTime = Date.now();
  const prompt = buildSolvePrompt(problem);

  successfulResponses = [];

  console.log("\n========== GEMINI MULTI-MODEL ==========");
  console.log(`Calling ${GEMINI_MODELS.length} Gemini models in parallel...`);

  // Call all models in parallel
  const modelCalls = GEMINI_MODELS.map(async (model) => {
    const modelStart = Date.now();
    try {
      const { response, tokenUsage } = await callGeminiModel(
        model.id,
        prompt,
        MATH_TUTOR_SYSTEM_PROMPT
      );
      const latencyMs = Date.now() - modelStart;
      console.log(`✅ ${model.id}: ${latencyMs}ms`);
      successfulResponses.push({
        model: model.id,
        solution: response,
        latencyMs,
        weight: model.weight,
        tokenUsage,
      });
      return true;
    } catch (error) {
      const latencyMs = Date.now() - modelStart;
      console.log(
        `❌ ${model.id}: ${
          error instanceof Error ? error.message : "Failed"
        } (${latencyMs}ms)`
      );
      return false;
    }
  });

  // Wait for all with timeout
  await Promise.race([
    Promise.all(modelCalls),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log(`⏱️ Timeout (${TIMEOUT_MS}ms) - using best available`);
        resolve();
      }, TIMEOUT_MS);
    }),
  ]);

  if (successfulResponses.length === 0) {
    throw new Error("All Gemini models failed");
  }

  // Pick best by weight
  successfulResponses.sort((a, b) => b.weight - a.weight);
  const best = successfulResponses[0];

  const totalTime = Date.now() - startTime;
  console.log(`\n🏆 Best: ${best.model} (weight: ${best.weight})`);
  console.log(
    `📊 ${successfulResponses.length}/${GEMINI_MODELS.length} succeeded`
  );
  console.log(`⏱️ Total: ${totalTime}ms`);
  console.log("========== END GEMINI MULTI-MODEL ==========\n");

  return transformToSolution(
    problem,
    best.solution,
    totalTime,
    best.tokenUsage
  );
}

/**
 * Transform to Solution format
 */
function transformToSolution(
  problem: string,
  aiResponse: AISolutionResponse,
  processingTimeMs: number,
  tokenUsage?: ModelResponse["tokenUsage"]
): Solution {
  const steps: SolutionStep[] = aiResponse.steps.map((step, index) => ({
    stepNumber: index + 1,
    expression: step.expression,
    justification: step.justification,
    explanation: step.explanation,
    status: "VERIFIED" as const,
    notes: undefined,
  }));

  const validTypes: ProblemType[] = [
    "algebra",
    "calculus_derivative",
    "calculus_integral",
    "calculus_limit",
    "trigonometry",
    "linear_algebra",
    "geometry",
    "statistics",
    "unknown",
  ];

  const normalizedType = aiResponse.problemType
    .toLowerCase()
    .replace(/\s+/g, "_") as ProblemType;

  return {
    id: crypto.randomUUID(),
    problem,
    problemType: validTypes.includes(normalizedType)
      ? normalizedType
      : "unknown",
    steps,
    finalAnswer: aiResponse.finalAnswer,
    summary: aiResponse.summary,
    processingTimeMs,
    tokenUsage: tokenUsage || {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    },
    createdAt: new Date().toISOString(),
  };
}
