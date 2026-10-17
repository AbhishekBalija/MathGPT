/**
 * MISSING PROBLEM: the text points to a question the student never sent:
 * "solve this", "q3", "ex 5.2 q4", "the question in the image".
 * Reply: "I can't see the question. Type or paste the full problem."
 *
 * How it decides: take away the filler words and the question numbers.
 * If nothing is left, there is no problem to solve. "Ex 5.2 q4: solve
 * 2x + 3 = 7" still has the problem in it, so it is let through.
 */

import type { GuardRule } from "../check-problem";
import type { Token } from "../problem-shape";

// Words that ask for help or point somewhere, but carry no math. Add new ones here.
const FILLER_WORDS = new Set([
  "solve", "answer", "do", "help", "explain", "please", "pls", "plz", "can", "could", "you", "u",
  "me", "my", "i", "need", "want", "with", "for", "of", "to", "a", "the", "this", "that", "it",
  "these", "those", "in", "on", "above", "below", "given", "following", "sum", "problem",
  "image", "photo", "pic", "picture", "screenshot", "homework", "hw", "book", "textbook",
]);

// Words that come before a question number ("q 3", "ex 5.2", "page 45")
const REFERENCE_WORDS = new Set([
  "q", "question", "questions", "ques", "qn", "no", "number", "ex", "exercise", "exr",
  "page", "pg", "chapter", "ch", "class", "std", "ncert", "rd", "sharma", "rs", "aggarwal",
]);

// A number right after a reference word is a question number, not math
function isQuestionNumber(token: Token, index: number, tokens: Token[]): boolean {
  const before = tokens.slice(0, index).filter((earlier) => earlier.kind !== "other").at(-1);
  return token.kind === "number" && before !== undefined && REFERENCE_WORDS.has(before.text);
}

function isFiller(token: Token, index: number, tokens: Token[]): boolean {
  if (token.kind === "other") return true;
  if (token.kind === "word") return FILLER_WORDS.has(token.text) || REFERENCE_WORDS.has(token.text);
  return isQuestionNumber(token, index, tokens);
}

export const missingProblem: GuardRule = {
  reason: "missing_problem",
  blocks: (shape) => shape.tokens.some((token) => token.kind === "word") && shape.tokens.every(isFiller),
};
