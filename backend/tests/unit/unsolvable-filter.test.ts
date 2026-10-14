import { describe, expect, it } from "vitest";
import { rejectObviouslyUnsolvable } from "../../src/services/ai/ai.service";
import { UnsolvableProblemError } from "../../src/services/ai/solver-errors";

describe("rejectObviouslyUnsolvable", () => {
  it.each([
    "limit as x approaches infinity of 1/x",
    "Is 0/5 undefined?",
    "Show that x^2 + 1 = 0 has no solution in real numbers",
    "10/0.5",
  ])("lets %j through to the AI", (problem) => {
    expect(() => rejectObviouslyUnsolvable(problem)).not.toThrow();
  });

  it.each(["what is 1/0", "divide by zero", "0/0"])("rejects %j", (problem) => {
    expect(() => rejectObviouslyUnsolvable(problem)).toThrow(UnsolvableProblemError);
  });
});
