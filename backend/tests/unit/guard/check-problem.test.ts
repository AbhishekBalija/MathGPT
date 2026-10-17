import { describe, expect, it } from "vitest";
import { checkProblem } from "../../../src/modules/solver/guard/check-problem";
import { MUST_BLOCK, MUST_PASS } from "./guard-cases";

const blockedRows = Object.entries(MUST_BLOCK).flatMap(([reason, texts]) =>
  texts.map((text) => [text, reason] as const)
);

describe("checkProblem", () => {
  it.each(blockedRows)("turns away %j as %s", (text, reason) => {
    expect(checkProblem(text)).toEqual({ ok: false, reason });
  });

  it.each(MUST_PASS)("lets %j through", (text) => {
    expect(checkProblem(text)).toEqual({ ok: true });
  });
});
