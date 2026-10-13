/**
 * What happens to a fresh AI solution before it may be shared:
 *
 * 1. Code check (verifyAnswer). Passed: label it and share it at once.
 *    Failed: never share it, and log it for the admin.
 * 2. Unchecked: store it privately, then (after the response) ask a model
 *    from a different maker for the final answer. Share it only if the two
 *    answers match.
 */

import { logger } from "../../../lib/logger";
import type { MathSolver, SolveResult } from "../../ai/math-solver";
import type { SolutionV2Content } from "../../solutions/solution-v2.schema";
import { verifyAnswerWithKind } from "../verify/verify-answer";
import { answersMatch, solutionCache } from "./solution-cache";

// The only claims we ever make about a check
const CHECK_LABELS = {
  recomputed: "Checked by recomputing.",
  substituted: "Checked by putting the answer back in.",
} as const;

export type CodeCheck = "passed" | "failed" | "unchecked";

/** Runs the code check and adds the honest label when it passed. */
export function codeCheck(problem: string, content: SolutionV2Content): { content: SolutionV2Content; check: CodeCheck } {
  const verdict = verifyAnswerWithKind(problem, content);
  if (verdict.result !== "passed") {
    return { content, check: verdict.result };
  }
  const label = verdict.kind === "arithmetic" ? CHECK_LABELS.recomputed : CHECK_LABELS.substituted;
  return { content: { ...content, answer: { ...content.answer, check: label } }, check: "passed" };
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
