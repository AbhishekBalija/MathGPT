/**
 * A cheap first check, before any AI call, that the text could be a math
 * problem. It only turns away text with no math in it at all (an essay
 * request, a joke), so it can be loose: the AI makes the real decision.
 */

// A digit or a math symbol
const MATH_CHARACTER = /[0-9+\-×÷*/=^√∫πθ<>≤≥]/;

// Math words, whole words only, with an optional plural "s": tasks,
// operations, shapes and number words, so "the square root of sixteen" or
// "how many sides does a hexagon have" still reach the AI
const MATH_WORD = new RegExp(
  "\\b(" +
    [
      "solve|simplify|factor|factorise|factorize|integrate|integral|differentiate|derivative|limit|prove|equation|find",
      "calculate|evaluate|compute|how many|how much|value|number|digit",
      "sum|total|difference|product|quotient|remainder|multiply|divide|add|subtract|square|cube|root|power",
      "fraction|percent|percentage|ratio|average|mean|median|mode|probability|interest|profit|loss|speed|distance",
      "area|volume|perimeter|circumference|radius|diameter|angle|triangle|circle|rectangle|polygon|hexagon|pentagon|side",
      "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|hundred|thousand|half|twice",
    ].join("|") +
    ")s?\\b",
  "i"
);

export function looksLikeMath(problem: string): boolean {
  return MATH_CHARACTER.test(problem) || MATH_WORD.test(problem);
}
