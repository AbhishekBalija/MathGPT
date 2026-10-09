import { Plus } from "lucide-react";

interface SlimComposerProps {
  onOpen: () => void;
  onNew?: () => void;
}

// Small bar for phones while reading a solution. Tapping it opens the full input.
export function SlimComposer({ onOpen, onNew }: SlimComposerProps) {
  return (
    <div className="flex items-center gap-2 border-t border-gray-200 px-3 pb-3 pt-2.5 dark:border-white/10">
      <button
        type="button"
        onClick={onOpen}
        className="min-h-11 flex-1 rounded-2xl border border-gray-200 bg-white px-4 text-left text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
      >
        Ask another problem
      </button>
      <button
        type="button"
        onClick={onNew}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gray-200 px-3 font-semibold text-gray-900 dark:border-white/10 dark:text-gray-50"
      >
        <Plus className="size-4" aria-hidden="true" />
        New
      </button>
    </div>
  );
}
