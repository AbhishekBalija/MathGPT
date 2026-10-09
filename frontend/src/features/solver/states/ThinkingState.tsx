import { useEffect, useState } from "react";
import NeoMascot from "../../../components/brand/NeoMascot";

interface ThinkingStateProps {
  onCancel: () => void;
}

const SLOW_AFTER_MS = 15_000;

export function ThinkingState({ onCancel }: ThinkingStateProps) {
  const [slow, setSlow] = useState(false);

  // After 15 seconds, tell the student it is a tricky one. Timer is cleared on unmount.
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      className="mt-6 flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
    >
      <NeoMascot className="w-16 shrink-0" />
      <div className="min-w-0">
        <b className="block text-gray-900 dark:text-gray-50">Neo is working through it…</b>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {slow ? "Still working on it. Tricky one!" : "Usually takes about 10 seconds."}
        </span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="ml-auto min-h-11 shrink-0 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:text-gray-50 dark:hover:bg-white/10"
      >
        Cancel
      </button>
    </div>
  );
}
