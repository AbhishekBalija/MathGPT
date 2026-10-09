/**
 * Turns the AI's raw text into a checked solution.
 *
 * The AI gets two tries. If the first reply is not valid JSON or does not
 * match the solution format, we ask once more and tell it what was wrong.
 * If the second reply is also bad, we give up with InvalidSolverOutputError.
 * The fake solver in tests uses this same function, so the retry is tested.
 */

import { z } from "zod";
import { logger } from "../../lib/logger";
import { solutionV2Schema } from "../../modules/solutions/solution-v2.schema";
import type { SolveResult, TokenUsage } from "../../modules/ai/math-solver";
import { PROBLEM_TYPES, type ProblemType } from "../../types/solve.types";
import { buildRetryPrompt } from "./prompts";
import { InvalidSolverOutputError, UnsolvableProblemError } from "./solver-errors";

export interface ModelOutput {
  text: string;
  tokenUsage?: TokenUsage;
}

const MAX_REFUSAL_LOG = 200;
export const REFUSAL_MESSAGE = "I couldn't read that problem. Try writing it like x^2 + 5x + 6 = 0.";
export const MAX_ERROR_SUMMARY = 500;
const MAX_ERROR_ISSUES = 5;

const refusalSchema = z.object({ refused: z.literal(true), reason: z.string().optional() });

/** Removes ```json fences the model sometimes wraps around its answer. */
export function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Finds the JSON in a model reply. Drops <think> blocks and code fences,
 * and if that still is not JSON, takes everything from the first "{" to the
 * last "}" (models sometimes add a sentence before or after the JSON).
 */
export function parseModelJson(text: string): unknown {
  const cleaned = stripCodeFences(text.replace(/<think>[\s\S]*?<\/think>/gi, ""));
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new Error("No JSON found");
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function toProblemType(type: unknown): ProblemType {
  const normalized = String(type).toLowerCase().replace(/\s+/g, "_");
  return PROBLEM_TYPES.find((valid) => valid === normalized) ?? "unknown";
}

// A short, readable list of what is wrong, small enough to put back in a prompt
function summarizeIssues(error: z.ZodError): string {
  const lines = error.issues
    .slice(0, MAX_ERROR_ISSUES)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
  return lines.join("; ").slice(0, MAX_ERROR_SUMMARY);
}

type Checked =
  | { ok: true; result: Pick<SolveResult, "content" | "problemType"> }
  | { ok: false; reason: string };

function checkOutput(text: string): Checked {
  let raw: unknown;
  try {
    raw = parseModelJson(text);
  } catch {
    return { ok: false, reason: "The reply was not valid JSON." };
  }

  const refusal = refusalSchema.safeParse(raw);
  if (refusal.success) {
    // The model's reason stays in our logs; the student sees fixed, friendly copy
    const reason = (refusal.data.reason ?? "").slice(0, MAX_REFUSAL_LOG);
    logger.info("AI refused the problem", { reason });
    throw new UnsolvableProblemError(REFUSAL_MESSAGE, reason);
  }

  const envelope = z.object({ problemType: z.unknown(), solution: z.unknown() }).safeParse(raw);
  if (!envelope.success) {
    return { ok: false, reason: 'The reply must be {"problemType": ..., "solution": {...}}.' };
  }

  const parsed = solutionV2Schema.safeParse(envelope.data.solution);
  if (!parsed.success) {
    return { ok: false, reason: summarizeIssues(parsed.error) };
  }
  return {
    ok: true,
    result: { content: parsed.data, problemType: toProblemType(envelope.data.problemType) },
  };
}

function addUsage(a?: TokenUsage, b?: TokenUsage): TokenUsage | undefined {
  if (!a || !b) return a ?? b;
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

/**
 * `generate` asks the model for text. `problem` is only used for logging
 * (first 100 characters, never the whole problem).
 */
export async function generateValidSolution(
  problem: string,
  prompt: string,
  generate: (prompt: string) => Promise<ModelOutput>
): Promise<Omit<SolveResult, "processingTimeMs">> {
  const startedAt = Date.now();
  let usage: TokenUsage | undefined;
  let nextPrompt = prompt;

  for (const attempt of [1, 2]) {
    const output = await generate(nextPrompt);
    usage = addUsage(usage, output.tokenUsage);

    const checked = checkOutput(output.text);
    if (checked.ok) {
      return { ...checked.result, tokenUsage: usage };
    }

    logger.warn("AI output did not match the solution format", {
      attempt,
      reason: checked.reason,
      problem: problem.slice(0, 100),
      elapsedMs: Date.now() - startedAt,
    });
    nextPrompt = buildRetryPrompt(prompt, checked.reason);
  }

  throw new InvalidSolverOutputError("The AI answered twice without a valid solution");
}
