import { describe, it, expect } from "vitest";
import { toSolutionV2 } from "../src/features/solver/model/adapter";
import { profileFor } from "../src/features/solver/model/displayProfile";
import type { Solution } from "../src/stores/chatStore";

const oldSolution: Solution = {
  id: "s1",
  problem: "2x + 3 = 7",
  problemType: "algebra",
  steps: [
    {
      stepNumber: 1,
      expression: "2x = 4",
      justification: "Subtract 3 from both sides",
      explanation: "Subtracting 3 removes the constant on the left.",
      status: "VERIFIED",
    },
    {
      stepNumber: 2,
      expression: "x = 2",
      justification: "Divide both sides by 2",
      explanation: "Dividing both sides by 2 leaves x on its own.",
      status: "VERIFIED",
    },
  ],
  finalAnswer: "x = 2",
  summary: "Solved a linear equation.",
  processingTimeMs: 1200,
  createdAt: new Date("2026-10-09T10:00:00.000Z"),
};

describe("toSolutionV2", () => {
  it("turns each old step into an equation block, keeping reason and why", () => {
    const v2 = toSolutionV2(oldSolution);
    expect(v2.formatVersion).toBe(2);
    expect(v2.steps).toHaveLength(2);
    expect(v2.steps[1]).toMatchObject({
      kind: "calculation",
      reason: "Divide both sides by 2",
      why: "Dividing both sides by 2 leaves x on its own.",
      earnsMarks: false,
      block: { type: "equation", latex: "x = 2" },
    });
    expect(v2.answer.latex).toBe("x = 2");
  });
  it("never carries a Verified status", () => {
    expect(JSON.stringify(toSolutionV2(oldSolution))).not.toMatch(/verified/i);
  });
  it("gives old rows no level, so no class label is invented", () => {
    const header = toSolutionV2(oldSolution).header;
    expect(header.level).toBeUndefined();
    expect(header).toMatchObject({ questionType: "algebra", method: { id: "default", label: "", alternatives: [] } });
  });
  it("keeps a math expression as LaTeX and a sentence as plain text", () => {
    expect(toSolutionV2(oldSolution).problem).toEqual({ latex: "2x + 3 = 7", task: "" });
    expect(toSolutionV2({ ...oldSolution, problem: "sin(x) + \\sqrt{x}" }).problem.latex).toBe("sin(x) + \\sqrt{x}");
    expect(toSolutionV2({ ...oldSolution, problem: "Divide 156 by 4" }).problem).toEqual({ text: "Divide 156 by 4", task: "" });
  });
});

describe("profileFor", () => {
  it("hides the marks key and sections for class 1-5 and college", () => {
    expect(profileFor("class1-5")).toEqual({ sections: false, marksKey: false });
    expect(profileFor("college")).toEqual({ sections: false, marksKey: false });
  });
  it("shows no extras when the level is unknown", () => {
    expect(profileFor(undefined)).toEqual({ sections: false, marksKey: false });
  });
  it("shows them for class 9-10", () => {
    expect(profileFor("class9-10")).toEqual({ sections: true, marksKey: true });
  });
});
