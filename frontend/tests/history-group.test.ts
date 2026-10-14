import { describe, expect, it } from "vitest";
import { groupByDate } from "../src/features/solver/history/groupByDate";

describe("groupByDate", () => {
  // Wednesday 14 Oct 2026, midday
  const now = new Date(2026, 9, 14, 12, 0, 0);
  const at = (day: number, hour = 9) => new Date(2026, 9, day, hour).toISOString();

  it("groups history into Today, This week and Older", () => {
    const items = [
      { id: "a", createdAt: at(14, 8) },
      { id: "b", createdAt: at(10) },
      { id: "c", createdAt: at(2) },
    ];
    const groups = groupByDate(items, now);
    expect(groups.map((g) => g.label)).toEqual(["Today", "This week", "Older"]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([["a"], ["b"], ["c"]]);
  });

  it("leaves out empty groups and keeps the order inside a group", () => {
    const groups = groupByDate(
      [
        { id: "x", createdAt: at(14, 11) },
        { id: "y", createdAt: at(14, 7) },
      ],
      now,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.id)).toEqual(["x", "y"]);
  });

  it("puts exactly 6 days ago in This week and 7 days ago in Older", () => {
    const groups = groupByDate(
      [
        { id: "six", createdAt: at(8) },
        { id: "seven", createdAt: at(7) },
      ],
      now,
    );
    expect(groups.map((g) => [g.label, g.items[0].id])).toEqual([
      ["This week", "six"],
      ["Older", "seven"],
    ]);
  });
  it("keeps an item from six days ago in This week across a daylight-saving change", () => {
    // A daylight-saving change sits inside this week in zones that have one; the result must not depend on it
    const autumnNow = new Date(2026, 9, 28, 12, 0, 0);
    const sixDaysAgo = new Date(2026, 9, 22, 0, 30).toISOString();
    const groups = groupByDate([{ id: "x", createdAt: sixDaysAgo }], autumnNow);
    expect(groups).toEqual([{ label: "This week", items: [{ id: "x", createdAt: sixDaysAgo }] }]);
  });
});
