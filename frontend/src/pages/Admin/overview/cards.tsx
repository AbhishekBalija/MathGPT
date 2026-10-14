import type { ReactNode } from "react";
import { CARD, MUTED } from "./styles";

export function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={CARD}>
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {note ? <span className={`text-xs ${MUTED}`}>{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

// A row with a faint bar behind it, as wide as its share
export function BarRow({ label, value, share }: { label: string; value: string; share: number }) {
  return (
    <div className="relative flex justify-between px-4 py-2 text-sm">
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-2 rounded-md bg-brand-600/10 dark:bg-brand-300/10"
        style={{ width: `calc(${Math.max(0, Math.min(100, share))}% - 1rem)` }}
      />
      <span className="relative">{label}</span>
      <span className={`relative ${MUTED}`}>{value}</span>
    </div>
  );
}
