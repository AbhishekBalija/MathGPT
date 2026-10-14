import { useCallback, useEffect, useRef, useState } from "react";

interface AutoRefresh<T> {
  data: T | null;
  error: string | null;
  updatedAt: Date | null;
  refresh: () => void;
}

// Loads now and again every `intervalMs` while the tab is visible, and
// straight away when you come back to the tab. A failed load keeps the
// last data and reports the error.
export function useAutoRefresh<T>(load: () => Promise<T>, intervalMs = 60_000): AutoRefresh<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // Always call the newest load, even from a timer set earlier
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Only the newest load may update the screen, and none after the page closes
  const latest = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    const request = ++latest.current;
    const isCurrent = () => mounted.current && request === latest.current;
    loadRef.current().then(
      (next) => {
        if (!isCurrent()) return;
        setData(next);
        setError(null);
        setUpdatedAt(new Date());
      },
      (failure: unknown) => {
        if (isCurrent()) setError(failure instanceof Error ? failure.message : "Couldn't load this");
      },
    );
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, intervalMs]);

  return { data, error, updatedAt, refresh };
}
