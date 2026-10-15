import { describe, expect, it } from "vitest";
import { emptyRate, geminiResetAt, istDay, istWeekStart } from "../../src/modules/admin/overview/ist";

describe("istDay", () => {
  it("uses the India date, not the UTC date", () => {
    // 19:00 UTC on 14 Oct is 00:30 on 15 Oct in India
    expect(istDay(new Date("2026-10-14T19:00:00Z"))).toBe("2026-10-15");
    expect(istDay(new Date("2026-10-14T18:29:00Z"))).toBe("2026-10-14");
  });
});

describe("istWeekStart", () => {
  it("is the Monday of that India week", () => {
    expect(istWeekStart(new Date("2026-10-14T12:00:00Z"))).toBe("2026-10-12"); // a Wednesday
    expect(istWeekStart(new Date("2026-10-11T19:00:00Z"))).toBe("2026-10-12"); // 00:30 Monday in India
    expect(istWeekStart(new Date("2026-10-18T12:00:00Z"))).toBe("2026-10-12"); // Sunday
  });
});

describe("emptyRate", () => {
  it("is a whole percent, and 0 when there is nothing to divide by", () => {
    expect(emptyRate(0, 0)).toBe(0);
    expect(emptyRate(2, 3)).toBe(67);
    expect(emptyRate(3, 3)).toBe(100);
  });
});

describe("geminiResetAt", () => {
  it("is the next midnight in California, when the free tier resets", () => {
    // October: California is on summer time (UTC-7), so midnight there is 07:00 UTC (12:30 India)
    expect(geminiResetAt(new Date("2026-10-14T18:00:00Z")).toISOString()).toBe("2026-10-15T07:00:00.000Z");
    // December: winter time (UTC-8), so 08:00 UTC (13:30 India)
    expect(geminiResetAt(new Date("2026-12-14T18:00:00Z")).toISOString()).toBe("2026-12-15T08:00:00.000Z");
    // Just after midnight there: the next one is a day away
    expect(geminiResetAt(new Date("2026-10-15T07:30:00Z")).toISOString()).toBe("2026-10-16T07:00:00.000Z");
  });
});
