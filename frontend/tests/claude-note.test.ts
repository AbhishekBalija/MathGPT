import { describe, expect, it } from "vitest";
import { buildClaudeNote, type ClaudeNoteInput } from "../src/pages/Admin/shared/buildClaudeNote";

const ORIGIN = "https://neomath.vercel.app";

function failed(overrides: Partial<ClaudeNoteInput> = {}): ClaudeNoteInput {
  return {
    kind: "failed",
    id: "2b91c0de-1111-4000-8000-000000000000",
    adminPath: "/admin/failed/2b91c0de-1111-4000-8000-000000000000",
    at: new Date("2026-10-14T17:19:00Z"),
    ms: 33054,
    errorCode: "AI_UNREACHABLE",
    fullMessage: "All models failed: gemini-2.5-flash: Error fetching",
    attempts: [
      { model: "gemini-2.5-flash", error: "Error fetching" },
      { model: "deepseek", error: "timed out" },
    ],
    promptVersion: "v2026-10-09",
    problem: "integrate x sin x dx",
    ...overrides,
  };
}

describe("buildClaudeNote", () => {
  it("gives the India and UTC time, what failed and a link back", () => {
    const note = buildClaudeNote(failed(), ORIGIN);

    expect(note).toContain("## Failed solve 2b91c0de");
    expect(note).toContain(`Link: ${ORIGIN}/admin/failed/2b91c0de-1111-4000-8000-000000000000`);
    expect(note).toContain("When: 2026-10-14 22:49 IST (17:19 UTC), 33054 ms");
    expect(note).toContain("Error: AI_UNREACHABLE\nAll models failed: gemini-2.5-flash: Error fetching");
    expect(note).toContain("Models: gemini-2.5-flash: Error fetching | deepseek: timed out");
    expect(note).toContain("Prompt: v2026-10-09");
    expect(note).toContain("Sentry: https://sentry.io/issues/?query=2b91c0de-1111-4000-8000-000000000000");
  });

  it("keeps a 2,000-character problem with new lines whole", () => {
    const problem = "∫ x sin x dx\n".repeat(200).slice(0, 2000);

    const note = buildClaudeNote(failed({ problem }), ORIGIN);

    const lines = problem.split("\n").map((line) => `  ${line}`);
    expect(note).toContain(`Problem:\n${lines.join("\n")}`);
  });

  it("opens Vercel logs on the 5 minutes around it", () => {
    const note = buildClaudeNote(failed(), ORIGIN);

    const link = note.match(/Vercel: (\S+)/)?.[1] ?? "";
    const params = new URL(link).searchParams;
    expect(Number(params.get("endDate")) - Number(params.get("startDate"))).toBe(5 * 60 * 1000);
    expect(Number(params.get("startDate"))).toBe(new Date("2026-10-14T17:19:00Z").getTime() - 150_000);
  });

  it("says what was reported and whether code checked it", () => {
    const note = buildClaudeNote(
      { kind: "report", id: "abcdef12-0000", adminPath: "/admin/reports/abcdef12-0000", at: new Date(), ms: null, problem: "d/dx log(sec x)", answer: "sec x", checkedByCode: false, message: "Step 2 is wrong" },
      ORIGIN,
    );

    expect(note).toContain("## Report abcdef12");
    expect(note).toContain("Answer: sec x");
    expect(note).toContain("Code check: did not check");
    expect(note).toContain("Message: Step 2 is wrong");
  });

  it("never has an email address in it", () => {
    expect(buildClaudeNote(failed(), ORIGIN)).not.toMatch(/@/);
  });
});
