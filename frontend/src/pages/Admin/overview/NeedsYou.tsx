import type { AdminOverview } from "../../../services/admin.service";
import { formatAdminTime } from "../shared/formatAdminTime";
import { Card } from "./cards";
import { MUTED } from "./styles";

type Item = AdminOverview["needsYou"][number];

const TAGS: Record<Item["kind"], { label: string; className: string }> = {
  failed: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-400" },
  report: { label: "Report", className: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-400" },
  feedback: { label: "Feedback", className: "bg-brand-600/10 text-brand-700 dark:bg-brand-300/15 dark:text-brand-300" },
};

interface NeedsYouProps {
  items: Item[];
  selectedId: string | null;
  onSelect: (item: Item) => void;
}

export function NeedsYou({ items, selectedId, onSelect }: NeedsYouProps) {
  return (
    <Card title="Needs you" note={`${items.length} open`}>
      {items.length === 0 ? (
        <p className={`px-4 pb-4 text-sm ${MUTED}`}>Nothing open. All caught up.</p>
      ) : (
        <ul>
          {items.map((item) => {
            const tag = TAGS[item.kind];
            const selected = item.id === selectedId;
            return (
              <li key={`${item.kind}-${item.id}`} className="border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-pressed={selected}
                  className={`grid min-h-11 w-full grid-cols-[72px_1fr_auto] items-start gap-3 px-4 py-3 text-left ${
                    selected ? "bg-gray-50 shadow-[inset_2px_0_0] shadow-brand-600 dark:bg-white/5 dark:shadow-brand-300" : "hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <span className={`rounded-md px-1.5 py-0.5 text-center text-xs font-semibold ${tag.className}`}>{tag.label}</span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-sm break-words">{item.title}</span>
                    <span className={`mt-0.5 block text-xs ${MUTED}`}>{item.subtitle}</span>
                  </span>
                  <span className={`text-xs whitespace-nowrap ${MUTED}`}>{formatAdminTime(new Date(item.at))}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
