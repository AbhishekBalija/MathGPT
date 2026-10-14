import katex from "katex";

// Function names students type without a backslash, e.g. "sin^2 x"
const FUNCTION_NAMES = /(?<![\\a-zA-Z])(sin|cos|tan|sec|csc|cot|log|ln|exp|lim)(?![a-zA-Z])/g;

// Hints that the text was written as math, e.g. \int, x^2, a_1 or ∫
const MATH_HINT = /\\[a-zA-Z]+|[\^_∫√]/;

// Returns LaTeX for a saved problem that is pure math, or null to show it as text.
// Anything with a real word in it (3+ letters) stays text, so "Solve x^2 = 4"
// is not squashed into one italic formula.
export function titleAsLatex(problem: string): string | null {
  if (!MATH_HINT.test(problem)) return null;

  const latex = problem.replace(FUNCTION_NAMES, "\\$1");
  const withoutCommands = latex.replace(/\\[a-zA-Z]+/g, "");
  if (/[a-zA-Z]{3,}/.test(withoutCommands)) return null;

  try {
    katex.renderToString(latex, { throwOnError: true });
    return latex;
  } catch {
    return null;
  }
}
