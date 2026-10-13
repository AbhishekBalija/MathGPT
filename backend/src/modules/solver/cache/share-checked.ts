/**
 * What happens to a fresh AI solution before it may be shared:
 *
 * 1. Code check (verifyAnswer). Passed: label it and share it at once.
 *    Failed: ask the AI once more, saying the answer was wrong. If that is
 *    wrong too, the student sees a gentle warning, it is never shared, and
 *    it is logged for the admin.
 * 2. Unchecked: store it privately, then (after the response) ask a model
 *    from a different maker for the final answer. Share it only if the two
 *    answers match.
 */

import { logger } from "../../../lib/logger";
import type { MathSolver, SolveResult, TokenUsage } from "../../ai/math-solver";
import type { SolutionV2Content } from "../../solutions/solution-v2.schema";
import { verifyAnswerWithKind } from "../verify/verify-answer";
import { answersMatch, solutionCache } from "./solution-cache";

// The only claims we ever make about a check
const CHECK_LABELS = {
  recomputed: "Checked by recomputing.",
  substituted: "Checked by putting the answer back in.",
} as const;

export const CHECK_FAILED_WARNING = "This answer didn't pass our check. Please double-check it.";

export type CodeCheck = "passed" | "failed" | "unchecked";

/**
 * Runs the code check and adds the honest label when it passed. Any check
 * or warning line the AI wrote itself is dropped first: only our code may
 * claim a check.
 */
export function codeCheck(problem: string, content: SolutionV2Content): { content: SolutionV2Content; check: CodeCheck } {
  const answer = { ...content.answer };
  delete answer.check;
  delete answer.warning;
  const clean = { ...content, answer };
  const verdict = verifyAnswerWithKind(problem, clean);
  if (verdict.result !== "passed") {
    return { content: clean, check: verdict.result };
  }
  const label = verdict.kind === "arithmetic" ? CHECK_LABELS.recomputed : CHECK_LABELS.substituted;
  return { content: { ...clean, answer: { ...answer, check: label } }, check: "passed" };
}

/** The gentle note for an answer that still failed the check after a retry. */
export function withCheckWarning(content: SolutionV2Content): SolutionV2Content {
  return { ...content, answer: { ...content.answer, warning: CHECK_FAILED_WARNING } };
}

function addUsage(a?: TokenUsage, b?: TokenUsage): TokenUsage | undefined {
  if (!a || !b) return a ?? b;
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

export interface CheckedSolve {
  result: SolveResult;
  content: SolutionV2Content;
  check: CodeCheck;
}

/**
 * Solves the problem and runs the code check. When the check proves the
 * answer wrong, the AI gets one more try with the wrong answer in the
 * prompt. Errors from the first solve reach the caller as before.
 */
export async function solveWithCodeCheck(
  solver: MathSolver,
  problem: string,
  method: string | undefined
): Promise<CheckedSolve> {
  const first = await solver.solve(problem, { method });
  const firstChecked = codeCheck(problem, first.content);
  if (firstChecked.check !== "failed") {
    return { result: first, ...firstChecked };
  }

  const wrongAnswer = first.content.answer.latex ?? first.content.answer.text ?? "";
  let second: SolveResult;
  try {
    second = await solver.solve(problem, { method, wrongAnswer });
  } catch (error) {
    logger.warn("Retry after a failed answer check did not work", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return { result: first, content: withCheckWarning(firstChecked.content), check: "failed" };
  }

  // Both tries count as one solve: one Credit, with the time and tokens of both
  const result: SolveResult = {
    ...second,
    processingTimeMs: first.processingTimeMs + second.processingTimeMs,
    tokenUsage: addUsage(first.tokenUsage, second.tokenUsage),
  };
  const secondChecked = codeCheck(problem, second.content);
  if (secondChecked.check === "failed") {
    return { result, content: withCheckWarning(secondChecked.content), check: "failed" };
  }
  return { result, ...secondChecked };
}

// "gemini-2.5-flash" is Google; "deepseek/deepseek-v4-flash" is DeepSeek
function makerOf(model: string): string {
  if (model.startsWith("gemini")) return "google";
  return model.includes("/") ? (model.split("/")[0] as string) : model;
}

/**
 * Stores the solution in the cache: shared if the code check passed,
 * private ("unchecked") if the code could not check it. A failed answer is
 * never stored.
 */
export async function putInCache(
  key: string,
  result: SolveResult,
  content: SolutionV2Content,
  check: CodeCheck
): Promise<void> {
  if (check === "failed") return;
  await solutionCache.put(key, {
    content,
    problemType: result.problemType,
    status: check === "passed" ? "shared" : "unchecked",
    checkMethod: check === "passed" ? "code" : undefined,
    checkedBy: { primary: result.model },
  });
}

/** For an unchecked entry: ask a second model, and share only if it agrees. */
export async function secondModelCheck(
  solver: MathSolver,
  key: string,
  problem: string,
  result: SolveResult
): Promise<void> {
  const firstAnswer = result.content.answer.latex ?? result.content.answer.text;
  if (!firstAnswer) return;

  const opinion = await solver.secondOpinion(problem, result.model);
  if (!opinion) return;

  // A maker never checks its own answer
  if (result.model && makerOf(opinion.model) === makerOf(result.model)) {
    logger.warn("Second check came from the same maker; not sharing", { model: opinion.model });
    return;
  }

  if (answersMatch(firstAnswer, opinion.answer)) {
    await solutionCache.shareAfterSecondCheck(key, { primary: result.model, second: opinion.model });
  } else {
    logger.info("Second model gave a different answer; not sharing", { model: opinion.model });
  }
}
