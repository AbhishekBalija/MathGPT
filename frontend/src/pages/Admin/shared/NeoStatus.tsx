import NeoMascot from "../../../components/brand/NeoMascot";

export type NeoState = "fine" | "attention" | "down";

const STATES: Record<NeoState, { label: string; box: string; labelColor: string }> = {
  fine: {
    label: "All fine",
    box: "border-l-emerald-700 dark:border-l-emerald-400",
    labelColor: "text-emerald-700 dark:text-emerald-400",
  },
  attention: {
    label: "Needs you",
    box: "border-l-amber-700 bg-amber-50 dark:border-l-amber-400 dark:bg-amber-400/5",
    labelColor: "text-amber-700 dark:text-amber-400",
  },
  down: {
    label: "Something is down",
    box: "border-l-red-600 bg-red-50 dark:border-l-red-400 dark:bg-red-400/10",
    labelColor: "text-red-600 dark:text-red-400",
  },
};

interface NeoStatusProps {
  state: NeoState;
  title: string;
  text: string;
}

// Neo's one-line summary at the top of a screen. The edge colour changes
// with the state, so a bad day never looks like a calm one.
export function NeoStatus({ state, title, text }: NeoStatusProps) {
  const look = STATES[state];
  return (
    <div
      role="status"
      data-state={state}
      className={`flex items-center gap-4 rounded-2xl border border-l-4 border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#141014] ${look.box}`}
    >
      <NeoMascot title="" className="size-11 shrink-0" />
      <div className="min-w-0">
        <p className={`text-[11px] font-bold uppercase tracking-wider ${look.labelColor}`}>{look.label}</p>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-gray-600 dark:text-[#8b93a1]">{text}</p>
      </div>
    </div>
  );
}
