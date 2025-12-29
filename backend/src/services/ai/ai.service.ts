/**
 * AI Service for Math Problem Solving
 *
 * Uses "Staggered Start" strategy:
 * 1. Primary (OpenRouter free model) starts immediately
 * 2. Backup (Gemini) starts after 8s if primary hasn't responded
 * 3. Returns first successful response
 *
 * This minimizes API calls while ensuring reliability.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type AISolutionResponse,
  type SolutionStep,
  type Solution,
  type ProblemType,
} from "../../types/solve.types";
import { MATH_TUTOR_SYSTEM_PROMPT, buildSolvePrompt } from "./prompts";

// ============================================================================
// CONFIGURATION
// ============================================================================

// Timing configuration
const BACKUP1_START_DELAY_MS = 8000; // Start first backup after 8 seconds
const BACKUP2_START_DELAY_MS = 15000; // Start second backup after 15 seconds
const OVERALL_TIMEOUT_MS = 30000; // Overall timeout (30s)

// Model configuration - Three tiers
const PRIMARY_MODEL = "gemini-2.5-flash"; // Direct Gemini API
const BACKUP1_MODEL = "google/gemini-2.0-flash-001"; // OpenRouter paid - faster/reliable
const BACKUP2_MODEL = "tngtech/deepseek-r1t2-chimera:free"; // OpenRouter free - last resort

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
 * Solve a math problem using the staggered AI strategy
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

  // Use staggered strategy if multi-model is enabled
  if (process.env.USE_MULTI_MODEL === "true") {
    return solveWithStaggeredStrategy(problem, startTime);
  }

  // Fallback: single Gemini call
  return solveWithSingleGemini(problem, startTime);
}

// ============================================================================
// STAGGERED STRATEGY
// ============================================================================

/**
 * Staggered Start Strategy (3-Tier):
 * - Primary (Gemini direct) starts immediately
 * - Backup 1 (OpenRouter paid Gemini) starts after 8s if primary hasn't responded
 * - Backup 2 (OpenRouter free DeepSeek) starts after 15s if nothing responded
 * - Returns first successful response
 */
async function solveWithStaggeredStrategy(
  problem: string,
  startTime: number
): Promise<Solution> {
  console.log("\n========== STAGGERED AI STRATEGY (3-TIER) ==========");
  console.log(`Primary: ${PRIMARY_MODEL}`);
  console.log(
    `Backup 1: ${BACKUP1_MODEL} (starts at ${BACKUP1_START_DELAY_MS}ms)`
  );
  console.log(
    `Backup 2: ${BACKUP2_MODEL} (starts at ${BACKUP2_START_DELAY_MS}ms)`
  );

  const prompt = buildSolvePrompt(problem);

  // Track state
  let resolved = false;
  let primaryFailed = false;
  let backup1Started = false;
  let backup1Failed = false;
  let backup2Started = false;

  // Create a promise that resolves when we have a solution
  return new Promise<Solution>((resolve, reject) => {
    // Overall timeout
    const overallTimer = setTimeout(() => {
      if (resolved) return;
      console.log(`⏱️ Overall timeout (${OVERALL_TIMEOUT_MS}ms)`);
      reject(new Error("All models timed out"));
    }, OVERALL_TIMEOUT_MS);

    let backup1Timer: ReturnType<typeof setTimeout> | null = null;
    let backup2Timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      resolved = true;
      clearTimeout(overallTimer);
      if (backup1Timer) clearTimeout(backup1Timer);
      if (backup2Timer) clearTimeout(backup2Timer);
    };

    const handleSuccess = (result: ModelResult, modelName: string) => {
      if (resolved) return; // Already resolved
      const elapsed = Date.now() - startTime;
      console.log(`✅ ${modelName} succeeded at ${elapsed}ms`);
      console.log(`🏆 Winner: ${modelName}`);
      console.log(`⏱️ Total: ${elapsed}ms`);
      console.log("========== END STAGGERED ==========\n");

      cleanup();
      resolve(
        transformToSolution(
          problem,
          result.response,
          elapsed,
          result.tokenUsage
        )
      );
    };

    const checkAllFailed = () => {
      if (resolved) return;
      // All models that were started have failed
      const allStartedFailed =
        primaryFailed &&
        (!backup1Started || backup1Failed) &&
        (!backup2Started ||
          (backup1Started && backup1Failed && backup2Started));

      if (primaryFailed && backup1Failed && backup2Started) {
        // Primary and backup1 failed, backup2 is our last hope - wait for it
        return;
      }

      if (allStartedFailed && backup2Started) {
        console.log("❌ All models failed");
        console.log("========== END STAGGERED ==========\n");
        cleanup();
        reject(new Error("All models failed"));
      }
    };

    // Start PRIMARY immediately (Gemini direct)
    console.log(`[0ms] Starting primary: ${PRIMARY_MODEL}...`);
    callGemini(prompt)
      .then((result) => handleSuccess(result, "PRIMARY (Gemini direct)"))
      .catch((error) => {
        if (resolved) return;
        primaryFailed = true;
        const elapsed = Date.now() - startTime;
        console.log(
          `❌ Primary failed at ${elapsed}ms: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        // If primary fails early, start backup1 immediately
        if (!backup1Started) {
          console.log(
            `[${elapsed}ms] Primary failed early, starting backup1 immediately...`
          );
          startBackup1();
        }
        checkAllFailed();
      });

    // Backup 1 timer
    backup1Timer = setTimeout(() => {
      if (resolved || backup1Started) return;
      startBackup1();
    }, BACKUP1_START_DELAY_MS);

    // Backup 2 timer
    backup2Timer = setTimeout(() => {
      if (resolved || backup2Started) return;
      startBackup2();
    }, BACKUP2_START_DELAY_MS);

    // Start Backup 1 (OpenRouter paid Gemini)
    function startBackup1() {
      if (backup1Started || resolved) return;
      backup1Started = true;

      const elapsed = Date.now() - startTime;
      console.log(`[${elapsed}ms] Starting backup1: ${BACKUP1_MODEL}...`);

      callOpenRouter(prompt, BACKUP1_MODEL)
        .then((result) => handleSuccess(result, "BACKUP1 (OpenRouter Gemini)"))
        .catch((error) => {
          if (resolved) return;
          backup1Failed = true;
          const totalElapsed = Date.now() - startTime;
          console.log(
            `❌ Backup1 failed at ${totalElapsed}ms: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );

          // If backup1 fails, start backup2 immediately if not already started
          if (!backup2Started) {
            console.log(
              `[${totalElapsed}ms] Backup1 failed, starting backup2 immediately...`
            );
            startBackup2();
          }
          checkAllFailed();
        });
    }

    // Start Backup 2 (OpenRouter free DeepSeek)
    function startBackup2() {
      if (backup2Started || resolved) return;
      backup2Started = true;

      const elapsed = Date.now() - startTime;
      console.log(`[${elapsed}ms] Starting backup2: ${BACKUP2_MODEL}...`);

      callOpenRouter(prompt, BACKUP2_MODEL)
        .then((result) =>
          handleSuccess(result, "BACKUP2 (OpenRouter DeepSeek)")
        )
        .catch((error) => {
          if (resolved) return;
          const totalElapsed = Date.now() - startTime;
          console.log(
            `❌ Backup2 failed at ${totalElapsed}ms: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );

          // This is the last resort - if all failed, reject
          console.log("❌ All models failed");
          console.log("========== END STAGGERED ==========\n");
          cleanup();
          reject(new Error("All models failed"));
        });
    }
  });
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
      }),
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

  return {
    response: parseAIResponse(content),
    tokenUsage: undefined, // OpenRouter doesn't provide token usage in free tier
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
  });

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    await model.generateContent('Say "OK" if you are working.');
    return true;
  } catch {
    return false;
  }
}
