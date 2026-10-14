import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { sendFeedback, type FeedbackKind, type SendResult } from "../../services/feedback.service";

interface FeedbackDialogProps {
  onClose: () => void;
  // Sent along so we know where the student was
  page: string;
  solutionId?: string;
}

const KINDS: Array<{ kind: FeedbackKind; label: string }> = [
  { kind: "bug", label: "Bug" },
  { kind: "idea", label: "Idea" },
  { kind: "other", label: "Other" },
];

const MAX_LENGTH = 1000;

const ERRORS: Record<Exclude<SendResult, "sent">, string> = {
  failed: "That didn't send. Please try again.",
  rate_limited: "You've sent a lot of feedback. Please try again in an hour.",
};

// A small form for telling us about the app: a bug, an idea or anything else.
// A bottom sheet on phones, a centred card on bigger screens.
export function FeedbackDialog({ onClose, page, solutionId }: FeedbackDialogProps) {
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | SendResult>("idle");

  // Escape closes it, like any other dialog
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSend = kind !== null && message.trim().length > 0 && state !== "sending";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!kind || !canSend) return;
    setState("sending");
    setState(await sendFeedback({ kind, message: message.trim(), page, solutionId }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-gray-900 sm:rounded-2xl dark:bg-[#1a141a] dark:text-gray-50"
      >
        <div className="flex items-center justify-between">
          <h2 id="feedback-title" className="text-lg font-semibold">
            Send feedback
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {state === "sent" ? (
          <div className="py-6">
            <p role="status" className="text-gray-700 dark:text-gray-300">
              Thanks! We read every message.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 min-h-11 w-full rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white dark:bg-gray-50 dark:text-gray-900"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-2">
            <div className="flex gap-2" role="group" aria-label="What kind of feedback">
              {KINDS.map((option) => (
                <button
                  key={option.kind}
                  type="button"
                  onClick={() => setKind(option.kind)}
                  aria-pressed={kind === option.kind}
                  className={`min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold ${
                    kind === option.kind
                      ? "border-gray-900 bg-gray-900 text-white dark:border-gray-50 dark:bg-gray-50 dark:text-gray-900"
                      : "border-gray-300 hover:bg-gray-50 dark:border-white/20 dark:hover:bg-white/5"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label htmlFor="feedback-message" className="mt-4 block text-sm font-semibold">
              What's on your mind?
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={MAX_LENGTH}
              rows={5}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-transparent p-3 text-base dark:border-white/20"
            />
            <p className="mt-1 text-right text-xs text-gray-600 dark:text-gray-400">
              {message.length} / {MAX_LENGTH}
            </p>

            {state === "failed" || state === "rate_limited" ? (
              <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
                {ERRORS[state]}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSend}
              className="mt-3 min-h-11 w-full rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-40 dark:bg-gray-50 dark:text-gray-900"
            >
              {state === "sending" ? "Sending..." : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
