import NeoMascot from "../../../components/brand/NeoMascot";
import { Math } from "../blocks/Math";

interface EmptyStateProps {
  onPick: (problem: string) => void;
}

const EXAMPLES = [
  { label: "Class 3", problem: "156 ÷ 4", latex: "156 \\div 4" },
  { label: "Class 10", problem: "x^2 + 5x + 6 = 0", latex: "x^2 + 5x + 6 = 0" },
  { label: "College", problem: "\\int x e^x dx", latex: "\\int x e^x\\,dx" },
];

export function EmptyState({ onPick }: EmptyStateProps) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-8 text-center md:pt-16">
      <NeoMascot className="mx-auto w-24" />
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        What are we solving?
      </h2>
      <p className="mt-1.5 text-gray-600 dark:text-gray-400">Type a problem below. Neo shows every step.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => onPick(example.problem)}
            className="min-h-11 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left hover:border-gray-400 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30"
          >
            <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400">{example.label}</span>
            <span className="mt-1 block text-gray-900 dark:text-gray-50">
              <Math latex={example.latex} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
