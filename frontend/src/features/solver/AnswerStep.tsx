import { CircleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InlineText } from "./blocks/InlineText";
import { Math } from "./blocks/Math";
import type { SolutionV2 } from "./model/solution";

// "text" is for answers in words ("Yes, 7 is a prime number"). Models often
// repeat the formula there too ("x = 2", "x equals 2", "angle B = angle C"),
// so next to a formula the text only shows when it says something more.

// Words that also appear in plain formulas, so they do not count as "words"
const FORMULA_WORDS = new Set(["and", "sin", "cos", "tan", "sec", "csc", "cot", "log", "exp", "sqrt", "abs"]);

// Both answers as bare plain text: no LaTeX commands, braces, spaces or $,
// and "equals" read as "=", so copies of the formula compare equal
function plainForm(answer: string): string {
  return answer
    .toLowerCase()
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\(left|right)/g, "")
    .replace(/\\/g, "")
    .replace(/\bequals\b|\bis equal to\b/g, "=")
    .replace(/[{}$\s]/g, "");
}

function showTextBesideFormula(text: string, latex: string): boolean {
  if (plainForm(text) === plainForm(latex)) return false;
  const words = text.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  return words.some((word) => !FORMULA_WORDS.has(word));
}

// The last step: a boxed conclusion with Copy. The check line only shows when the
// solution has one, and the warning only when the server's check found it wrong.
export function AnswerStep({ answer }: { answer: SolutionV2["answer"] }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // False once the answer is gone, so a copy that finishes later does nothing
  const mounted = useRef(true);

  // Stop the pending reset if the answer goes away.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    const value = answer.text ?? answer.latex ?? "";
    let copied = true;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      copied = false;
    }
    // The clipboard can take a moment; the answer may have gone by then
    if (!mounted.current) return;
    // Copy can be blocked by the browser, so tell the student.
    setCopyState(copied ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("idle"), 1500);
  }

  return (
    <section
      id="answer"
      data-testid="answer"
      className="mt-6 scroll-mt-4 rounded-2xl border-2 border-brand-600 bg-white p-4 dark:border-brand-300 dark:bg-white/5"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">Answer</p>
          <div className="mt-1 flex items-center gap-2 text-2xl">
            <span aria-hidden="true">∴</span>
            {answer.latex ? <Math latex={answer.latex} /> : null}
            {answer.text && (!answer.latex || showTextBesideFormula(answer.text, answer.latex)) ? (
              <span data-testid="answer-text">
                <InlineText text={answer.text} />
              </span>
            ) : null}
            {answer.unit ? <span className="text-lg">{answer.unit}</span> : null}
          </div>
          {answer.sentence ? (
            <p className="mt-1">
              <InlineText text={answer.sentence} />
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
      </div>
      {/* Full width under the answer, so the Copy button never squeezes them */}
      {answer.check ? (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <InlineText text={answer.check} />
        </p>
      ) : null}
      {answer.warning ? (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-amber-800 dark:text-amber-300">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{answer.warning}</span>
        </p>
      ) : null}
    </section>
  );
}
