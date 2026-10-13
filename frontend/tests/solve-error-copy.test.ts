import { describe, expect, it } from "vitest";
import { SOLVE_ERROR_COPY, toSolveError } from "../src/utils/errorMessages";

describe("toSolveError", () => {
  it("says the text is not math for a NOT_MATH reply", () => {
    expect(toSolveError({ status: 422, code: "NOT_MATH" }).message).toBe(SOLVE_ERROR_COPY.notMath);
  });

  it("keeps the unsolvable copy for an UNSOLVABLE reply", () => {
    expect(toSolveError({ status: 400, code: "UNSOLVABLE" }).message).toBe(
      SOLVE_ERROR_COPY.unsolvable
    );
  });
});
