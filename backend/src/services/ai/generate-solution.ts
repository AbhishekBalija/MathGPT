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
import { InvalidSolverOutputError, NotMathError, UnsolvableProblemError } from "./solver-errors";

export interface ModelOutput {
  text: string;
  tokenUsage?: TokenUsage;
  /** Which model answered */
  model?: string;
}

const MAX_REFUSAL_LOG = 200;
export const REFUSAL_MESSAGE = "I couldn't read that problem. Try writing it like x^2 + 5x + 6 = 0.";
export const MAX_ERROR_SUMMARY = 500;
const MAX_ERROR_ISSUES = 5;

const refusalSchema = z.object({ refused: z.literal(true), reason: z.string().optional() });
const notMathSchema = z.object({ notMath: z.literal(true) });

/** Removes ```json fences the model sometimes wraps around its answer. */
export function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// LaTeX commands that start with a letter JSON also uses as an escape
// (\b \f \n \r \t \u). Written with one backslash they would silently turn
// into a control character ("\times" into a tab and "imes"), so we double
// the backslash when one of these names follows.
const LATEX_LOOKING_LIKE_ESCAPES =
  /^(beta|bar|binom|boxed|bmod|bot|bigl|bigr|frac|forall|flat|theta|times|tan|tanh|tau|text|textbf|textit|tfrac|to|top|triangle|tilde|right|rho|rangle|rightarrow|neq|ne|nu|neg|not|nabla|ni|nexists|underline|underbrace|uparrow|upsilon)(?![a-zA-Z])/;

/**
 * Models often write LaTeX inside JSON with one backslash ("\angle" instead
 * of "\\angle"). That is either invalid JSON (\a) or, worse, a valid escape
 * that corrupts the text (\t in "\triangle"). This doubles a lone backslash
 * when a LaTeX command follows it, and leaves correct escapes alone: already
 * doubled backslashes, real \uXXXX escapes, and "\n" before ordinary text.
 */
export function escapeLatexBackslashes(json: string): string {
  return json.replace(/(\\+)([a-zA-Z]+)/g, (match, slashes: string, word: string) => {
    // An even run is already escaped: "\\frac" is a backslash, then "frac"
    if (slashes.length % 2 === 0) return match;
    const first = word[0] ?? "";
    // Not a JSON escape letter at all (\angle, \alpha, \sqrt): must be LaTeX
    if (!"bfnrtu".includes(first)) return `\\${match}`;
    if (first === "u" && /^u[0-9a-fA-F]{4}/.test(word)) return match;
    return LATEX_LOOKING_LIKE_ESCAPES.test(word) ? `\\${match}` : match;
  });
}

/**
 * Finds the JSON in a model reply. Drops <think> blocks and code fences,
 * and if that still is not JSON, takes everything from the first "{" to the
 * last "}" (models sometimes add a sentence before or after the JSON).
 */
export function parseModelJson(text: string): unknown {
  const cleaned = escapeLatexBackslashes(stripCodeFences(text.replace(/<think>[\s\S]*?<\/think>/gi, "")));
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

// A proof often ends with only "Hence proved ..." in answer.sentence. That is
// a fine answer, so it is used as answer.text instead of failing the format.
function withSentenceAsAnswer(solution: unknown): unknown {
  if (!solution || typeof solution !== "object") return solution;
  const answer = (solution as { answer?: unknown }).answer;
  if (!answer || typeof answer !== "object") return solution;
  const { latex, text, sentence } = answer as { latex?: unknown; text?: unknown; sentence?: unknown };
  if (latex !== undefined || text !== undefined || typeof sentence !== "string" || !sentence.trim()) {
    return solution;
  }
  return { ...solution, answer: { ...answer, text: sentence } };
}

type Checked =
  | { ok: true; result: Pick<SolveResult, "content" | "problemType"> }
  | { ok: false; reason: string };

function checkOutput(text: string): Checked {
  let raw: unknown;
  try {
    raw = parseModelJson(text);
  } catch (error) {
    // The parser's message says whether the reply was cut off or had a bad
    // character, which is what we need to fix it. Kept short for the logs.
    const detail = error instanceof Error ? error.message.slice(0, 120) : "unknown";
    return { ok: false, reason: `The reply was not valid JSON (${detail}).` };
  }

  // Not a math problem at all: no retry, the route turns it away
  if (notMathSchema.safeParse(raw).success) {
    logger.info("AI says the problem is not math");
    throw new NotMathError();
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

  const parsed = solutionV2Schema.safeParse(withSentenceAsAnswer(envelope.data.solution));
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
      return { ...checked.result, tokenUsage: usage, model: output.model };
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
