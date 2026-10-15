/**
 * Error copy for the solver page.
 *
 * Turns a failed API call into a short message a student can read.
 * Never expose raw backend errors, API keys, URLs, or technical details to users.
 */

// ---- Solver page errors ----
// Short copy a class 3 student can read. Shown in the solver's ErrorState.

export interface SolveError {
  message: string;
  retryAfter?: number;
  // Sending the same text again cannot work (it is not math), so the page
  // offers "Edit problem" instead of "Try again"
  needsEdit?: true;
  // Nothing to retry or edit (for example a saved solution that cannot be read)
  noAction?: true;
}

// What we know about a failed /api/solve call. No `status` means no reply at all.
export interface SolveFailure {
  status?: number;
  code?: string;
  retryAfter?: number;
  /** Set by the server only for the daily limit (429 without a code). */
  resetAt?: string;
  dailyLimit?: number;
  // The admin's message while solving is paused (503 MAINTENANCE)
  message?: string;
}

export const SOLVE_ERROR_COPY = {
  rateLimit: "That's 5 problems in a minute.",
  dailyLimit: "You've used today's free problems. Come back tomorrow.",
  paused: "Neo is taking a short break. Please try again in a little while.",
  unsolvable: "I couldn't read that problem. Try writing it like x^2 + 5x + 6 = 0.",
  notMath: "That doesn't look like a math problem. Try something like x^2 + 5x + 6 = 0.",
  login: "Please log in again.",
  verifyEmail: "Please check your email and verify your account first.",
  serverTrouble: "Something went wrong on our side. Try again.",
  network: "No internet right now.",
} as const;

export function toSolveError(failure: SolveFailure): SolveError {
  const { status, code, retryAfter } = failure;

  if (status === undefined) return { message: SOLVE_ERROR_COPY.network };

  if (status === 429) {
    const isDaily = failure.resetAt !== undefined || failure.dailyLimit !== undefined || code === "DAILY_LIMIT";
    if (isDaily) {
      // The limit is set in admin Settings, so name the real number
      const message = failure.dailyLimit === undefined ? SOLVE_ERROR_COPY.dailyLimit : `You've used today's ${failure.dailyLimit} free problems. Come back tomorrow.`;
      return { message };
    }
    return { message: SOLVE_ERROR_COPY.rateLimit, retryAfter };
  }

  // 422 or a NOT_MATH code: the text is not a math problem
  if (status === 422 || code === "NOT_MATH") return { message: SOLVE_ERROR_COPY.notMath, needsEdit: true };

  // 400 or an UNSOLVABLE code: the problem itself could not be read
  if (status === 400 || code === "UNSOLVABLE") return { message: SOLVE_ERROR_COPY.unsolvable };

  if (status === 401) return { message: SOLVE_ERROR_COPY.login };
  if (status === 403) {
    return { message: code === "EMAIL_NOT_VERIFIED" ? SOLVE_ERROR_COPY.verifyEmail : SOLVE_ERROR_COPY.login };
  }

  // An admin paused solving: their message, and nothing to retry yet
  if (code === "MAINTENANCE") return { message: failure.message || SOLVE_ERROR_COPY.paused, noAction: true };

  // 5xx and anything unknown: not the student's fault
  return { message: SOLVE_ERROR_COPY.serverTrouble };
}
