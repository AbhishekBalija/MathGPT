/**
 * A cheap first check, before any AI call, that the text could be a math
 * problem. It only turns away text with no math in it at all (an essay
 * request, a joke), so it can be loose: the AI makes the real decision.
 */

// A digit or a math symbol
const MATH_CHARACTER = /[0-9+\-×÷*/=^√∫πθ<>≤≥]/;

// Math words, whole words only, with an optional plural "s"
const MATH_WORD =
  /\b(solve|simplify|factor|factorise|factorize|integrate|integral|differentiate|derivative|limit|area|volume|probability|mean|prove|equation|fraction|percent|find)s?\b/i;

export function looksLikeMath(problem: string): boolean {
  return MATH_CHARACTER.test(problem) || MATH_WORD.test(problem);
}
