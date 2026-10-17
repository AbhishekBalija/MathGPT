/**
 * NUMBER: only a value, with nothing to do with it: "887", "-5", "₹500",
 * "50%", "5 kg", "30°", "10:30", "15/10/2026".
 * Reply: "That's just a number. What should I do with it?"
 *
 * Anything with a real operation between two numbers ("887 + 1", "1/2",
 * "5!") is not caught here.
 */

import type { GuardRule } from "../check-problem";
import type { Token } from "../problem-shape";

// Marks that can sit around a lone value without asking anything
const HARMLESS_MARKS = new Set(["(", ")", "?", ".", "₹", "$", "%", ":", "°"]);

// Currency and unit words that can follow or come before a lone value
const UNIT_WORDS = new Set([
  "rs", "inr", "rupees", "rupee", "paise",
  "kg", "g", "gm", "mg", "km", "m", "cm", "mm", "l", "ml",
  "sec", "secs", "s", "min", "mins", "hr", "hrs", "hour", "hours",
]);

// A date like 15/10/2026 or 15-10-2026 (a four-digit year, so "12-10-20" stays a subtraction)
const DATE = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/;

// A + or - in front of a number ("-5"), not between two numbers ("1 - 5")
function isSign(token: Token, index: number, tokens: Token[]): boolean {
  const before = tokens[index - 1];
  const after = tokens[index + 1];
  const startsValue = before === undefined || before.text === "(";
  return (token.text === "-" || token.text === "+") && startsValue && after?.kind === "number";
}

function isPartOfLoneValue(token: Token, index: number, tokens: Token[]): boolean {
  if (token.kind === "number") return true;
  if (token.kind === "word") return UNIT_WORDS.has(token.text);
  if (token.kind === "operator") return isSign(token, index, tokens);
  return HARMLESS_MARKS.has(token.text);
}

export const number: GuardRule = {
  reason: "number",
  blocks: (shape) => {
    if (DATE.test(shape.text)) return true;
    const hasNumber = shape.tokens.some((token) => token.kind === "number");
    return hasNumber && shape.tokens.every(isPartOfLoneValue);
  },
};
