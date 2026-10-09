import type { Solution } from "../../../stores/chatStore";
import type { SolutionV2 } from "./solution";

// Converts a saved (old format) solution into the v2 shape.
// Old rows have no level or method, so they get a neutral default header.
// The old VERIFIED status is dropped on purpose, v2 never shows it.
export function toSolutionV2(old: Solution): SolutionV2 {
  return {
    formatVersion: 2,
    id: old.id,
    createdAt: old.createdAt.toISOString(),
    header: {
      level: "class9-10",
      questionType: old.problemType,
      method: { id: "default", label: "", alternatives: [] },
    },
    problem: { latex: old.problem, task: "" },
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
