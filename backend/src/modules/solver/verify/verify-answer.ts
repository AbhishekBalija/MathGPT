/**
 * Checks an AI answer with code, so only a confirmed answer is ever shared
 * between students (see the shared solution cache).
 *
 * - Polynomial equation in one variable: put each root back in, both sides
 *   must match, and there must be as many different roots as the degree (so
 *   an answer with a root missing is never "passed").
 * - Plain arithmetic: work it out again.
 * - Derivative: differentiate the problem and compare with the answer at 12
 *   random points.
 * - Indefinite integral: differentiate the answer and compare with the
 *   integrand the same way (so the "+ C" does not matter).
 * - Definite integral: work it out with adaptive Simpson's rule.
 * Anything else is "unchecked".
 *
 * Safety: the answer comes from the AI, so it is untrusted. mathjs only
 * parses text into a tree (never `eval`, never `mathjs.evaluate` on a
 * string). A tree is refused if it is too big, too deep, or has any node,
 * name or function outside a short allowlist. Only then is it compiled and
 * run, with a scope that holds just the one variable.
 */

import { derivative, isConstantNode, isFunctionNode, isOperatorNode, isParenthesisNode, isSymbolNode, parse } from "mathjs";
import type { MathNode } from "mathjs";
import type { SolutionV2Content } from "../../solutions/solution-v2.schema";

export type VerifyResult = "passed" | "failed" | "unchecked";
export type CheckKind = "equation" | "arithmetic" | "derivative" | "indefinite-integral" | "definite-integral";

// What a check found, and which kind of problem it was
interface Verdict {
  result: VerifyResult;
  kind?: CheckKind;
}

const MAX_NODES = 200;
const MAX_DEPTH = 30;
const MAX_TEXT_LENGTH = 1000;

const RANDOM_POINTS = 12;
const MIN_FINITE_POINTS = 10;
// Random points are drawn from here, which suits log and sqrt as well
const POINT_RANGE = { from: 0.2, to: 3.2 };

const EQUATION_TOLERANCE = 1e-9;
const COMPARE_TOLERANCE = 1e-6;
const SIMPSON_TOLERANCE = 1e-9;
const SIMPSON_MAX_EVALUATIONS = 10_000;

const ALLOWED_FUNCTIONS = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh",
  "exp", "log", "sqrt", "abs",
]);
const ALLOWED_OPERATORS = new Set(["add", "subtract", "multiply", "divide", "pow", "unaryMinus", "unaryPlus"]);
const CONSTANTS = new Set(["pi", "e"]);

// Longest names first, so "sinh" is not read as "sin" + "h"
const FUNCTION_NAMES = "sinh|cosh|tanh|asin|acos|atan|sin|cos|tan|exp|sqrt|log|ln|abs";

// Thrown when the text is not something we can check. Always means "unchecked".
class CannotCheck extends Error {}

// ---------------------------------------------------------------------------
// Turning text into something mathjs can parse
// ---------------------------------------------------------------------------

// Replaces `\command{a}{b}` with `build(a, b)`, matching nested braces
function replaceCommand(text: string, command: string, argCount: number, build: (...args: string[]) => string): string {
  let result = text;
  let start = result.indexOf(command + "{");
  while (start !== -1) {
    let position = start + command.length;
    const args: string[] = [];
    for (let i = 0; i < argCount; i++) {
      if (result[position] !== "{") throw new CannotCheck();
      let depth = 0;
      let end = position;
      for (; end < result.length; end++) {
        if (result[end] === "{") depth++;
        if (result[end] === "}") depth--;
        if (depth === 0) break;
      }
      if (depth !== 0) throw new CannotCheck();
      args.push(result.slice(position + 1, end));
      position = end + 1;
    }
    result = result.slice(0, start) + build(...args) + result.slice(position);
    start = result.indexOf(command + "{");
  }
  return result;
}

// Turns "log abs(...)" into "log(abs(...))", matching nested brackets
function wrapNestedCalls(text: string): string {
  const pattern = new RegExp(`\\b(${FUNCTION_NAMES})\\s+(?=(?:${FUNCTION_NAMES})\\()`, "i");
  let result = text;
  let match = pattern.exec(result);
  while (match) {
    const argumentStart = match.index + match[0].length;
    const open = result.indexOf("(", argumentStart);
    let depth = 0;
    let close = open;
    for (; close < result.length; close++) {
      if (result[close] === "(") depth++;
      if (result[close] === ")") depth--;
      if (depth === 0) break;
    }
    if (depth !== 0) throw new CannotCheck();
    const name = match[1] as string;
    result = `${result.slice(0, match.index)}${name}(${result.slice(argumentStart, close + 1)})${result.slice(close + 1)}`;
    match = pattern.exec(result);
  }
  return result;
}

/** LaTeX from the AI, or the student's typed text, as plain math text. */
function toMathText(input: string): string {
  if (input.length > MAX_TEXT_LENGTH) throw new CannotCheck();
  // "±" means two answers in one; too easy to read wrongly, so we skip it
  if (/\\pm|±|\\mp|∓/.test(input)) throw new CannotCheck();

  let text = input
    .replace(/\\left|\\right|\\displaystyle/g, "")
    .replace(/\\[,;:! ]|\\quad|\\qquad/g, " ")
    .replace(/\\text\{([^}]*)\}|\\mathrm\{([^}]*)\}/g, " $1$2 ")
    .replace(/\\in\b/g, "=")
    .replace(/\\\{|\\\}/g, " ");

  for (const command of ["\\frac", "\\dfrac", "\\tfrac"]) {
    text = replaceCommand(text, command, 2, (top, bottom) => `((${top})/(${bottom}))`);
  }
  text = text.replace(/\\sqrt\[([^\]]+)\]\{/g, "\\nthroot{$1}{");
  text = replaceCommand(text, "\\nthroot", 2, (n, value) => `((${value})^(1/(${n})))`);
  text = replaceCommand(text, "\\sqrt", 1, (value) => `sqrt(${value})`);

  text = text
    .replace(/\\(cdot|times)/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\pi\b/g, "pi")
    .replace(/\\ln\b/g, "log")
    .replace(new RegExp(`\\\\(${FUNCTION_NAMES})\\b`, "g"), "$1")
    .replace(/[{]/g, "(")
    .replace(/[}]/g, ")")
    .replace(/[−–]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/π/g, "pi")
    .replace(/√\(/g, "sqrt(")
    .replace(/√([0-9]*[a-z0-9.]+)/gi, "sqrt($1)")
    .replace(/\|([^|]+)\|/g, "abs($1)")
    .replace(/\bln\b/g, "log");

  // "logx" or "sin2x" as students type them: split the name from what follows
  text = text.replace(new RegExp(`\\b(${FUNCTION_NAMES})(?=[a-z0-9])`, "gi"), "$1 ");
  // "sin^2(2x+5)" means (sin(2x+5))^2
  text = text.replace(
    new RegExp(`\\b(${FUNCTION_NAMES})\\s*\\^\\s*\\(?(\\d+)\\)?\\s*(\\((?:[^()]|\\([^()]*\\))*\\)|[0-9]*[a-z])`, "gi"),
    "($1($3))^($2)"
  );
  // "log abs(...)" or "sin sqrt(...)": the second call is the argument
  text = wrapNestedCalls(text);
  // "sin x" or "log 2x" with no brackets
  text = text.replace(new RegExp(`\\b(${FUNCTION_NAMES})\\s+([0-9]*[a-z](?![a-z(])|[0-9.]+)`, "gi"), "$1($2)");
  // "x(x - 1)" is a product, not a function called x
  text = text.replace(/(?<![a-z])([a-z])\s*\(/gi, "$1*(");

  if (text.includes("\\")) throw new CannotCheck(); // LaTeX we do not understand
  return text.trim();
}

// ---------------------------------------------------------------------------
// Safe parsing
// ---------------------------------------------------------------------------

function parseText(text: string): MathNode {
  try {
    return parse(text);
  } catch {
    throw new CannotCheck();
  }
}

// The names used in a tree, leaving out function names and pi / e
function freeSymbols(node: MathNode, found = new Set<string>()): Set<string> {
  if (isSymbolNode(node)) {
    if (!CONSTANTS.has(node.name)) found.add(node.name);
  } else if (isFunctionNode(node)) {
    for (const arg of node.args) freeSymbols(arg, found);
  } else {
    node.forEach((child) => freeSymbols(child, found));
  }
  return found;
}

// Throws unless every node is on the allowlist, within the size and depth caps
function assertSafe(root: MathNode, variable: string | undefined): void {
  let count = 0;
  const visit = (node: MathNode, depth: number): void => {
    count++;
    if (count > MAX_NODES || depth > MAX_DEPTH) throw new CannotCheck();

    if (isConstantNode(node)) {
      if (typeof node.value !== "number" || !Number.isFinite(node.value)) throw new CannotCheck();
    } else if (isSymbolNode(node)) {
      if (!CONSTANTS.has(node.name) && node.name !== variable) throw new CannotCheck();
    } else if (isOperatorNode(node)) {
      if (!ALLOWED_OPERATORS.has(node.fn)) throw new CannotCheck();
      for (const arg of node.args) visit(arg, depth + 1);
    } else if (isParenthesisNode(node)) {
      visit(node.content, depth + 1);
    } else if (isFunctionNode(node)) {
      if (!isSymbolNode(node.fn) || !ALLOWED_FUNCTIONS.has(node.fn.name)) throw new CannotCheck();
      for (const arg of node.args) visit(arg, depth + 1);
    } else {
      throw new CannotCheck();
    }
  };
  visit(root, 0);
}

/** Parses and checks one expression. */
function safeExpression(text: string, variable: string | undefined): MathNode {
  const node = parseText(toMathText(text));
  assertSafe(node, variable);
  return node;
}

// A function of the variable, or null at points where it is not a real number
function compileFunction(node: MathNode, variable: string | undefined): (value: number) => number | null {
  const compiled = node.compile();
  return (value) => {
    try {
      const scope = variable ? { [variable]: value } : {};
      const result: unknown = compiled.evaluate(scope);
      return typeof result === "number" && Number.isFinite(result) ? result : null;
    } catch {
      return null;
    }
  };
}

function constantValue(node: MathNode): number {
  const value = compileFunction(node, undefined)(0);
  if (value === null) throw new CannotCheck();
  return value;
}

// ---------------------------------------------------------------------------
// Comparing
// ---------------------------------------------------------------------------

function close(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
}

// Fresh random points every time, so no fixed set of points can be gamed
function compareAtRandomPoints(
  expected: (value: number) => number | null,
  actual: (value: number) => number | null
): VerifyResult {
  let finite = 0;
  let allAgree = true;
  for (let i = 0; i < RANDOM_POINTS; i++) {
    const point = POINT_RANGE.from + Math.random() * (POINT_RANGE.to - POINT_RANGE.from);
    const a = expected(point);
    const b = actual(point);
    if (a === null || b === null) continue;
    finite++;
    if (!close(a, b, COMPARE_TOLERANCE)) allAgree = false;
  }
  if (finite < MIN_FINITE_POINTS) return "unchecked";
  return allAgree ? "passed" : "failed";
}

// Adaptive Simpson's rule, giving up past a fixed number of evaluations
function integrate(f: (value: number) => number | null, from: number, to: number): number {
  let evaluations = 0;
  const at = (x: number): number => {
    evaluations++;
    if (evaluations > SIMPSON_MAX_EVALUATIONS) throw new CannotCheck();
    const y = f(x);
    if (y === null) throw new CannotCheck();
    return y;
  };
  const simpson = (a: number, b: number, fa: number, fm: number, fb: number) => ((b - a) / 6) * (fa + 4 * fm + fb);
  const refine = (a: number, b: number, fa: number, fm: number, fb: number, whole: number, tolerance: number): number => {
    const m = (a + b) / 2;
    const flm = at((a + m) / 2);
    const frm = at((m + b) / 2);
    const left = simpson(a, m, fa, flm, fm);
    const right = simpson(m, b, fm, frm, fb);
    if (Math.abs(left + right - whole) <= 15 * tolerance) {
      return left + right + (left + right - whole) / 15;
    }
    return refine(a, m, fa, flm, fm, left, tolerance / 2) + refine(m, b, fm, frm, fb, right, tolerance / 2);
  };
  const fa = at(from);
  const fb = at(to);
  const fm = at((from + to) / 2);
  return refine(from, to, fa, fm, fb, simpson(from, to, fa, fm, fb), SIMPSON_TOLERANCE);
}

// ---------------------------------------------------------------------------
// Reading the problem and the answer
// ---------------------------------------------------------------------------

// The only variable in a problem expression, or undefined for plain numbers
function onlyVariable(text: string): string | undefined {
  const symbols = [...freeSymbols(parseText(toMathText(text)))];
  if (symbols.length > 1) throw new CannotCheck();
  const variable = symbols[0];
  if (variable !== undefined && !/^[a-z]$/i.test(variable)) throw new CannotCheck();
  return variable;
}

function answerText(content: SolutionV2Content): string {
  const answer = content.answer.latex ?? content.answer.text;
  if (!answer) throw new CannotCheck();
  return answer;
}

// The part after the last "=", e.g. "f'(x) = cos x" gives "cos x"
function afterLastEquals(text: string): string {
  const index = text.lastIndexOf("=");
  return index === -1 ? text : text.slice(index + 1);
}

// "+ C" (the constant of integration) at the end of an antiderivative
function withoutConstant(text: string): string {
  return text.replace(/\+\s*(?:\\text\{)?[Cc]\}?\s*$/, "");
}

// Roots written as "x = -2 or x = -3", "x = 1, x = -1" or "x \in \{-2, -3\}"
// The pieces of a root list, each with the variable it names (if any)
function rootPieces(answer: string): { variable: string | undefined; value: string }[] {
  const pieces = answer
    .replace(/\\text\{([^}]*)\}/g, " $1 ")
    .split(/\s+or\s+|\s+and\s+|,|;/i)
    .map((piece) => {
      const named = piece.match(/^\s*([a-z])\s*(?:=|\\in)\s*(.*)$/i);
      return named ? { variable: named[1], value: (named[2] ?? "").trim() } : { variable: undefined, value: piece.trim() };
    })
    .filter((piece) => piece.value.length > 0);
  if (pieces.length === 0) throw new CannotCheck();
  return pieces;
}

// The variables a root list names: "x = 2, y = 1" gives ["x", "y"]
function rootVariables(answer: string): string[] {
  return [...new Set(rootPieces(answer).flatMap((piece) => (piece.variable ? [piece.variable] : [])))];
}

/**
 * Roots written as "x = -2 or x = -3", "x = 1, x = -1" or "x \\in \\{-2, -3\\}".
 * With `variable`, a root named after any other letter cannot be checked
 * ("y = 2" is no answer to 2x = 4).
 */
function readRoots(answer: string, variable?: string): number[] {
  const pieces = rootPieces(answer);
  if (variable && pieces.some((piece) => piece.variable !== undefined && piece.variable !== variable)) {
    throw new CannotCheck();
  }
  return pieces.map((piece) => constantValue(safeExpression(piece.value, undefined)));
}

// ---------------------------------------------------------------------------
// The checks, one per kind of problem
// ---------------------------------------------------------------------------

// Above this degree we do not check: no school answer lists that many roots
const MAX_DEGREE = 12;

// A polynomial as its coefficients, lowest power first: [6, 5, 1] is x^2 + 5x + 6
type Polynomial = number[];

function addPolynomials(a: Polynomial, b: Polynomial, sign: 1 | -1): Polynomial {
  const sum: Polynomial = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    sum.push((a[i] ?? 0) + sign * (b[i] ?? 0));
  }
  return sum;
}

function multiplyPolynomials(a: Polynomial, b: Polynomial): Polynomial {
  if (a.length + b.length - 2 > MAX_DEGREE) throw new CannotCheck();
  const product: Polynomial = new Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (product[i + j] += x * y)));
  return product;
}

// Drops top coefficients that came out as (almost) zero, so x^2 - x^2 + x has degree 1
function trimPolynomial(p: Polynomial): Polynomial {
  const scale = Math.max(1, ...p.map(Math.abs));
  let end = p.length;
  while (end > 1 && Math.abs(p[end - 1] as number) <= EQUATION_TOLERANCE * scale) end--;
  return p.slice(0, end);
}

// Turns a tree into coefficients, with plain arithmetic on small lists.
// We used mathjs rationalize here before, but it took over 15 seconds on
// (x+1)^5 and blocked the whole server. Anything that is not a polynomial
// in `variable` (sin x, 1/x, x^0.5) cannot be checked.
function toPolynomial(node: MathNode, variable: string): Polynomial {
  if (isParenthesisNode(node)) return toPolynomial(node.content, variable);
  if (isSymbolNode(node) && node.name === variable) return [0, 1];

  // No variable inside (5, pi, sqrt(2)): just a number
  if (!freeSymbols(node).has(variable)) {
    const value = compileFunction(node, undefined)(0);
    if (value === null) throw new CannotCheck();
    return [value];
  }

  if (isOperatorNode(node)) {
    const [a, b] = node.args;
    if (node.fn === "unaryPlus" && a) return toPolynomial(a, variable);
    if (node.fn === "unaryMinus" && a) return toPolynomial(a, variable).map((c) => -c);
    if (a && b) {
      if (node.fn === "add") return addPolynomials(toPolynomial(a, variable), toPolynomial(b, variable), 1);
      if (node.fn === "subtract") return addPolynomials(toPolynomial(a, variable), toPolynomial(b, variable), -1);
      if (node.fn === "multiply") {
        return trimPolynomial(multiplyPolynomials(toPolynomial(a, variable), toPolynomial(b, variable)));
      }
      if (node.fn === "divide" && !freeSymbols(b).has(variable)) {
        const divisor = toPolynomial(b, variable)[0] as number;
        if (divisor === 0) throw new CannotCheck();
        return toPolynomial(a, variable).map((c) => c / divisor);
      }
      if (node.fn === "pow" && !freeSymbols(b).has(variable)) {
        const power = toPolynomial(b, variable)[0] as number;
        if (!Number.isInteger(power) || power < 0 || power > MAX_DEGREE) throw new CannotCheck();
        const base = trimPolynomial(toPolynomial(a, variable));
        let result: Polynomial = [1];
        for (let i = 0; i < power; i++) result = trimPolynomial(multiplyPolynomials(result, base));
        return result;
      }
    }
  }
  throw new CannotCheck();
}

// The degree of a polynomial. Anything else (sin x, 1/x, no variable) cannot
// be checked, because we could not tell whether a root is missing.
function polynomialDegree(node: MathNode, variable: string): number {
  const coefficients = trimPolynomial(toPolynomial(node, variable));
  if (coefficients.length < 2) throw new CannotCheck();
  return coefficients.length - 1;
}

// Roots that are the same number count once
function distinctRoots(roots: number[]): number[] {
  return roots.filter((root, index) => roots.findIndex((other) => close(root, other, EQUATION_TOLERANCE)) === index);
}

function checkEquation(equation: string, content: SolutionV2Content): VerifyResult {
  const sides = equation.split("=");
  if (sides.length !== 2) throw new CannotCheck();
  const [left, right] = sides as [string, string];
  const variable = onlyVariable(`(${left}) - (${right})`);
  if (!variable) throw new CannotCheck();

  const degree = polynomialDegree(safeExpression(`(${left}) - (${right})`, variable), variable);
  const roots = distinctRoots(readRoots(answerText(content), variable));

  const leftValue = compileFunction(safeExpression(left, variable), variable);
  const rightValue = compileFunction(safeExpression(right, variable), variable);
  for (const root of roots) {
    const l = leftValue(root);
    const r = rightValue(root);
    if (l === null || r === null) throw new CannotCheck();
    if (!close(l, r, EQUATION_TOLERANCE)) return "failed";
  }
  // Every listed root works. Fewer roots than the degree means one may be
  // missing (or repeated, or not real), so we do not call it checked.
  return roots.length >= degree ? "passed" : "unchecked";
}

// In school problems "sin 30" means degrees and "log 100" means base 10, but
// mathjs reads radians and the natural log, so these are not checked
const SCHOOL_MEANING_DIFFERS = /\b(a?(sin|cos|tan)h?|sec|csc|cot|log|ln)\b/i;

function checkArithmetic(expression: string, content: SolutionV2Content): VerifyResult {
  if (SCHOOL_MEANING_DIFFERS.test(expression)) throw new CannotCheck();
  const expected = constantValue(safeExpression(expression, undefined));
  const given = constantValue(safeExpression(afterLastEquals(answerText(content)), undefined));
  return close(expected, given, COMPARE_TOLERANCE) ? "passed" : "failed";
}

function checkDerivative(expression: string, variable: string | undefined, content: SolutionV2Content): VerifyResult {
  const name = variable ?? onlyVariable(expression);
  if (!name) throw new CannotCheck();
  const problem = safeExpression(expression, name);
  const answer = safeExpression(afterLastEquals(answerText(content)), name);
  let expected: MathNode;
  try {
    expected = derivative(problem, name);
  } catch {
    throw new CannotCheck();
  }
  return compareAtRandomPoints(compileFunction(expected, name), compileFunction(answer, name));
}

function checkIndefiniteIntegral(integrand: string, content: SolutionV2Content): VerifyResult {
  const name = onlyVariable(integrand);
  if (!name) throw new CannotCheck();
  const problem = safeExpression(integrand, name);
  const answer = safeExpression(withoutConstant(afterLastEquals(answerText(content))), name);
  let answerDerivative: MathNode;
  try {
    answerDerivative = derivative(answer, name);
  } catch {
    throw new CannotCheck();
  }
  return compareAtRandomPoints(compileFunction(problem, name), compileFunction(answerDerivative, name));
}

function checkDefiniteIntegral(integrand: string, from: string, to: string, content: SolutionV2Content): VerifyResult {
  const name = onlyVariable(integrand);
  const problem = safeExpression(integrand, name);
  const value = integrate(
    compileFunction(problem, name),
    constantValue(safeExpression(from, undefined)),
    constantValue(safeExpression(to, undefined))
  );
  const given = constantValue(safeExpression(afterLastEquals(answerText(content)), undefined));
  return close(value, given, COMPARE_TOLERANCE) ? "passed" : "failed";
}

// Lower case, without a trailing "?" or "." or "with respect to x"
function tidyProblem(problem: string): string {
  return problem
    .trim()
    .toLowerCase()
    .replace(/[?.]+$/, "")
    .replace(/\s*(?:with respect to|w\.?r\.?t\.?)\s*[a-z]\s*$/, "")
    .trim();
}

const INTEGRAL_START = /^(?:∫|integrate|find the integral of|integral of|evaluate the integral|antiderivative of)\s*/;
const DERIVATIVE_START = /^(?:d\/d([a-z])|differentiate|find the derivative of|derivative of)\s*(?:of\s+)?/;
const FUNCTION_PREFIX = /^(?:y|f\s*\(\s*[a-z]\s*\))\s*=\s*/;
const SOLVE_START = /^(?:solve(?:\s+for\s+[a-z])?|find\s+[a-z](?:\s+if)?)\s*:?\s*/;
const ARITHMETIC_START = /^(?:what is|calculate|compute|evaluate|simplify|find(?: the value of)?)\s*:?\s*/;

function check(problem: string, content: SolutionV2Content): Verdict {
  const text = tidyProblem(problem);
  if (/[<>≤≥]/.test(text)) return { result: "unchecked" }; // inequalities are not checked

  const integral = text.match(INTEGRAL_START);
  if (integral || text.includes("∫")) {
    const body = text.replace(INTEGRAL_START, "").replace(/∫/g, "").trim();
    const bounds = body.match(/^(.+?)\s*(?:d[a-z])?\s+from\s+(\S+)\s+to\s+(\S+)$/);
    if (bounds) {
      return {
        result: checkDefiniteIntegral(bounds[1] as string, bounds[2] as string, bounds[3] as string, content),
        kind: "definite-integral",
      };
    }
    return { result: checkIndefiniteIntegral(body.replace(/\s*d\s?[a-z]$/, ""), content), kind: "indefinite-integral" };
  }

  const derivativeMatch = text.match(DERIVATIVE_START);
  if (derivativeMatch) {
    const body = text.replace(DERIVATIVE_START, "").replace(FUNCTION_PREFIX, "");
    return { result: checkDerivative(body, derivativeMatch[1], content), kind: "derivative" };
  }

  if (text.includes("=")) {
    return { result: checkEquation(text.replace(SOLVE_START, ""), content), kind: "equation" };
  }

  const expression = text.replace(ARITHMETIC_START, "");
  if (onlyVariable(expression) === undefined) {
    return { result: checkArithmetic(expression, content), kind: "arithmetic" };
  }
  return { result: "unchecked" }; // an expression with no task
}

// ---------------------------------------------------------------------------
// Comparing two answers (for the second-model check)
// ---------------------------------------------------------------------------

// "x = -2 or x = -3" style: a list of roots
const ROOT_LIST = /^\s*[a-z]\s*(?:=|\\in)/i;

function sameRoots(a: string, b: string): boolean {
  const sort = (roots: number[]) => distinctRoots(roots).sort((x, y) => x - y);
  const first = sort(readRoots(a));
  const second = sort(readRoots(b));
  return first.length === second.length && first.every((root, i) => close(root, second[i] as number, COMPARE_TOLERANCE));
}

function sameExpression(a: string, b: string): boolean {
  const left = withoutConstant(afterLastEquals(a));
  const right = withoutConstant(afterLastEquals(b));
  const symbols = new Set([...freeSymbols(parseText(toMathText(left))), ...freeSymbols(parseText(toMathText(right)))]);
  if (symbols.size > 1) throw new CannotCheck();
  const [variable] = [...symbols];
  const first = compileFunction(safeExpression(left, variable), variable);
  const second = compileFunction(safeExpression(right, variable), variable);
  if (!variable) {
    const x = first(0);
    const y = second(0);
    if (x === null || y === null) throw new CannotCheck();
    return close(x, y, COMPARE_TOLERANCE);
  }
  return compareAtRandomPoints(first, second) === "passed";
}

/**
 * True when two final answers have the same value: the same roots, the same
 * number, or the same expression at random points. False when they differ
 * or when either cannot be read, so a doubt never counts as a match.
 */
export function sameAnswerValue(a: string, b: string): boolean {
  try {
    if (ROOT_LIST.test(a) || ROOT_LIST.test(b)) {
      // Only one shared variable can be compared as numbers. "x = 2, y = 1"
      // and "x = 1, y = 2" have the same numbers but are different answers.
      const [first, second] = [rootVariables(a), rootVariables(b)];
      if (first.length !== 1 || second.length !== 1 || first[0] !== second[0]) return false;
      return sameRoots(a, b);
    }
    return sameExpression(a, b);
  } catch {
    return false;
  }
}

/**
 * Like verifyAnswer, and also says which kind of check ran, for the label
 * shown to the student.
 */
export function verifyAnswerWithKind(problem: string, content: SolutionV2Content): Verdict {
  try {
    return check(problem, content);
  } catch {
    // CannotCheck, or mathjs failing on odd input: either way, not checked
    return { result: "unchecked" };
  }
}

/**
 * "passed" when code confirms the answer, "failed" when code shows it is
 * wrong, and "unchecked" for anything we cannot check safely.
 */
export function verifyAnswer(problem: string, content: SolutionV2Content): VerifyResult {
  return verifyAnswerWithKind(problem, content).result;
}
