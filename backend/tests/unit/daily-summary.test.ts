import { describe, expect, it } from "vitest";
import { buildDailySummary } from "../../src/modules/alerts/alert-emails";

const group = {
  id: "2b91c0de-1111-4000-8000-000000000000",
  problem: "integrate <x> sin x",
  tries: 3,
  firstAt: new Date(),
  lastAt: new Date(),
  errorCode: "AI_TIMEOUT",
  ms: 8400,
  student: { id: "s1", name: "Asha" },
  workedLater: false,
  resolved: false,
};

describe("buildDailySummary", () => {
  it("is nothing when there is nothing new", () => {
    expect(buildDailySummary({ failed: [], reports: 0, feedback: 0 }, "https://neomath.vercel.app")).toBeNull();
  });

  it("counts everything, links each failed problem and escapes the problem text", () => {
    const summary = buildDailySummary({ failed: [group], reports: 2, feedback: 1 }, "https://neomath.vercel.app");

    expect(summary?.subject).toBe("NeoMath: 4 new things to look at");
    expect(summary?.html).toContain("https://neomath.vercel.app/admin/failed/2b91c0de-1111-4000-8000-000000000000");
    expect(summary?.html).toContain("integrate &lt;x&gt; sin x");
    expect(summary?.html).toContain("×3");
    // Never the student's name
    expect(summary?.html).not.toContain("Asha");
  });

  it("says 1 new thing, not things", () => {
    expect(buildDailySummary({ failed: [], reports: 0, feedback: 1 }, "https://x.test")?.subject).toBe("NeoMath: 1 new thing to look at");
  });
});
