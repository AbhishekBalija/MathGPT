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
import type { SecondOpinion, SolveResult } from "../../modules/ai/math-solver";
import { runWithFailover, withTimeout } from "./failover";
import { generateValidSolution, stripCodeFences, type ModelOutput } from "./generate-solution";
import {
  ANSWER_ONLY_SYSTEM_PROMPT,
  MATH_TUTOR_SYSTEM_PROMPT,
  buildAnswerOnlyPrompt,
  buildSolvePrompt,
} from "./prompts";
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
// Companies allowed to run the backup model for us (OpenRouter host ids).
// Students' problems only go to these, so check the privacy policy before adding one.
const BACKUP_HOSTS = ["deepinfra", "relace", "parasail", "azure", "cloudflare", "digitalocean"];

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_MATH_AI_API || "");

// Patterns that indicate an unsolvable problem
// Only literal division by zero. Words like "infinity", "undefined" or "no
// solution" appear in real problems (limits, proofs), so the AI decides those.
const UNSOLVABLE_PATTERNS = [
  /divide\s*by\s*zero/i,
  // "1/0" or "0/0", but not "10/0.5"
  /\b\d+\s*\/\s*0(?![.\d])/,
];

/** Throws UnsolvableProblemError for a problem that divides by zero. */
export function rejectObviouslyUnsolvable(problem: string): void {
  for (const pattern of UNSOLVABLE_PATTERNS) {
    if (pattern.test(problem)) {
      throw new UnsolvableProblemError(
        "This problem involves undefined or unsolvable mathematical operations."
      );
    }
  }
}

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
  rejectObviouslyUnsolvable(problem);

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
  return { ...value, model: usedBackup ? BACKUP_MODEL : PRIMARY_MODEL };
}

// ============================================================================
// MODEL CALLERS
// ============================================================================

/**
 * Call OpenRouter API (backup model)
 */
async function callOpenRouter(
  prompt: string,
  model: string,
  systemPrompt: string = MATH_TUTOR_SYSTEM_PROMPT
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
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 8192,
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

  return { text: content, tokenUsage, model };
}

/**
 * Call Gemini API (primary model)
 */
async function callGemini(
  prompt: string,
  systemPrompt: string = MATH_TUTOR_SYSTEM_PROMPT,
  jsonOnly = true
): Promise<ModelOutput> {
  const model = genAI.getGenerativeModel({
    model: PRIMARY_MODEL,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
      // Ask Gemini for JSON only, so there are no code fences to strip
      responseMimeType: jsonOnly ? "application/json" : "text/plain",
    },
  }, { timeout: PRIMARY_TIMEOUT_MS });

  const result = await model.generateContent([
    { text: systemPrompt },
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

  return { text, tokenUsage, model: PRIMARY_MODEL };
}

// ============================================================================
// SECOND OPINION
// ============================================================================

const MAX_SECOND_ANSWER = 500;

/**
 * The second model's reply as an answer, or null. Plain text, not JSON:
 * models often write LaTeX in JSON with single backslashes, and "\frac"
 * then breaks (or silently turns into a control character).
 */
export function readSecondAnswer(reply: string): string | null {
  const lines = stripCodeFences(reply)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const last = lines[lines.length - 1];
  if (!last) return null;
  const answer = last
    .replace(/^(?:final\s+)?answer\s*:\s*/i, "")
    .replace(/^\$+|\$+$/g, "")
    .trim();
  if (!answer || answer.toUpperCase() === "UNKNOWN" || answer.length > MAX_SECOND_ANSWER) return null;
  return answer;
}

/**
 * Asks a model from a different maker than the one that solved the problem
 * for the final answer only. DeepSeek checks Gemini's answers, and Gemini
 * checks DeepSeek's, so a maker never checks itself.
 */
export async function askSecondOpinion(
  problem: string,
  primaryModel: string | undefined
): Promise<SecondOpinion | null> {
  const prompt = buildAnswerOnlyPrompt(problem);
  const output =
    primaryModel === BACKUP_MODEL
      ? await withTimeout(callGemini(prompt, ANSWER_ONLY_SYSTEM_PROMPT, false), PRIMARY_TIMEOUT_MS, PRIMARY_MODEL)
      : await withTimeout(
          callOpenRouter(prompt, BACKUP_MODEL, ANSWER_ONLY_SYSTEM_PROMPT),
          BACKUP_TIMEOUT_MS,
          BACKUP_MODEL
        );

  const answer = readSecondAnswer(output.text);
  if (!answer) {
    // The reply is only math, so a short piece is safe to log
    console.log(`Second opinion not usable from ${output.model}: ${output.text.slice(0, 200)}`);
    return null;
  }
  return { answer, model: output.model ?? "unknown" };
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
