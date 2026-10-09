import { useCallback, useEffect, useRef, useState } from "react";

export type DeleteToast = { kind: "undo"; id: string } | { kind: "failed" };

const UNDO_MS = 5000;
const FAILED_MS = 5000;

// Delete with Undo. The item is hidden at once and the real delete (`commit`) runs
// after 5 seconds, unless the student taps Undo. Leaving the page, or deleting a
// second item, finishes the waiting delete straight away. If `commit` fails the
// item comes back and a short message is shown.
export function useDeleteWithUndo(commit: (id: string) => Promise<boolean>) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<DeleteToast | null>(null);

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const failedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always call the newest commit, even from a timer set earlier.
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const unhide = useCallback((id: string) => {
    setHidden((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }, []);

  const finish = useCallback(
    async (id: string) => {
      clearTimeout(timers.current.get(id));
      timers.current.delete(id);
      setToast((current) => (current?.kind === "undo" && current.id === id ? null : current));

      const ok = await commitRef.current(id);
      if (ok) {
        // Gone for good, so it no longer needs hiding
        unhide(id);
        return;
      }
      unhide(id);
      setToast({ kind: "failed" });
      if (failedTimer.current) clearTimeout(failedTimer.current);
      failedTimer.current = setTimeout(() => {
        setToast((current) => (current?.kind === "failed" ? null : current));
      }, FAILED_MS);
    },
    [unhide],
  );

  const remove = useCallback(
    (id: string) => {
      // One Undo at a time: the earlier delete goes through now
      for (const waiting of [...timers.current.keys()]) void finish(waiting);
      if (failedTimer.current) clearTimeout(failedTimer.current);
      setHidden((ids) => new Set(ids).add(id));
      setToast({ kind: "undo", id });
      timers.current.set(
        id,
        setTimeout(() => void finish(id), UNDO_MS),
      );
    },
    [finish],
  );

  const undo = useCallback(() => {
    if (toast?.kind !== "undo") return;
    clearTimeout(timers.current.get(toast.id));
    timers.current.delete(toast.id);
    unhide(toast.id);
    setToast(null);
  }, [toast, unhide]);

  // Leaving the page: the student meant to delete, so finish every waiting delete.
  useEffect(() => {
    const waiting = timers.current;
    return () => {
      for (const id of [...waiting.keys()]) {
        clearTimeout(waiting.get(id));
        waiting.delete(id);
        void commitRef.current(id);
      }
      if (failedTimer.current) clearTimeout(failedTimer.current);
    };
  }, []);

  return { hidden, toast, remove, undo };
}
