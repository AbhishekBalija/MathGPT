import { describe, expect, it } from "vitest";
import { SOLVE_ERROR_COPY, toSolveError } from "../src/utils/errorMessages";

describe("toSolveError", () => {
  it("says the text is not math for a NOT_MATH reply, and asks for an edit", () => {
    const error = toSolveError({ status: 422, code: "NOT_MATH" });
    expect(error.message).toBe(SOLVE_ERROR_COPY.notMath);
    // Sending the same text again cannot work, so the page offers an edit instead
    expect(error.needsEdit).toBe(true);
  });

  it("keeps Try again for errors that can pass on a second go", () => {
    expect(toSolveError({ status: 400, code: "UNSOLVABLE" }).needsEdit).toBeUndefined();
    expect(toSolveError({ status: 500 }).needsEdit).toBeUndefined();
  });

  it("keeps the unsolvable copy for an UNSOLVABLE reply", () => {
    expect(toSolveError({ status: 400, code: "UNSOLVABLE" }).message).toBe(
      SOLVE_ERROR_COPY.unsolvable
    );
  });
});
