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
  // A student who may be in distress gets a tap-to-call helpline instead of an edit
  helpline?: Helpline;
}

export interface Helpline {
  name: string;
  phone: string;
}

// India's free government mental health line, open all day and night
const TELE_MANAS: Helpline = { name: "Tele-MANAS", phone: "14416" };

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
  // Why the Problem Guard turned the problem away (422 NOT_MATH)
  reason?: string;
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

// ---- Problem Guard replies ----
// One reply per Rejection Reason (backend/src/modules/solver/guard). A reason
// missing here gets the general not-math line, so add new ones here too.

type GuardReason =
  | "wellbeing"
  | "unsafe"
  | "empty"
  | "personal_info"
  | "greeting"
  | "off_topic"
  | "number"
  | "missing_problem"
  | "incomplete"
  | "not_math";

export const GUARD_REPLIES: Record<GuardReason, string> = {
  wellbeing:
    "That sounds really hard, and you're not alone. You can talk to someone kind right now, for free: call Tele-MANAS on 14416, any time.",
  unsafe: "I can't help with that. I'm here for math. Send me a math problem.",
  empty: "Type a math problem first.",
  personal_info: "Please don't share personal details like phone numbers here. Send a math problem instead.",
  greeting: "Hi! Send me a math problem and I'll solve it step by step.",
  off_topic: "I only help with math. Send just the math part, like 3x + 5 = 20.",
  number: "That's just a number. What should I do with it?",
  missing_problem: "I can't see the question. Type or paste the full problem.",
  incomplete: "Part of the problem looks missing. Check both sides of the = sign.",
  not_math: SOLVE_ERROR_COPY.notMath,
};

function isGuardReason(reason: string): reason is GuardReason {
  return Object.hasOwn(GUARD_REPLIES, reason);
}

// Some replies read better with the student's own text in them
function guardReply(reason: string | undefined, problem: string | undefined): string {
  if (!reason || !isGuardReason(reason)) return SOLVE_ERROR_COPY.notMath;
  const text = problem?.trim() ?? "";

  if (reason === "number" && /^-?\d+(\.\d+)?$/.test(text)) {
    return `That's just a number. What should I do with it? Try "is ${text} prime" or "${text} × 3".`;
  }
  if (reason === "incomplete" && text && !text.includes("=")) {
    return "Part of the problem looks missing. Add the numbers around the + or −.";
  }
  return GUARD_REPLIES[reason];
}

// `problem` is what the student sent, so a reply can quote it back
export function toSolveError(failure: SolveFailure, problem?: string): SolveError {
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
  if (status === 422 || code === "NOT_MATH") {
    if (failure.reason === "wellbeing") return { message: GUARD_REPLIES.wellbeing, helpline: TELE_MANAS };
    return { message: guardReply(failure.reason, problem), needsEdit: true };
  }

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
