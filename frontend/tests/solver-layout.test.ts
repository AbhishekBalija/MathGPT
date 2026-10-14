import { describe, expect, it } from "vitest";
import { layoutLongDivision } from "../src/features/solver/layout/longDivision";
import {
  layoutColumnAddition,
  layoutColumnSubtraction,
} from "../src/features/solver/layout/columnArithmetic";

describe("layoutLongDivision", () => {
  it("156 ÷ 4: quotient over 5 and 6, 12 under 15, 36 under 56", () => {
    const l = layoutLongDivision(156, 4);
    expect(l.digits).toEqual(["1", "5", "6"]);
    expect(l.quotient).toEqual([null, "3", "9"]);
    expect(l.rows).toEqual([
      { value: "12", endColumn: 1, kind: "subtract" },
      { value: "36", endColumn: 2, kind: "bringDown" },
      { value: "36", endColumn: 2, kind: "subtract" },
      { value: "0", endColumn: 2, kind: "remainder" },
    ]);
    expect([l.quotientValue, l.remainder]).toEqual([39, 0]);
  });
  it("412 ÷ 4 keeps the zero in the quotient", () => {
    const l = layoutLongDivision(412, 4);
    expect(l.quotient).toEqual(["1", "0", "3"]);
    expect(l.quotientValue).toBe(103);
  });
  it("157 ÷ 4 leaves remainder 1", () => {
    expect(layoutLongDivision(157, 4)).toMatchObject({ quotientValue: 39, remainder: 1 });
  });
  it("1000 ÷ 8 = 125", () => {
    expect(layoutLongDivision(1000, 8).quotient).toEqual([null, "1", "2", "5"]);
  });
  it("3 ÷ 4 puts 0 over the last digit", () => {
    const l = layoutLongDivision(3, 4);
    expect(l.quotient).toEqual(["0"]);
    expect(l.remainder).toBe(3);
  });
  it("rejects bad input with RangeError", () => {
    expect(() => layoutLongDivision(-5, 2)).toThrow(RangeError);
    expect(() => layoutLongDivision(5.5, 2)).toThrow(RangeError);
    expect(() => layoutLongDivision(10, 0)).toThrow(RangeError);
    expect(() => layoutLongDivision(10, -2)).toThrow(RangeError);
  });
});

describe("column arithmetic", () => {
  it("47 + 38 carries 1 into the tens", () => {
    expect(layoutColumnAddition([47, 38])).toEqual({
      width: 2,
      carries: [1, null],
      rows: ["47", "38"],
      result: "85",
    });
  });
  it("95 + 38 grows a hundreds column", () => {
    expect(layoutColumnAddition([95, 38])).toEqual({
      width: 3,
      carries: [1, 1, null],
      rows: ["95", "38"],
      result: "133",
    });
  });
  it("52 − 17 borrows from the tens", () => {
    expect(layoutColumnSubtraction(52, 17)).toEqual({
      width: 2,
      borrows: [true, false],
      rows: ["52", "17"],
      result: "35",
    });
  });
  it("100 − 1 borrows through the zeros", () => {
    expect(layoutColumnSubtraction(100, 1)).toMatchObject({
      borrows: [true, true, false],
      result: "99",
    });
  });
  it("rejects bad input with RangeError", () => {
    expect(() => layoutColumnAddition([-1, 2])).toThrow(RangeError);
    expect(() => layoutColumnSubtraction(2.5, 1)).toThrow(RangeError);
    expect(() => layoutColumnSubtraction(3, 5)).toThrow(RangeError);
  });
});

describe("whole-number checks", () => {
  it("refuses numbers too big to write digit by digit", () => {
    // 1e21 is an "integer" to JavaScript, but its digits are not exact
    expect(() => layoutLongDivision(1e21, 4)).toThrow(RangeError);
    expect(() => layoutLongDivision(156, 1e21)).toThrow(RangeError);
    expect(() => layoutColumnAddition([1e21, 1])).toThrow(RangeError);
  });

  it("still lays out the largest safe numbers", () => {
    expect(() => layoutColumnAddition([Number.MAX_SAFE_INTEGER - 1, 1])).not.toThrow();
  });
});

// Rows worked out by hand, the way a student writes them
describe("long division rows", () => {
  it("157 ÷ 4: 12 under 15, bring down 37, 36 under it, remainder 1", () => {
    expect(layoutLongDivision(157, 4).rows).toEqual([
      { value: "12", endColumn: 1, kind: "subtract" },
      { value: "37", endColumn: 2, kind: "bringDown" },
      { value: "36", endColumn: 2, kind: "subtract" },
      { value: "1", endColumn: 2, kind: "remainder" },
    ]);
  });

  it("412 ÷ 4: the zero subtraction under 1 is its own row, apart from the final remainder", () => {
    expect(layoutLongDivision(412, 4).rows).toEqual([
      { value: "4", endColumn: 0, kind: "subtract" },
      { value: "1", endColumn: 1, kind: "bringDown" },
      // 4 goes into 1 zero times: subtract 0 under the 1
      { value: "0", endColumn: 1, kind: "subtract" },
      { value: "12", endColumn: 2, kind: "bringDown" },
      { value: "12", endColumn: 2, kind: "subtract" },
      { value: "0", endColumn: 2, kind: "remainder" },
    ]);
  });

  it("0 ÷ 7 is 0 remainder 0", () => {
    const l = layoutLongDivision(0, 7);
    expect(l.quotient).toEqual(["0"]);
    expect(l.rows).toEqual([
      { value: "0", endColumn: 0, kind: "subtract" },
      { value: "0", endColumn: 0, kind: "remainder" },
    ]);
  });
});

describe("column arithmetic with more numbers", () => {
  it("123 + 456 + 789 carries 1 into every column", () => {
    expect(layoutColumnAddition([123, 456, 789])).toEqual({
      width: 4,
      carries: [1, 1, 1, null],
      rows: ["123", "456", "789"],
      result: "1368",
    });
  });

  it("99 + 99 + 99 carries 2, not just 1", () => {
    expect(layoutColumnAddition([99, 99, 99])).toEqual({
      width: 3,
      carries: [2, 2, null],
      rows: ["99", "99", "99"],
      result: "297",
    });
  });

  it("302 − 18 borrows through the zero", () => {
    expect(layoutColumnSubtraction(302, 18)).toEqual({
      width: 3,
      borrows: [true, true, false],
      rows: ["302", "18"],
      result: "284",
    });
  });
});
