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
const BACKUP_START_DELAY_MS = 25000; // Start backup after 15 seconds
const OVERALL_TIMEOUT_MS = 45000; // Overall timeout

// Model configuration
const PRIMARY_MODEL = "tngtech/deepseek-r1t2-chimera:free"; // Reasoning model, better JSON
const BACKUP_MODEL = "gemini-2.5-flash";

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
 * Staggered Start Strategy:
 * - Start primary immediately
 * - If primary doesn't respond in 8s, start backup in parallel
 * - Return first successful response
 */
async function solveWithStaggeredStrategy(
  problem: string,
  startTime: number
): Promise<Solution> {
  console.log("\n========== STAGGERED AI STRATEGY ==========");
  console.log(`Primary: ${PRIMARY_MODEL}`);
  console.log(
    `Backup: ${BACKUP_MODEL} (starts at ${BACKUP_START_DELAY_MS}ms if needed)`
  );

  const prompt = buildSolvePrompt(problem);

  // Track state
  let primaryDone = false;
  let backupStarted = false;
  let backupTimer: ReturnType<typeof setTimeout> | null = null;

  // Create a promise that resolves when we have a solution
  return new Promise<Solution>((resolve, reject) => {
    // Overall timeout
    const overallTimer = setTimeout(() => {
      console.log(`⏱️ Overall timeout (${OVERALL_TIMEOUT_MS}ms)`);
      reject(new Error("All models timed out"));
    }, OVERALL_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(overallTimer);
      if (backupTimer) clearTimeout(backupTimer);
    };

    // Start PRIMARY immediately
    console.log(`[0ms] Starting primary: ${PRIMARY_MODEL}...`);
    callOpenRouter(prompt)
      .then((result) => {
        primaryDone = true;
        const elapsed = Date.now() - startTime;
        console.log(`✅ Primary succeeded at ${elapsed}ms`);

        // Clear backup timer if it hasn't started
        if (backupTimer) clearTimeout(backupTimer);

        // If backup hasn't started or hasn't won yet, we win
        if (!backupStarted) {
          console.log("🏆 Winner: PRIMARY (backup not needed)");
        } else {
          console.log("🏆 Winner: PRIMARY (beat backup)");
        }
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
      })
      .catch((error) => {
        primaryDone = true;
        const elapsed = Date.now() - startTime;
        console.log(
          `❌ Primary failed at ${elapsed}ms: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );

        // If primary fails before backup started, start backup immediately
        if (!backupStarted) {
          console.log(
            `[${elapsed}ms] Primary failed early, starting backup immediately...`
          );
          startBackup();
        }
        // If backup is already running, let it continue
      });

    // Set timer to start BACKUP after delay
    backupTimer = setTimeout(() => {
      if (primaryDone) {
        // Primary already finished, no need for backup
        return;
      }

      startBackup();
    }, BACKUP_START_DELAY_MS);

    // Function to start backup
    function startBackup() {
      if (backupStarted) return; // Don't start twice
      backupStarted = true;

      const elapsed = Date.now() - startTime;
      console.log(`[${elapsed}ms] Starting backup: ${BACKUP_MODEL}...`);

      callGemini(prompt)
        .then((result) => {
          const totalElapsed = Date.now() - startTime;
          console.log(`✅ Backup succeeded at ${totalElapsed}ms`);
          console.log("🏆 Winner: BACKUP (Gemini)");
          console.log(`⏱️ Total: ${totalElapsed}ms`);
          console.log("========== END STAGGERED ==========\n");

          cleanup();
          resolve(
            transformToSolution(
              problem,
              result.response,
              totalElapsed,
              result.tokenUsage
            )
          );
        })
        .catch((error) => {
          const totalElapsed = Date.now() - startTime;
          console.log(
            `❌ Backup failed at ${totalElapsed}ms: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );

          // If both failed, reject
          if (primaryDone) {
            console.log("❌ Both primary and backup failed");
            console.log("========== END STAGGERED ==========\n");
            cleanup();
            reject(new Error("All models failed"));
          }
          // If primary is still running, let it continue
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
 * Call OpenRouter API (primary model)
 */
async function callOpenRouter(prompt: string): Promise<ModelResult> {
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
        model: PRIMARY_MODEL,
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
 * Call Gemini API (backup model)
 */
async function callGemini(prompt: string): Promise<ModelResult> {
  const model = genAI.getGenerativeModel({
    model: BACKUP_MODEL,
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
