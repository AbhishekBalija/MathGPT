/**
 * AI Service for Math Problem Solving
 *
 * Uses sequential failover:
 * 1. Gemini (direct API) is tried first, with a time limit
 * 2. Only if it fails or runs out of time, one backup model on OpenRouter
 *    is tried, also with a time limit
 *
 * Only one model runs at a time, so we never pay for two answers.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type AISolutionResponse,
  type SolutionStep,
  type Solution,
  type ProblemType,
} from "../../types/solve.types";
import { MATH_TUTOR_SYSTEM_PROMPT, buildSolvePrompt } from "./prompts";
import { runWithFailover } from "./failover";

// ============================================================================
// CONFIGURATION
// ============================================================================

// Time limits for each model
const PRIMARY_TIMEOUT_MS = 20000;
const BACKUP_TIMEOUT_MS = 20000;

// Models
const PRIMARY_MODEL = "gemini-2.5-flash"; // Direct Gemini API
const BACKUP_MODEL = "deepseek/deepseek-v4-flash"; // OpenRouter, a different maker than Gemini
// Companies allowed to run the backup model for us (OpenRouter host ids).
// Students' problems only go to these, so check the privacy policy before adding one.
const BACKUP_HOSTS = ["deepinfra", "relace", "parasail", "azure", "cloudflare", "digitalocean"];

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_MATH_AI_API || "");

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class UnsolvableProblemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsolvableProblemError";
  }
}

// Patterns that indicate an unsolvable problem
const UNSOLVABLE_PATTERNS = [
  /divide\s*by\s*zero/i,
  /1\s*\/\s*0\b/,
  /\b0\s*\/\s*0\b/,
  /\binfinity\b/i,
  /\bundefined\b/i,
  /\bno\s*solution\b/i,
];

// ============================================================================
// MAIN SOLVE FUNCTION
// ============================================================================

/**
 * Solve a math problem, with a backup model when USE_MULTI_MODEL is on
 */
export async function solveMathProblem(problem: string): Promise<Solution> {
  const startTime = Date.now();

  // Check for obviously unsolvable problems
  for (const pattern of UNSOLVABLE_PATTERNS) {
    if (pattern.test(problem)) {
      throw new UnsolvableProblemError(
        "This problem involves undefined or unsolvable mathematical operations."
      );
    }
  }

  // Use the backup model too if multi-model is enabled
  if (process.env.USE_MULTI_MODEL === "true") {
    return solveWithFailover(problem, startTime);
  }

  // Fallback: single Gemini call
  return solveWithSingleGemini(problem, startTime);
}

// ============================================================================
// FAILOVER STRATEGY
// ============================================================================

async function solveWithFailover(
  problem: string,
  startTime: number
): Promise<Solution> {
  const prompt = buildSolvePrompt(problem);

  const { value, usedBackup } = await runWithFailover(
    {
      label: PRIMARY_MODEL,
      run: () => callGemini(prompt),
      timeoutMs: PRIMARY_TIMEOUT_MS,
    },
    {
      label: BACKUP_MODEL,
      run: () => callOpenRouter(prompt, BACKUP_MODEL),
      timeoutMs: BACKUP_TIMEOUT_MS,
    }
  );

  const elapsed = Date.now() - startTime;
  console.log(
    `Solved by ${usedBackup ? BACKUP_MODEL : PRIMARY_MODEL} in ${elapsed}ms`
  );

  return transformToSolution(problem, value.response, elapsed, value.tokenUsage);
}

// ============================================================================
// MODEL CALLERS
// ============================================================================

interface ModelResult {
  response: AISolutionResponse;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Call OpenRouter API (backup models)
 */
async function callOpenRouter(
  prompt: string,
  model: string
): Promise<ModelResult> {
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
        model: model,
        messages: [
          { role: "system", content: MATH_TUTOR_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        provider: {
          // Only US/EU hosts, and only ones that do not keep or train on prompts
          only: BACKUP_HOSTS,
          data_collection: "deny",
          // Some hosts are very slow; pick the fastest so we stay inside the time limit
          sort: "throughput",
        },
        // Thinking makes the answer slower than our time limit allows
        reasoning: { enabled: false },
      }),
      // Stop the request itself, not just our wait for it
      signal: AbortSignal.timeout(BACKUP_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenRouter response");
  }

  const usage = data.usage;
  const tokenUsage = usage
    ? {
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      }
    : undefined;

  return {
    response: parseAIResponse(content),
    tokenUsage,
  };
}

/**
 * Call Gemini API (primary model)
 */
async function callGemini(prompt: string): Promise<ModelResult> {
  const model = genAI.getGenerativeModel({
    model: PRIMARY_MODEL,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4096,
    },
  }, { timeout: PRIMARY_TIMEOUT_MS });

  const result = await model.generateContent([
    { text: MATH_TUTOR_SYSTEM_PROMPT },
    { text: prompt },
  ]);

  const response = result.response;
  const text = response.text();

  const usageMetadata = response.usageMetadata;
  const tokenUsage = usageMetadata
    ? {
        inputTokens: usageMetadata.promptTokenCount || 0,
        outputTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      }
    : undefined;

  return {
    response: parseAIResponse(text),
    tokenUsage,
  };
}

/**
 * Single Gemini call (fallback when USE_MULTI_MODEL is false)
 */
async function solveWithSingleGemini(
  problem: string,
  startTime: number
): Promise<Solution> {
  const prompt = buildSolvePrompt(problem);
  const result = await callGemini(prompt);
  const elapsed = Date.now() - startTime;

  return transformToSolution(
    problem,
    result.response,
    elapsed,
    result.tokenUsage
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse AI response JSON
 */
function parseAIResponse(text: string): AISolutionResponse {
  let cleanedText = text.trim();

  // Remove markdown code blocks
  if (cleanedText.startsWith("```json")) {
    cleanedText = cleanedText.slice(7);
  } else if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.slice(3);
  }

  if (cleanedText.endsWith("```")) {
    cleanedText = cleanedText.slice(0, -3);
  }

  cleanedText = cleanedText.trim();

  // Try to extract JSON from anywhere in response
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
  }

  try {
    return JSON.parse(cleanedText) as AISolutionResponse;
  } catch {
    console.error("Failed to parse AI response:", cleanedText.slice(0, 500));
    throw new Error("AI returned invalid JSON response");
  }
}

/**
 * Transform AI response to Solution format
 */
function transformToSolution(
  problem: string,
  aiResponse: AISolutionResponse,
  processingTimeMs: number,
  tokenUsage?: ModelResult["tokenUsage"]
): Solution {
  const steps: SolutionStep[] = aiResponse.steps.map((step, index) => ({
    stepNumber: index + 1,
    expression: step.expression,
    justification: step.justification,
    explanation: step.explanation,
    status: "VERIFIED" as const,
    notes: undefined,
  }));

  return {
    id: crypto.randomUUID(),
    problem,
    problemType: validateProblemType(aiResponse.problemType),
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

/**
 * Validate problem type
 */
function validateProblemType(type: string): ProblemType {
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

  const normalizedType = type.toLowerCase().replace(/\s+/g, "_") as ProblemType;
  return validTypes.includes(normalizedType) ? normalizedType : "unknown";
}

/**
 * Health check for AI service
 */
export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
    await model.generateContent('Say "OK" if you are working.');
    return true;
  } catch {
    return false;
  }
}
