interface ConfirmInlineProps {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

// "Are you sure?" in place, for actions that are hard to undo
// (unblocking an answer, deleting a student). No browser pop-up.
export function ConfirmInline({ message, confirmLabel, onConfirm, onCancel, busy = false }: ConfirmInlineProps) {
  return (
    <div role="alertdialog" aria-label={message} className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-400/30 dark:bg-red-400/10">
      <p>{message}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="min-h-11 rounded-xl bg-red-600 px-4 font-semibold text-white disabled:opacity-50 dark:bg-red-500"
        >
          {busy ? "Working..." : confirmLabel}
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-gray-300 px-4 font-semibold dark:border-white/20">
          Cancel
        </button>
      </div>
    </div>
  );
}
