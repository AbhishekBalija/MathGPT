/**
 * OpenRouter Service for Multi-Model Parallel Calling
 *
 * Calls multiple LLMs in parallel via OpenRouter API.
 * Waits for all models (up to timeout) and picks the BEST one.
 */

import {
  type AISolutionResponse,
  type Solution,
  type SolutionStep,
  type ProblemType,
} from "../../types/solve.types";
import { MATH_TUTOR_SYSTEM_PROMPT, buildSolvePrompt } from "./prompts";

// Model configuration - 2 models only to conserve free tier (50 req/day ÷ 2 = 25 solves)
const OPENROUTER_MODELS = [
  { id: "tngtech/deepseek-r1t2-chimera:free", weight: 1.5 }, // Best - reasoning model
  { id: "meta-llama/llama-3.3-70b-instruct:free", weight: 1.3 }, // Backup - reliable
  //   { id: "mistralai/mistral-small-3.1-24b-instruct:free", weight: 1.3 }, // New - 24B Mistral
  //   { id: "allenai/olmo-3.1-32b-think:free", weight: 1.2 }, // New - reasoning model
  //   { id: "mistralai/mistral-7b-instruct:free", weight: 1.0 }, // New - fast backup
];

// Overall timeout (25 seconds - balances speed vs waiting for best models)
const TOTAL_TIMEOUT_MS = 25000;

interface ModelResponse {
  model: string;
  solution: AISolutionResponse;
  latencyMs: number;
  weight: number;
}

// Store successful responses as they come in
let successfulResponses: ModelResponse[] = [];

/**
 * Call a single model via OpenRouter API
 */
async function callSingleModel(
  modelId: string,
  prompt: string,
  systemPrompt: string
): Promise<AISolutionResponse> {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPEN_ROUTER_API_KEY not configured");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://mathgpt.abhishekbalija.xyz",
        "X-Title": "NeoMath",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenRouter response");
  }

  return parseAIResponse(content);
}

/**
 * Parse AI response JSON, handling markdown code blocks
 */
function parseAIResponse(text: string): AISolutionResponse {
  let cleanedText = text.trim();

  // Remove ```json and ``` markers
  if (cleanedText.startsWith("```json")) {
    cleanedText = cleanedText.slice(7);
  } else if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.slice(3);
  }

  if (cleanedText.endsWith("```")) {
    cleanedText = cleanedText.slice(0, -3);
  }

  cleanedText = cleanedText.trim();

  // Try to extract JSON from anywhere in the response
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
  }

  try {
    return JSON.parse(cleanedText) as AISolutionResponse;
  } catch {
    throw new Error("Invalid JSON response from model");
  }
}

/**
 * Call all models in parallel, return the BEST (highest weight) successful response
 */
export async function solveWithMultipleModels(
  problem: string
): Promise<Solution> {
  const startTime = Date.now();
  const prompt = buildSolvePrompt(problem);

  // Reset for this request
  successfulResponses = [];

  console.log("\n========== MULTI-MODEL SOLVE ==========");
  console.log(`Calling ${OPENROUTER_MODELS.length} models in parallel...`);

  // Create model call promises that store results as they complete
  const modelCalls = OPENROUTER_MODELS.map(async (model) => {
    const modelStart = Date.now();
    try {
      const solution = await callSingleModel(
        model.id,
        prompt,
        MATH_TUTOR_SYSTEM_PROMPT
      );
      const latencyMs = Date.now() - modelStart;
      console.log(`✅ ${model.id}: ${latencyMs}ms`);

      // Store successful response immediately
      successfulResponses.push({
        model: model.id,
        solution,
        latencyMs,
        weight: model.weight,
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
        console.log(
          `⏱️ Timeout (${TOTAL_TIMEOUT_MS}ms) - using best available`
        );
        resolve();
      }, TOTAL_TIMEOUT_MS);
    }),
  ]);

  // Check what we have
  if (successfulResponses.length === 0) {
    throw new Error("All models failed to respond");
  }

  // Sort by weight (highest first) and pick the best
  successfulResponses.sort((a, b) => b.weight - a.weight);
  const best = successfulResponses[0];

  const totalTime = Date.now() - startTime;
  console.log(`\n🏆 Best Model: ${best.model} (weight: ${best.weight})`);
  console.log(
    `📊 ${successfulResponses.length}/${OPENROUTER_MODELS.length} models succeeded`
  );
  console.log(`⏱️ Total time: ${totalTime}ms`);
  console.log("========== END MULTI-MODEL SOLVE ==========\n");

  return transformToSolution(problem, best.solution, totalTime);
}

/**
 * Transform AI response to Solution format
 */
function transformToSolution(
  problem: string,
  aiResponse: AISolutionResponse,
  processingTimeMs: number
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
    tokenUsage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    },
    createdAt: new Date().toISOString(),
  };
}
