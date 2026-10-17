/**
 * The Problem Shape: the text read once, so every Guard Rule can ask simple
 * questions ("only numbers?", "an empty side of =?") without parsing the
 * text again itself.
 */

export type TokenKind = "number" | "word" | "emoji" | "operator" | "equals" | "other";

export interface Token {
  kind: TokenKind;
  text: string;
}

export interface ProblemShape {
  // Cleaned up (see clean below) and lower-cased
  text: string;
  tokens: Token[];
  // The tokens on each side of any "=": "x + 1 = 5" has two sides
  sides: Token[][];
}

// A number like 887, 3.14 or 1,000, in any script's digits ("೫", "५")
const NUMBER = /^\p{Nd}+(?:[.,]\p{Nd}+)*$/u;

// Letters plus the marks that join them, so Hindi and Kannada words stay whole
const WORD = /^[\p{L}\p{M}]+$/u;

const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier})$/u;

// Numbers, words, = and the usual operators each become one token; anything
// else (an emoji, a bracket, a symbol) is one token per character
const TOKEN = /\p{Nd}+(?:[.,]\p{Nd}+)*|[\p{L}\p{M}]+|=|[+\-*/×÷^]|\S/gu;

// Characters you can't see: zero-width spaces and joiners, the byte-order
// mark, and the emoji helpers that turn "8" into the keycap "8️⃣"
const INVISIBLE = /\u200b|\u200c|\u200d|\u2060|\ufeff|\ufe0f|\u20e3/g;

function clean(problem: string): string {
  return (
    problem
      // Full-width "８８７" becomes "887", "ﬁ" becomes "fi", "x²" becomes "x2"
      .normalize("NFKC")
      .replace(INVISIBLE, "")
      .trim()
      .replace(/\s+/g, " ")
      // Curly quotes and the long minus signs phones type become plain ones
      .replace(/[‘’]/g, "'")
      .replace(/[−–—]/g, "-")
      // The fraction slash in "½" after NFKC
      .replace(/⁄/g, "/")
      .toLowerCase()
  );
}

function kindOf(piece: string): TokenKind {
  if (NUMBER.test(piece)) return "number";
  if (piece === "=") return "equals";
  if (/^[+\-*/×÷^]$/.test(piece)) return "operator";
  if (WORD.test(piece)) return "word";
  if (EMOJI.test(piece)) return "emoji";
  return "other";
}

export function readShape(problem: string): ProblemShape {
  const text = clean(problem);
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
