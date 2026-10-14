import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Camera, Sigma } from "lucide-react";
import { Keypad } from "./Keypad";
import { ReadAs } from "./ReadAs";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSolve: (problem: string, view: "all" | "hint") => void;
  disabled?: boolean;
  // Free problems left today. The line is hidden when this is undefined.
  remaining?: number;
}

const DAILY_LIMIT = 5;
const MAX_FIELD_HEIGHT = 128;

function freeLine(remaining: number): string {
  if (remaining <= 0) return "No free problems left today. Come back tomorrow.";
  return `${remaining} of ${DAILY_LIMIT} free problems left today`;
}

export function Composer({
  value,
  onChange,
  onSolve,
  disabled = false,
  remaining,
}: ComposerProps) {
  const [keypadOpen, setKeypadOpen] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const problem = value.trim();
  const cannotSolve = disabled || problem === "";

  function submit(view: "all" | "hint") {
    if (cannotSolve) return;
    onSolve(problem, view);
  }

  // Grow the field with its text, up to about 5 lines, then scroll.
  // Runs on every value change, so keypad inserts and clearing after Solve resize too.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, MAX_FIELD_HEIGHT)}px`;
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter solves, Shift+Enter adds a line. Ignore Enter while an IME is composing.
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit("all");
  }

  // Put the symbol where the cursor is, then move the cursor after it.
  function insertAtCursor(text: string) {
    const field = fieldRef.current;
    // Read from the element, not the closure, so quick taps never use old text.
    const current = field?.value ?? value;
    const start = field?.selectionStart ?? current.length;
    const end = field?.selectionEnd ?? current.length;
    onChange(current.slice(0, start) + text + current.slice(end));
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  return (
    <div className="border-t border-gray-200 px-3 pb-4 pt-3 dark:border-white/10 md:px-6">
      <div className="mx-auto max-w-[720px]">
        <ReadAs value={value} />
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 focus-within:ring-2 focus-within:ring-brand-600 dark:border-white/10 dark:bg-white/5 dark:focus-within:ring-brand-300 sm:flex-nowrap sm:pl-3">
          <textarea
            ref={fieldRef}
            value={value}
            rows={1}
            aria-label="Your math problem"
            placeholder="Type a problem, like x^2 + 5x + 6 = 0"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className="max-h-32 min-h-11 grow basis-full resize-none overflow-y-auto bg-transparent px-1 py-2.5 sm:basis-0 sm:px-0 text-base text-gray-900 placeholder:text-gray-600 focus:outline-none dark:text-gray-50 dark:placeholder:text-gray-400"
          />
          <button
            type="button"
            aria-disabled="true"
            title="Photo input is coming soon"
            aria-label="Photo input is coming soon"
            onClick={(event) => event.preventDefault()}
            className="inline-flex min-h-11 min-w-11 cursor-not-allowed items-center justify-center rounded-xl text-gray-600 opacity-60 dark:text-gray-400"
          >
            <Camera className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-expanded={keypadOpen}
            aria-label={keypadOpen ? "Hide math keypad" : "Show math keypad"}
            onClick={() => setKeypadOpen((open) => !open)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-900 hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-white/10"
          >
            <Sigma className="size-5" aria-hidden="true" />
          </button>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              disabled={cannotSolve}
              onClick={() => submit("hint")}
              className="min-h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-900 disabled:opacity-50 dark:border-white/10 dark:text-gray-50"
            >
              Just a hint
            </button>
            <button
              type="button"
              disabled={cannotSolve}
              onClick={() => submit("all")}
              className="min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900"
            >
              Solve
            </button>
          </div>
        </div>
        {keypadOpen && <Keypad onInsert={insertAtCursor} />}
        {remaining !== undefined && (
          <p className="mt-2 px-1 text-xs text-gray-600 dark:text-gray-400">
            {freeLine(remaining)}
          </p>
        )}
      </div>
    </div>
  );
}
