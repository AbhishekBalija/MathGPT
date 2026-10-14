/**
 * Instant answers for plain arithmetic like "47 + 38" or "Divide 156 by 4".
 * No AI and no daily credit are needed, so the answer comes back at once.
 *
 * How it works: the text is cleaned up, mathjs only parses it into a tree
 * (we never let mathjs calculate), and we walk the tree ourselves with exact
 * fractions. Each operator becomes one step, in BODMAS order.
 */

import { all, create, isConstantNode, isOperatorNode, isParenthesisNode } from "mathjs";
import type { Fraction, MathNode } from "mathjs";
import type { SolutionV2Content } from "../../solutions/solution-v2.schema";
import { UnsolvableProblemError } from "../../../services/ai/solver-errors";

type Step = SolutionV2Content["steps"][number];
type Operator = "+" | "-" | "*" | "/";

const MAX_PROBLEM_LENGTH = 200;
const MAX_DIGITS_PER_NUMBER = 12;
const MAX_STEPS = 30;

// Constants in the parsed tree become exact fractions, so 0.1 + 0.2 is 0.3
const math = create(all, { number: "Fraction" });

// Thrown inside the walk when the problem is not something we handle
class NotArithmeticError extends Error {}

// What a finished walk gives back
interface Walk {
  steps: Step[];
  value: Fraction;
}

const NUMBER = "\\d+(?:\\.\\d+)?";

// Turns the spoken forms and symbols into plain "1 + 2 * 3 / 4" text
function normalise(problem: string): string {
  return problem
    .trim()
    .replace(new RegExp(`divide\\s+(${NUMBER})\\s+by\\s+(${NUMBER})`, "gi"), "$1 / $2")
    .replace(new RegExp(`add\\s+(${NUMBER})\\s+and\\s+(${NUMBER})`, "gi"), "$1 + $2")
    .replace(new RegExp(`(${NUMBER})\\s+plus\\s+(${NUMBER})`, "gi"), "$1 + $2")
    .replace(new RegExp(`(${NUMBER})\\s+minus\\s+(${NUMBER})`, "gi"), "$1 - $2")
    .replace(new RegExp(`(${NUMBER})\\s+times\\s+(${NUMBER})`, "gi"), "$1 * $2")
    // A letter x counts as "times" only between two numbers or brackets
    .replace(/([\d)])\s*x\s*([\d(])/gi, "$1 * $2")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-");
}

// Only digits, dots, spaces, brackets and + - * / may be left, numbers up to 12 digits
function looksLikeArithmetic(text: string): boolean {
  if (!/^[\d\s.+\-*/()]+$/.test(text)) return false;
  const numbers = text.match(/[\d.]+/g) ?? [];
  return numbers.every(
    (token) => /^\d+(\.\d+)?$/.test(token) && token.replace(".", "").length <= MAX_DIGITS_PER_NUMBER,
  );
}

// "-2" stays as is, but a negative number inside a sum is shown as (-2)
function show(value: Fraction): string {
  const text = value.toString();
  // A "(" means the decimal repeats forever, like 0.(3)
  if (text.includes("(")) throw new NotArithmeticError();
  return text;
}

function showInside(value: Fraction): string {
  const text = show(value);
  return text.startsWith("-") ? `(${text})` : text;
}

function isWholeNumber(value: Fraction): boolean {
  return Number(value.d) === 1;
}

function isPlainInteger(value: Fraction): boolean {
  return isWholeNumber(value) && Number(value.s) >= 0 && Number.isSafeInteger(Number(value.n));
}

const SYMBOLS: Record<Operator, { latex: string; verb: (a: string, b: string) => string; why: string }> = {
  "+": { latex: "+", verb: (a, b) => `Add ${a} and ${b}`, why: "Adding puts the two amounts together." },
  "-": {
    latex: "-",
    verb: (a, b) => `Subtract ${b} from ${a}`,
    why: "Subtracting takes the second amount away from the first.",
  },
  "*": {
    latex: "\\times",
    verb: (a, b) => `Multiply ${a} by ${b}`,
    why: "Multiplying is repeated adding.",
  },
  "/": {
    latex: "\\div",
    verb: (a, b) => `Divide ${a} by ${b}`,
    why: "Dividing shares the first amount into equal groups of the second.",
  },
};

// Picks the nicest block for one operation: columns (both numbers 2+ digits),
// long division or an equation
function makeBlock(op: Operator, a: Fraction, b: Fraction, result: Fraction): Step["block"] {
  const bothPlain = isPlainInteger(a) && isPlainInteger(b);
  const x = Number(a.n);
  const y = Number(b.n);

  if (bothPlain && (op === "+" || op === "-") && Math.min(x, y) >= 10) {
    if (op === "+") return { type: "columnArithmetic", op: "+", operands: [x, y] };
    if (x >= y) return { type: "columnArithmetic", op: "-", operands: [x, y] };
  }
  if (bothPlain && op === "/" && x >= 10 && y <= 99) {
    return { type: "longDivision", dividend: x, divisor: y };
  }
  const latex = `${showInside(a)} ${SYMBOLS[op].latex} ${showInside(b)} = ${show(result)}`;
  return { type: "equation", latex };
}

// Does one operation, one step each, working through the tree bottom-up
function walk(node: MathNode, steps: Step[]): Fraction {
  if (isConstantNode(node)) {
    return math.fraction(node.value);
  }
  if (isParenthesisNode(node)) {
    return walk(node.content, steps);
  }
  if (!isOperatorNode(node) || node.implicit) {
    throw new NotArithmeticError();
  }

  // A minus sign in front of something, like -(2 + 3), flips its sign
  if (node.fn === "unaryMinus" && node.args.length === 1) {
    return walk(node.args[0], steps).neg();
  }

  const op = node.op;
  if (node.args.length !== 2 || (op !== "+" && op !== "-" && op !== "*" && op !== "/")) {
    throw new NotArithmeticError();
  }
  const left = walk(node.args[0], steps);
  const right = walk(node.args[1], steps);

  let result: Fraction;
  if (op === "+") result = left.add(right);
  else if (op === "-") result = left.sub(right);
  else if (op === "*") result = left.mul(right);
  else {
    if (Number(right.n) === 0) {
      throw new UnsolvableProblemError("You can't divide by zero.");
    }
    result = left.div(right);
  }

  if (steps.length >= MAX_STEPS) throw new NotArithmeticError();
  const block = makeBlock(op, left, right, result);
  steps.push({
    kind: "calculation",
    reason: SYMBOLS[op].verb(showInside(left), showInside(right)),
    why: SYMBOLS[op].why,
    earnsMarks: true,
    block,
  });
  return result;
}

// The answer, with quotient and remainder when the last step is a long division
function makeAnswer(steps: Step[], value: Fraction): SolutionV2Content["answer"] {
  const last = steps[steps.length - 1].block;
  // Only when the division is the final value; a minus sign around it changes the answer
  if (last.type === "longDivision" && Number(value.s) >= 0) {
    const quotient = BigInt(last.dividend) / BigInt(last.divisor);
    const remainder = BigInt(last.dividend) % BigInt(last.divisor);
    return {
      latex: remainder === 0n ? `${quotient}` : `${quotient} \\text{ remainder } ${remainder}`,
      sentence: `Quotient = ${quotient}, remainder = ${remainder}`,
    };
  }
  const text = show(value);
  return { latex: text, sentence: `The answer is ${text}.` };
}

function tree(text: string): MathNode | null {
  try {
    return math.parse(text);
  } catch {
    return null; // mathjs could not read it
  }
}

function walkAll(root: MathNode): Walk {
  const steps: Step[] = [];
  const value = walk(root, steps);
  if (steps.length === 0) throw new NotArithmeticError();
  return { steps, value };
}

/**
 * Returns a full solution for plain arithmetic, or null when the problem is
 * anything else (letters, "=", functions, very long numbers) so the AI gets it.
 * Throws UnsolvableProblemError for a division by zero.
 */
export function trySolveArithmetic(problem: string): SolutionV2Content | null {
  if (problem.length > MAX_PROBLEM_LENGTH) return null;

  const text = normalise(problem);
  if (!looksLikeArithmetic(text)) return null;

  const root = tree(text);
  if (!root) return null;

  try {
    const { steps, value } = walkAll(root);
    const answer = makeAnswer(steps, value);

    return {
      formatVersion: 2,
      header: {
        level: "class1-5",
        questionType: "Arithmetic",
        method: { id: "arithmetic", label: "Arithmetic", alternatives: [] },
      },
      problem: { text: problem.trim(), task: "Work out the value" },
      steps,
      answer,
    };
  } catch (error) {
    if (error instanceof NotArithmeticError) return null;
    throw error;
  }
}
