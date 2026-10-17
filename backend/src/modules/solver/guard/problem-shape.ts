/**
 * The Problem Shape: the text read once, so every Guard Rule can ask simple
 * questions ("only numbers?", "an empty side of =?") without parsing the
 * text again itself.
 */

export type TokenKind = "number" | "word" | "operator" | "equals" | "other";

export interface Token {
  kind: TokenKind;
  text: string;
}

export interface ProblemShape {
  // Trimmed and lower-cased, with spaces collapsed
  text: string;
  tokens: Token[];
  // The tokens on each side of any "=": "x + 1 = 5" has two sides
  sides: Token[][];
}

// A number like 887, 3.14 or 1,000
const NUMBER = /^\d+(?:[.,]\d+)*$/;

// Numbers, words, = and the usual operators each become one token
const TOKEN = /\d+(?:[.,]\d+)*|\p{L}+|=|[+\-*/×÷^]|\S/gu;

function kindOf(piece: string): TokenKind {
  if (NUMBER.test(piece)) return "number";
  if (piece === "=") return "equals";
  if (/^[+\-*/×÷^]$/.test(piece)) return "operator";
  if (/^\p{L}+$/u.test(piece)) return "word";
  return "other";
}

export function readShape(problem: string): ProblemShape {
  const text = problem
    .trim()
    .replace(/\s+/g, " ")
    // Curly quotes and the long minus signs phones type become plain ones
    .replace(/[‘’]/g, "'")
    .replace(/[−–—]/g, "-")
    .toLowerCase();
  const tokens = (text.match(TOKEN) ?? []).map((piece) => ({ kind: kindOf(piece), text: piece }));
  return { text, tokens, sides: splitAtEquals(tokens) };
}

function splitAtEquals(tokens: Token[]): Token[][] {
  const sides: Token[][] = [[]];
  for (const token of tokens) {
    if (token.kind === "equals") sides.push([]);
    else sides[sides.length - 1]?.push(token);
  }
  return sides;
}
