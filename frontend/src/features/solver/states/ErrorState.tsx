import { useEffect, useState } from "react";
import NeoMascot from "../../../components/brand/NeoMascot";

interface ErrorStateProps {
  message: string;
  retryAfter?: number;
  onRetry: () => void;
}

// 40 seconds -> "0:40"
function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ErrorState(props: ErrorStateProps) {
  // A new wait time from the server remounts the card, so the countdown starts again.
  return <ErrorBody key={props.retryAfter} {...props} />;
}

function ErrorBody({ message, retryAfter, onRetry }: ErrorStateProps) {
  const [left, setLeft] = useState(retryAfter ?? 0);

  const waiting = left > 0;

  // Tick once a second until zero. The interval is cleared on unmount and at zero.
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [waiting]);

  return (
    <div
      className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
    >
      <NeoMascot className="w-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <b role="alert" className="block text-gray-900 dark:text-gray-50">
          {message}
        </b>
        <span aria-live="off" className="text-sm text-gray-600 dark:text-gray-400">
          {waiting ? (
            <>
              Take a breath. You can try again in <span className="tabular-nums">{formatClock(left)}</span>. Your
              problem is still here.
            </>
          ) : (
            "Your problem is still here."
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={waiting}
        className="min-h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-900 disabled:opacity-50 dark:border-white/10 dark:text-gray-50"
      >
        Try again
      </button>
    </div>
  );
}
