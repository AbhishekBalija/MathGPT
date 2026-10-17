/**
 * INCOMPLETE: part of the problem is missing: "= 5", "x =", "1 +", "* 5".
 * Reply: "Part of the problem looks missing."
 *
 * "5 + 3 = ?" is fine: the "?" means "find it".
 */

import type { GuardRule } from "../check-problem";
import type { ProblemShape } from "../problem-shape";

// Operators that need something on both sides. A lone "+" or "-" in front
// of a number is a sign ("-5"), so only these may not start a problem.
const NEEDS_LEFT_SIDE = new Set(["*", "/", "×", "÷", "^"]);

function hasEmptySideOfEquals(shape: ProblemShape): boolean {
  return shape.sides.length > 1 && shape.sides.some((side) => side.length === 0);
}

function endsWithOperator(shape: ProblemShape): boolean {
  return shape.tokens.at(-1)?.kind === "operator";
}

function startsWithOperator(shape: ProblemShape): boolean {
  const first = shape.tokens[0];
  return first !== undefined && NEEDS_LEFT_SIDE.has(first.text);
}

export const incomplete: GuardRule = {
  reason: "incomplete",
  blocks: (shape) => hasEmptySideOfEquals(shape) || endsWithOperator(shape) || startsWithOperator(shape),
};
