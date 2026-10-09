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
import type { SolveResult } from "../../modules/ai/math-solver";
import { runWithFailover } from "./failover";
import { generateValidSolution, type ModelOutput } from "./generate-solution";
import { MATH_TUTOR_SYSTEM_PROMPT, buildSolvePrompt } from "./prompts";
import { UnsolvableProblemError } from "./solver-errors";

// ============================================================================
// CONFIGURATION
// ============================================================================

// Time limits for each model
const PRIMARY_TIMEOUT_MS = 20000;
const BACKUP_TIMEOUT_MS = 20000;

// Models
const PRIMARY_MODEL = "gemini-2.5-flash"; // Direct Gemini API
const BACKUP_MODEL = "deepseek/deepseek-v4-flash"; // OpenRouter, a different maker than Gemini

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_MATH_AI_API || "");

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
 * Solve a math problem. The model is asked for the new solution format and
 * the reply is checked (and retried once) before anyone sees it.
 */
export async function solveMathProblem(
  problem: string,
  options: { method?: string } = {}
): Promise<SolveResult> {
  const startTime = Date.now();

  // Check for obviously unsolvable problems
  for (const pattern of UNSOLVABLE_PATTERNS) {
    if (pattern.test(problem)) {
      throw new UnsolvableProblemError(
        "This problem involves undefined or unsolvable mathematical operations."
      );
    }
  }

  const prompt = buildSolvePrompt(problem, options);
  // Use the backup model too if multi-model is enabled, otherwise one Gemini call
  const generate =
    process.env.USE_MULTI_MODEL === "true" ? askModelsWithFailover : callGemini;

  const checked = await generateValidSolution(problem, prompt, generate);
  return { ...checked, processingTimeMs: Date.now() - startTime };
}

// ============================================================================
// FAILOVER STRATEGY
// ============================================================================

async function askModelsWithFailover(prompt: string): Promise<ModelOutput> {
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
  console.log(`Answered by ${usedBackup ? BACKUP_MODEL : PRIMARY_MODEL}`);
  return value;
}

// ============================================================================
// MODEL CALLERS
// ============================================================================

/**
 * Call OpenRouter API (backup model)
 */
async function callOpenRouter(
  prompt: string,
  model: string
): Promise<ModelOutput> {
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
        max_tokens: 8192,
        // Several companies host this model and some are very slow;
        // ask OpenRouter for the fastest one so we stay inside the time limit
        provider: { sort: "throughput" },
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

  return { text: content, tokenUsage };
}

/**
 * Call Gemini API (primary model)
 */
async function callGemini(prompt: string): Promise<ModelOutput> {
  const model = genAI.getGenerativeModel({
    model: PRIMARY_MODEL,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
      // Ask Gemini for JSON only, so there are no code fences to strip
      responseMimeType: "application/json",
    },
  }, { timeout: PRIMARY_TIMEOUT_MS });

  const result = await model.generateContent([
    { text: MATH_TUTOR_SYSTEM_PROMPT },
    { text: prompt },
  ]);

  const response = result.response;
  const text = response.text();

  // MAX_TOKENS means the reply was cut off, so its JSON will not parse
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== "STOP") {
    console.log(`Gemini stopped early: ${finishReason}`);
  }

  const usageMetadata = response.usageMetadata;
  const tokenUsage = usageMetadata
    ? {
        inputTokens: usageMetadata.promptTokenCount || 0,
        outputTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      }
    : undefined;

  return { text, tokenUsage };
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
