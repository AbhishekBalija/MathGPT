/**
 * The Problem Guard: a free check every Problem passes before an instant
 * answer, the cache or the AI. It lets the Problem through, or turns it away
 * with a Rejection Reason so the student gets a reply written for that case.
 *
 * How to read it: RULES below is the whole guard, in order. Each rule lives
 * in its own file under rules/. See README.md for how to add one.
 */

import { readShape } from "./problem-shape";
import type { ProblemShape } from "./problem-shape";
import { wellbeing } from "./rules/wellbeing";
import { unsafe } from "./rules/unsafe";
import { empty } from "./rules/empty";
import { offTopic } from "./rules/off-topic";
import { personalInfo } from "./rules/personal-info";
import { greeting } from "./rules/greeting";
import { missingProblem } from "./rules/missing-problem";
import { incomplete } from "./rules/incomplete";
import { notMath } from "./rules/not-math";
import { number } from "./rules/number";

export type RejectionReason = "wellbeing" | "unsafe" | "empty" | "personal_info" | "greeting" | "off_topic" | "number" | "missing_problem" | "incomplete" | "not_math";

export interface GuardRule {
  reason: RejectionReason;
  // True when this rule should turn the Problem away
  blocks: (shape: ProblemShape) => boolean;
}

export type GuardResult = { ok: true } | { ok: false; reason: RejectionReason };

// First match wins, so the order decides which reply a student sees
const RULES: GuardRule[] = [wellbeing, unsafe, empty, personalInfo, greeting, offTopic, number, missingProblem, incomplete, notMath];

export function checkProblem(problem: string): GuardResult {
  const shape = readShape(problem);
  const rule = RULES.find((candidate) => candidate.blocks(shape));
  return rule ? { ok: false, reason: rule.reason } : { ok: true };
}
