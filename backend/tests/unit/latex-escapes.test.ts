import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseModelJson } from "../../src/services/ai/generate-solution";

// A real Gemini reply (JSON mode) for "Prove that the angles opposite to equal
// sides of a triangle are equal": it wrote \angle, \triangle and \cong with
// one backslash each, so JSON.parse failed (and \t would have become a tab)
const recorded = readFileSync(new URL("../fixtures/gemini-proof-unescaped-latex.json.txt", import.meta.url), "utf8");

// Every string inside a parsed value, to look for corruption
function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

describe("parseModelJson and LaTeX backslashes", () => {
  it("reads the recorded Gemini proof reply", () => {
    expect(() => JSON.parse(recorded)).toThrow();
    const strings = allStrings(parseModelJson(recorded)).join(" ");
    expect(strings).toContain("\\angle A");
    expect(strings).toContain("\\triangle ABD");
    expect(strings).toContain("\\cong");
    // No tab, form feed or other control character slipped in (newlines are fine)
    const controls = [...strings].filter((ch) => ch.charCodeAt(0) < 32 && ch !== "\n");
    expect(controls).toEqual([]);
  });

  it("keeps commands that look like JSON escapes as LaTeX", () => {
    // \frac, \times, \neq, \right and \beta start like \f, \t, \n, \r and \b
    const reply = '{"latex": "\\frac{1}{2} \\times 3 \\neq \\left( \\beta \\right)"}';
    expect(parseModelJson(reply)).toEqual({ latex: "\\frac{1}{2} \\times 3 \\neq \\left( \\beta \\right)" });
  });

  it("leaves correctly escaped LaTeX and real newlines alone", () => {
    const reply = JSON.stringify({ latex: "\\frac{1}{2}", why: "First line.\nTherefore x = 2." });
    expect(parseModelJson(reply)).toEqual({ latex: "\\frac{1}{2}", why: "First line.\nTherefore x = 2." });
  });

  it("keeps real unicode escapes", () => {
    expect(parseModelJson('{"text": "\\u00b0 and \\uparrow"}')).toEqual({ text: "° and \\uparrow" });
  });
});
