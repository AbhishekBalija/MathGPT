import type { ReactNode } from "react";

interface DetailsPanelProps {
  onClose: () => void;
  children: ReactNode;
}

// One item's details: on the right on laptops, below the list on phones.
// Only shown when an item is picked.
export function DetailsPanel({ onClose, children }: DetailsPanelProps) {
  return (
    <aside
      aria-label="Details"
      className="border-t border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#141014] lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-l lg:border-t-0"
    >
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
        >
          Close
        </button>
      </div>
      {children}
    </aside>
  );
}
