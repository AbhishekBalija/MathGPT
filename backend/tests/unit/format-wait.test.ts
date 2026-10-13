import { describe, expect, it } from "vitest";
import { formatWait } from "../../src/lib/format-wait";

describe("formatWait", () => {
  it("uses seconds when under a minute", () => {
    expect(formatWait(40)).toBe("Please wait 40 seconds");
  });

  it("uses about one minute at 60 seconds", () => {
    expect(formatWait(60)).toBe("Please wait about 1 minute and try again");
  });

  it("rounds long waits to plain minutes", () => {
    expect(formatWait(428)).toBe("Please wait about 7 minutes and try again");
  });

  it("handles one hour as minutes", () => {
    expect(formatWait(3600)).toBe("Please wait about 60 minutes and try again");
  });
});
