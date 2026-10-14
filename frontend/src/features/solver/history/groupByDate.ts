export type HistoryGroupLabel = "Today" | "This week" | "Older";

export interface HistoryGroup<T> {
  label: HistoryGroupLabel;
  items: T[];
}

// Midnight at the start of the day, in the student's own time zone.
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Splits history into Today, This week (the last 7 days) and Older.
// Groups with nothing in them are left out. The order of items is kept.
export function groupByDate<T extends { createdAt: string }>(items: T[], now: Date): HistoryGroup<T>[] {
  const today = startOfDay(now);
  // Built from calendar fields so a daylight-saving change never moves it off midnight
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();

  const groups: HistoryGroup<T>[] = [
    { label: "Today", items: [] },
    { label: "This week", items: [] },
    { label: "Older", items: [] },
  ];

  for (const item of items) {
    const day = startOfDay(new Date(item.createdAt));
    if (day >= today) groups[0].items.push(item);
    else if (day >= weekStart) groups[1].items.push(item);
    else groups[2].items.push(item);
  }

  return groups.filter((group) => group.items.length > 0);
}
