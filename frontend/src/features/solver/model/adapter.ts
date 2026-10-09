import type { Solution } from "../../../stores/chatStore";
import type { SolutionV2 } from "./solution";

// Function names and dx-style words that can appear inside a plain math expression.
const MATH_WORDS = /\b(sin|cos|tan|cot|sec|csc|log|ln|exp|sqrt|lim|int|pi|dx|dy|dt)\b/gi;

// "x^2+5x+6=0" is a math expression; "Divide 156 by 4" is a sentence.
function isPlainExpression(text: string): boolean {
  return !/[A-Za-z]{2,}/.test(text.replace(MATH_WORDS, ""));
}

// Converts a saved (old format) solution into the v2 shape.
// Old rows have no level or method, so the header shows neither.
// The old VERIFIED status is dropped on purpose, v2 never shows it.
export function toSolutionV2(old: Solution): SolutionV2 {
  return {
    formatVersion: 2,
    id: old.id,
    createdAt: old.createdAt.toISOString(),
    header: {
      questionType: old.problemType,
      method: { id: "default", label: "", alternatives: [] },
    },
    // Sentences stay as text; KaTeX would drop their spaces and set them in italics
    problem: isPlainExpression(old.problem) ? { latex: old.problem, task: "" } : { text: old.problem, task: "" },
    steps: old.steps.map((step) => ({
      kind: "calculation",
      reason: step.justification,
      why: step.explanation,
      earnsMarks: false,
      block: { type: "equation", latex: step.expression },
    })),
    answer: { latex: old.finalAnswer },
  };
}
