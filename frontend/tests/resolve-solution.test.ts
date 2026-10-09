import { describe, expect, it } from "vitest";
import { resolveSolution, type ApiSolution } from "../src/features/solver/model/resolve";

const oldFields = {
  problem: "2x + 3 = 7",
  problemType: "algebra",
  steps: [{ stepNumber: 1, expression: "2x = 4", justification: "Subtract 3", explanation: "Move 3 across", status: "VERIFIED" }],
  finalAnswer: "x = 2",
};
const base: ApiSolution = { id: "s1", createdAt: "2026-10-09T10:00:00.000Z" };

describe("resolveSolution", () => {
  it("falls back to the old fields when a v2 row has no content", () => {
    const solution = resolveSolution({ ...base, ...oldFields, formatVersion: 2, content: null });
    expect(solution?.answer.latex ?? solution?.answer.text).toContain("x = 2");
  });

  it("falls back to the old fields when v2 content is missing its steps", () => {
    const broken = { header: {}, problem: { task: "Solve" }, answer: { text: "x = 2" } } as unknown as ApiSolution["content"];
    const solution = resolveSolution({ ...base, ...oldFields, formatVersion: 2, content: broken });
    expect(solution?.steps.length).toBe(1);
  });

  it("returns null when v2 content is broken and there are no old fields", () => {
    const broken = { steps: "nope" } as unknown as ApiSolution["content"];
    expect(resolveSolution({ ...base, formatVersion: 2, content: broken })).toBeNull();
  });
});
