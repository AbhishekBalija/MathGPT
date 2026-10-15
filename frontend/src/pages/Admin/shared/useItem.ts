import { useCallback, useEffect, useState } from "react";

// Loads one item's details when `id` is set. An older answer never
// replaces a newer one, and nothing loads with no item picked.
export function useItem<T>(load: (id: string) => Promise<T>, id: string | null) {
  // The answer for one id: its data, or why it failed
  const [item, setItem] = useState<{ id: string; data: T | null; error: string | null } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!id) return;
    let current = true;
    load(id).then(
      (data) => current && setItem({ id, data, error: null }),
      (failure: unknown) => current && setItem({ id, data: null, error: failure instanceof Error ? failure.message : "Couldn't load this" }),
    );
    return () => {
      current = false;
    };
  }, [load, id, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  // Only the picked item's answer, never the last one's
  const forThisItem = item && item.id === id ? item : null;
  return { data: forThisItem?.data ?? null, error: forThisItem?.error ?? null, reload };
}
