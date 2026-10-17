import { describe, expect, it } from "vitest";
import { GUARD_REPLIES, SOLVE_ERROR_COPY, toSolveError } from "../src/utils/errorMessages";

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

  it("gives each Rejection Reason from the Problem Guard its own reply, with an edit", () => {
    for (const [reason, reply] of Object.entries(GUARD_REPLIES)) {
      // These two have their own tests below
      if (reason === "number" || reason === "wellbeing") continue;
      const error = toSolveError({ status: 422, code: "NOT_MATH", reason });
      expect(error.message).toBe(reply);
      expect(error.needsEdit).toBe(true);
    }
  });

  it("uses the student's own number in the reply for a lone number", () => {
    const error = toSolveError({ status: 422, code: "NOT_MATH", reason: "number" }, "887");
    expect(error.message).toBe("That's just a number. What should I do with it? Try \"is 887 prime\" or \"887 × 3\".");
  });

  it("points a student in distress to a free helpline", () => {
    const error = toSolveError({ status: 422, code: "NOT_MATH", reason: "wellbeing" });
    expect(error.message).toContain("14416");
    expect(error.helpline).toEqual({ name: "Tele-MANAS", phone: "14416" });
    expect(error.needsEdit).toBeUndefined();
  });

  it("falls back to the general not-math line for a reason it does not know", () => {
    const error = toSolveError({ status: 422, code: "NOT_MATH", reason: "something_new" });
    expect(error.message).toBe(SOLVE_ERROR_COPY.notMath);
  });
});
