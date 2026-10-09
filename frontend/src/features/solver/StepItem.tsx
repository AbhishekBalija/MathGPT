import { useState } from "react";
import { BlockView } from "./blocks/BlockView";
import { InlineText } from "./blocks/InlineText";
import type { SolutionStep, StepKind } from "./model/solution";

const KIND_LABELS: Record<StepKind, string> = {
  setup: "Setup",
  formula: "Formula",
  substitution: "Put in numbers",
  calculation: "Calculation",
  reasoning: "Reasoning",
  conclusion: "Conclusion",
  layout: "Working",
};

interface StepItemProps {
  step: SolutionStep;
  number: number; // starts at 1
  id: string; // changes with the solution so the block remounts
  showMarks: boolean; // false when the marks key is hidden, so every number is grey
}

// One step: number, kind, reason, the block, and a "Why?" toggle for the longer explanation.
export function StepItem({ step, number, id, showMarks }: StepItemProps) {
  const [open, setOpen] = useState(false);
  const pink = showMarks && step.earnsMarks;

  return (
    <li data-testid="step" className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <span
          data-testid={`step-num-${number}`}
          data-marks={String(pink)}
          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            pink
              ? "bg-brand-600 text-white dark:bg-brand-300 dark:text-gray-900"
              : "border border-gray-400 text-gray-600 dark:border-gray-500 dark:text-gray-400"
          }`}
        >
          {number}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
            {KIND_LABELS[step.kind]}
          </p>
          <p className="font-semibold">
            <InlineText text={step.reason} />
          </p>
        </div>
      </div>
      <div className="mt-3 sm:ml-9">
        <BlockView key={id} block={step.block} />
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Why? Hide the reason" : "Why? Show the reason"}
        onClick={() => setOpen(!open)}
        className="mt-1 min-h-11 text-sm text-gray-600 sm:ml-9 dark:text-gray-400"
      >
        <b>Why?</b>{" "}
        {open ? (
          "Hide"
        ) : (
          <>
            <span className="hidden sm:inline">Show</span>
            <span className="sm:hidden">Tap to see</span>
          </>
        )}
      </button>
      {open ? (
        <p className="mt-1 text-sm sm:ml-9">
          <InlineText text={step.why} />
        </p>
      ) : null}
    </li>
  );
}
