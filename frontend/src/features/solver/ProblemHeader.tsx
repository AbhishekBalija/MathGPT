import { InlineText } from "./blocks/InlineText";
import { Math } from "./blocks/Math";
import type { Level, SolutionV2 } from "./model/solution";

const LEVEL_LABELS: Record<Level, string> = {
  "class1-5": "Class 1 to 5",
  "class6-8": "Class 6 to 8",
  "class9-10": "Class 9 to 10",
  "class11-12": "Class 11 to 12",
  college: "College",
  grad: "Grad school",
};

interface ProblemHeaderProps {
  solution: SolutionV2;
  onEdit?: () => void;
  onNew?: () => void;
}

const SMALL_BUTTON =
  "min-h-11 px-3 text-sm font-semibold text-gray-600 underline-offset-4 hover:underline dark:text-gray-400";

// Top of the solution: level, the problem, what to do, and a link down to the answer.
export function ProblemHeader({ solution, onEdit, onNew }: ProblemHeaderProps) {
  const { header, problem } = solution;
  const label = [LEVEL_LABELS[header.level], header.board, header.questionType].filter(Boolean).join(" · ");

  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">{label}</p>
        <div className="flex">
          {onEdit ? (
            <button type="button" onClick={onEdit} className={SMALL_BUTTON}>
              Edit
            </button>
          ) : null}
          {onNew ? (
            <button type="button" onClick={onNew} className={`${SMALL_BUTTON} max-sm:hidden`}>
              New problem
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 text-2xl">
        {problem.latex ? <Math latex={problem.latex} display /> : null}
        {problem.text ? (
          <p className="text-lg">
            <InlineText text={problem.text} />
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        <InlineText text={problem.task} />
      </p>
      <a
        href="#answer"
        className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-300"
      >
        Jump to answer
      </a>
    </header>
  );
}
