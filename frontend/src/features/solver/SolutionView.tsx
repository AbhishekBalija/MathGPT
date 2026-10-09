import { useState, type ReactNode } from "react";
import { AnswerStep } from "./AnswerStep";
import { InlineText } from "./blocks/InlineText";
import { profileFor } from "./model/displayProfile";
import type { SolutionV2 } from "./model/solution";
import { ProblemHeader } from "./ProblemHeader";
import { StepItem } from "./StepItem";

export type SolutionMode = "all" | "one";

interface SolutionViewProps {
  solution: SolutionV2;
  mode: SolutionMode;
  onModeChange: (mode: SolutionMode) => void;
  onEdit?: () => void;
  onNew?: () => void;
  onMethodChange?: (methodId: string) => void;
  // Lets the phone layout draw its own "Next step" bar.
  renderNextStep?: (next: () => void, shown: number, total: number) => ReactNode;
}

const BUTTON = "min-h-11 rounded-xl px-4 text-sm font-semibold";

export function SolutionView(props: SolutionViewProps) {
  // A new solution remounts the body, so "revealed" starts again at 1.
  return <SolutionBody key={props.solution.id} {...props} />;
}

function SolutionBody({
  solution,
  mode,
  onModeChange,
  onEdit,
  onNew,
  onMethodChange,
  renderNextStep,
}: SolutionViewProps) {
  const [revealed, setRevealed] = useState(1);
  const [pickingMethod, setPickingMethod] = useState(false);

  const total = solution.steps.length;
  const profile = profileFor(solution.header.level);
  const hasMarks = solution.steps.some((s) => s.earnsMarks);
  const showMarksKey = profile.marksKey && hasMarks;
  const { method } = solution.header;
  const { sections } = solution;

  const stepMode = mode === "one";
  const shown = stepMode ? Math.min(revealed, total) : total;
  const answerVisible = !stepMode || shown >= total;
  const next = () => setRevealed((n) => Math.min(n + 1, total));
  const showAll = () => setRevealed(total);

  return (
    <article className="text-gray-900 dark:text-gray-100">
      <ProblemHeader solution={solution} onEdit={onEdit} onNew={onNew} />

      {profile.sections && sections && (sections.given || sections.toFind || sections.toProve) ? (
        <dl className="mt-3 space-y-1 text-sm">
          {sections.given ? <Section term="Given" text={sections.given} /> : null}
          {sections.toFind ? <Section term="To find" text={sections.toFind} /> : null}
          {sections.toProve ? <Section term="To prove" text={sections.toProve} /> : null}
        </dl>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-gray-600 dark:text-gray-400">
        <span>Method: {method.label}</span>
        {method.alternatives.length > 0 ? (
          <button
            type="button"
            onClick={() => setPickingMethod(!pickingMethod)}
            className="min-h-11 font-semibold underline underline-offset-4"
          >
            Change
          </button>
        ) : null}
      </div>
      {pickingMethod ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {method.alternatives.map((alt) => (
            <li key={alt.id}>
              <button
                type="button"
                onClick={() => {
                  setPickingMethod(false);
                  onMethodChange?.(alt.id);
                }}
                className={`${BUTTON} border border-gray-300 dark:border-gray-600`}
              >
                {alt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          {total} {total === 1 ? "step" : "steps"} and the answer
        </p>
        <div role="group" aria-label="How to show the steps" className="flex gap-1">
          <ModeButton active={!stepMode} onClick={() => onModeChange("all")}>
            All
          </ModeButton>
          <ModeButton active={stepMode} onClick={() => onModeChange("one")}>
            One at a time
          </ModeButton>
        </div>
      </div>

      {showMarksKey ? (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Pink numbers are the steps that earn marks in exams.
        </p>
      ) : null}

      <ol className="mt-3 flex flex-col gap-2.5">
        {solution.steps.slice(0, shown).map((step, index) => (
          <StepItem key={`${solution.id}-${index}`} id={`${solution.id}-${index}`} step={step} number={index + 1} showMarks={showMarksKey} />
        ))}
      </ol>

      {stepMode && shown < total ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {renderNextStep ? (
            renderNextStep(next, shown, total)
          ) : (
            <button type="button" onClick={next} className={`${BUTTON} bg-brand-600 text-white hover:bg-brand-700`}>
              Next step
            </button>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {shown} of {total}
          </span>
        </div>
      ) : null}

      {answerVisible ? (
        <AnswerStep answer={solution.answer} />
      ) : (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-400">
          <span>The answer shows after the last step.</span>
          <button type="button" onClick={showAll} className={`${BUTTON} font-semibold underline`}>
            Show it now
          </button>
        </div>
      )}
    </article>
  );
}

function Section({ term, text }: { term: string; text: string }) {
  return (
    <div className="flex gap-2">
      <dt className="font-bold">{term}:</dt>
      <dd>
        <InlineText text={text} />
      </dd>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${BUTTON} ${
        active
          ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
          : "border border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400"
      }`}
    >
      {children}
    </button>
  );
}
