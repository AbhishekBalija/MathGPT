import { useState } from "react";
import { buildClaudeNote, type ClaudeNoteInput } from "./buildClaudeNote";

// Copies one item as a note Claude can debug from. When the browser won't
// let us copy, the note shows so it can be copied by hand.
export function CopyForClaude({ input }: { input: ClaudeNoteInput }) {
  const [copied, setCopied] = useState(false);
  const [manualNote, setManualNote] = useState<string | null>(null);

  const copy = async () => {
    const note = buildClaudeNote(input, window.location.origin);
    try {
      // The clipboard is missing on non-https pages and can be blocked
      if (!navigator.clipboard) throw new Error("No clipboard");
      await navigator.clipboard.writeText(note);
      setManualNote(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setManualNote(note);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white dark:bg-gray-50 dark:text-gray-900"
      >
        {copied ? "Copied" : "Copy for Claude"}
      </button>
      {manualNote ? (
        <label className="flex w-full flex-col gap-1 text-sm">
          <span className="text-gray-500 dark:text-[#8b93a1]">Couldn't copy. Select this and copy it yourself.</span>
          <textarea
            readOnly
            aria-label="Note for Claude"
            value={manualNote}
            onFocus={(event) => event.currentTarget.select()}
            rows={8}
            className="rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs dark:border-white/10 dark:bg-white/5"
          />
        </label>
      ) : null}
    </>
  );
}
