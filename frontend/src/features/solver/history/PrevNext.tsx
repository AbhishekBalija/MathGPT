import { ChevronLeft, ChevronRight } from "lucide-react";

interface PrevNextProps {
  // Place of the open problem in the list, starting at 1.
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

const ARROW =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-900 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-50 dark:hover:bg-white/10";

// Arrows to move between saved problems, with "Problem 1 of 3" between them.
export function PrevNext({ position, total, onPrev, onNext }: PrevNextProps) {
  return (
    <nav aria-label="Problems" className="flex items-center">
      <button type="button" onClick={onPrev} disabled={position <= 1} aria-label="Previous problem" className={ARROW}>
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <span className="text-sm tabular-nums text-gray-600 dark:text-gray-400">
        Problem {position} of {total}
      </span>
      <button type="button" onClick={onNext} disabled={position >= total} aria-label="Next problem" className={ARROW}>
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </nav>
  );
}
