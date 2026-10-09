import { InlineText } from "../blocks/InlineText";

interface HintCardProps {
  hint: string;
  onShowSolution: () => void;
  onTryIt: () => void;
}

export function HintCard({ hint, onShowSolution, onTryIt }: HintCardProps) {
  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#d1257f] dark:text-[#ff5cbf]">Hint</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-gray-900 dark:text-gray-50">
        <InlineText text={hint} />
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onShowSolution}
          className="min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-gray-900"
        >
          Show the full solution
        </button>
        <button
          type="button"
          onClick={onTryIt}
          className="min-h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 dark:border-white/10 dark:text-gray-50"
        >
          I'll try it
        </button>
      </div>
    </div>
  );
}
