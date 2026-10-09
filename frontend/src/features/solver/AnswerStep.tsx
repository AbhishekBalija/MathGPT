import { useEffect, useRef, useState } from "react";
import { InlineText } from "./blocks/InlineText";
import { Math } from "./blocks/Math";
import type { SolutionV2 } from "./model/solution";

// The last step: a boxed conclusion with Copy. The check line only shows when the solution has one.
export function AnswerStep({ answer }: { answer: SolutionV2["answer"] }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Stop the pending reset if the answer goes away.
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    const value = answer.text ?? answer.latex ?? "";
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      // Copy can be blocked by the browser, so tell the student.
      setCopyState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("idle"), 1500);
  }

  return (
    <section
      id="answer"
      data-testid="answer"
      className="mt-6 flex scroll-mt-4 items-center justify-between gap-4 rounded-2xl border-2 border-brand-600 bg-white p-4 dark:border-brand-300 dark:bg-white/5"
    >
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">Answer</p>
        <div className="mt-1 flex items-center gap-2 text-2xl">
          <span aria-hidden="true">∴</span>
          {answer.latex ? <Math latex={answer.latex} /> : null}
          {answer.text ? <InlineText text={answer.text} /> : null}
          {answer.unit ? <span className="text-lg">{answer.unit}</span> : null}
        </div>
        {answer.sentence ? (
          <p className="mt-1">
            <InlineText text={answer.sentence} />
          </p>
        ) : null}
        {answer.check ? (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <InlineText text={answer.check} />
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button
          type="button"
          onClick={copy}
          className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-semibold dark:border-gray-600"
        >
          {copyState === "copied" ? "Copied" : "Copy"}
        </button>
        {copyState === "failed" ? (
          <p role="status" className="text-sm text-gray-600 dark:text-gray-400">
            Could not copy
          </p>
        ) : null}
      </div>
    </section>
  );
}
