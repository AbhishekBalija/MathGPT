import type { Solution, Step } from "../../../stores/chatStore";
import { toSolutionV2 } from "./adapter";
import type { SolutionV2 } from "./solution";

// The typed part of a v2 solution, as the server saves it (no id or date).
export type SolutionContent = Omit<SolutionV2, "id" | "createdAt">;

// What the server sends for one solution. A v2 reply may carry only the content.
// The single-solution endpoint also sends the old fields, with content null for old rows.
export interface ApiSolution {
  id: string;
  createdAt: string;
  // The old fields, as plain strings because that is how they arrive
  problem?: string;
  problemType?: string;
  steps?: Array<Omit<Step, "status"> & { status: string }>;
  finalAnswer?: string;
  summary?: string;
  processingTimeMs?: number;
  formatVersion?: number;
  content?: SolutionContent | null;
}

// One rule for the solve path and the history path:
// use `content` for a v2 solution, otherwise convert the old fields.
// Returns null when the reply has neither, so the caller can treat it as a failure.
export function resolveSolution(api: ApiSolution): SolutionV2 | null {
  if (api.formatVersion === 2 && hasPageShape(api.content)) {
    return { ...api.content, id: api.id, createdAt: api.createdAt };
  }
  if (api.problem === undefined || !api.steps || api.finalAnswer === undefined) return null;
  return toSolutionV2({
    id: api.id,
    problem: api.problem,
    problemType: (api.problemType ?? "unknown") as Solution["problemType"],
    steps: api.steps.map((step) => ({ ...step, status: step.status as Step["status"] })),
    finalAnswer: api.finalAnswer,
    summary: api.summary ?? "",
    processingTimeMs: api.processingTimeMs ?? 0,
    createdAt: new Date(api.createdAt),
  });
}

// The page reads these top-level fields directly, so a reply missing one would
// crash it. Blocks inside the steps are checked one by one when they render.
function hasPageShape(content: SolutionContent | null | undefined): content is SolutionContent {
  return (
    !!content &&
    !!content.header &&
    !!content.problem &&
    !!content.answer &&
    Array.isArray(content.steps) &&
    content.steps.length > 0
  );
}
