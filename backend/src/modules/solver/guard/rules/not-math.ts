/**
 * NOT MATH: nothing in the text looks like math at all ("tell me a joke").
 * Reply: "That doesn't look like a math problem."
 *
 * This is the last rule and it is loose on purpose: one digit, math symbol
 * or math word is enough to let the Problem through, and the AI makes the
 * real decision.
 */

import type { GuardRule } from "../check-problem";

// A digit or a math symbol
const MATH_CHARACTER = /[0-9+\-×÷*/=^√∫πθ<>≤≥]/;

// Math words, whole words only, with an optional plural "s". Add new ones
// to the group they fit, so "how many sides does a hexagon have" or
// "a die is rolled" still reach the AI.
const MATH_WORDS = [
  // Tasks
  "solve|simplify|factor|factorise|factorize|integrate|integral|differentiate|derivative|limit|prove|equation|find",
  "calculate|evaluate|compute|how many|how much|value|number|digit",
  // Operations
  "sum|total|difference|product|quotient|remainder|multiply|divide|add|subtract|square|cube|root|power",
  // Everyday math
  "fraction|percent|percentage|ratio|average|mean|median|mode|probability|interest|profit|loss|speed|distance",
  // Probability objects
  "die|dice|coin|card|marble|ball|chance|odd",
  // Shapes
  "area|volume|perimeter|circumference|radius|diameter|angle|triangle|circle|rectangle|polygon|hexagon|pentagon|side",
  // Number words
  "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|hundred|thousand|half|twice",
];

const MATH_WORD = new RegExp(`\\b(${MATH_WORDS.join("|")})s?\\b`, "i");

export const notMath: GuardRule = {
  reason: "not_math",
  blocks: (shape) => !MATH_CHARACTER.test(shape.text) && !MATH_WORD.test(shape.text),
};
