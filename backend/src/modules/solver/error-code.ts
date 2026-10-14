/**
 * A short code for why a solve failed, so the admin can group failures and
 * alerts know when the AI providers are the problem. Replaces `error.name`,
 * which is just "Error" for most failures.
 */

import { AllModelsFailedError, ModelTimeoutError } from "../../services/ai/failover";

export type SolveErrorCode =
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_UNREACHABLE"
  | "ALL_MODELS_FAILED"
  | "UNKNOWN_ERROR";

const PROVIDER_FAILURES: ReadonlySet<string> = new Set([
  "AI_RATE_LIMITED",
  "AI_TIMEOUT",
  "AI_UNREACHABLE",
  "ALL_MODELS_FAILED",
]);

// Checked in this order: Gemini's quota errors also say "Error fetching"
const RATE_LIMITED = /429|quota|rate.?limit|resource.?exhausted/i;
const TIMED_OUT = /timed out|timeout/i;
const UNREACHABLE = /error fetching|fetch failed|ECONN|ENOTFOUND|network error|socket hang up/i;

export function errorCodeFor(error: unknown): SolveErrorCode {
  if (error instanceof ModelTimeoutError) return "AI_TIMEOUT";
  if (error instanceof AllModelsFailedError) {
    return codeFromText(error.reasons) ?? "ALL_MODELS_FAILED";
  }
  // Anything else (our own code, the database) is not blamed on the AI
  return "UNKNOWN_ERROR";
}

/** True when the failure came from the AI providers, not from our code. */
export function isProviderFailure(code: string): boolean {
  return PROVIDER_FAILURES.has(code);
}

function codeFromText(text: string): SolveErrorCode | null {
  if (RATE_LIMITED.test(text)) return "AI_RATE_LIMITED";
  if (TIMED_OUT.test(text)) return "AI_TIMEOUT";
  if (UNREACHABLE.test(text)) return "AI_UNREACHABLE";
  return null;
}
