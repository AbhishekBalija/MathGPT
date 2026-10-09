import { describe, expect, it } from "vitest";
import { solutionV2Schema } from "../../src/modules/solutions/solution-v2.schema";

// The three examples from the spec, copied from the frontend fixtures.
const examples = {
  "quadratic": {
    "formatVersion": 2,
    "header": {
      "level": "class9-10",
      "board": "CBSE",
      "questionType": "Algebra",
      "method": {
        "id": "factorisation",
        "label": "Factorisation",
        "alternatives": [
          {
            "id": "formula",
            "label": "Quadratic formula"
          },
          {
            "id": "square",
            "label": "Completing the square"
          }
        ]
      }
    },
    "problem": {
      "latex": "x^2 + 5x + 6 = 0",
      "task": "Solve for x"
    },
    "steps": [
      {
        "kind": "setup",
        "reason": "Find two numbers that multiply to 6 and add to 5",
        "why": "To split the middle term, find two numbers whose product is 6 and whose sum is 5.",
        "earnsMarks": false,
        "block": {
          "type": "equation",
          "latex": "2 \\times 3 = 6,\\quad 2 + 3 = 5"
        }
      },
      {
        "kind": "calculation",
        "reason": "Split the middle term and factorise",
        "why": "Splitting 5x into 2x + 3x lets you take out a common factor from each pair.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "\\begin{aligned} x^2 + 2x + 3x + 6 &= 0 \\\\ x(x + 2) + 3(x + 2) &= 0 \\\\ (x + 2)(x + 3) &= 0 \\end{aligned}"
        }
      },
      {
        "kind": "reasoning",
        "reason": "Set each factor to zero",
        "why": "If two numbers multiply to 0, at least one of them must be 0.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "x + 2 = 0 \\;\\text{ or }\\; x + 3 = 0"
        }
      },
      {
        "kind": "calculation",
        "reason": "Solve each one",
        "why": "Subtract the same number from both sides to get x on its own.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "\\begin{aligned} x + 2 &= 0 &\\Rightarrow\\; x &= -2 \\\\ x + 3 &= 0 &\\Rightarrow\\; x &= -3 \\end{aligned}"
        }
      }
    ],
    "answer": {
      "latex": "x = -2 \\;\\text{ or }\\; x = -3",
      "sentence": "The roots are -2 and -3.",
      "check": "Check: (-2)^2 + 5(-2) + 6 = 4 - 10 + 6 = 0"
    }
  },
  "trainProblem": {
    "formatVersion": 2,
    "header": {
      "level": "class9-10",
      "board": "CBSE",
      "questionType": "Quadratic equations, word problem",
      "method": {
        "id": "factorisation",
        "label": "Factorisation",
        "alternatives": [
          {
            "id": "formula",
            "label": "Quadratic formula"
          }
        ]
      }
    },
    "problem": {
      "text": "A train travels 360 km at a uniform speed.",
      "task": "If the speed had been 5 km/h more, it would have taken 1 hour less. Find the speed of the train."
    },
    "sections": {
      "given": "Distance = 360 km. With 5 km/h more speed, the time is 1 hour less.",
      "toFind": "The speed of the train."
    },
    "steps": [
      {
        "kind": "setup",
        "reason": "Let the speed of the train be x km/h",
        "why": "Time = distance / speed. Naming the unknown first is the step examiners look for.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "\\text{Time taken} = \\frac{360}{x} \\text{ hours}"
        }
      },
      {
        "kind": "formula",
        "reason": "Form the equation from the question",
        "why": "The slower trip takes 1 hour more than the faster one.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "\\frac{360}{x} - \\frac{360}{x + 5} = 1"
        }
      },
      {
        "kind": "calculation",
        "reason": "Simplify to a quadratic",
        "why": "Multiply both sides by x(x + 5) to clear the fractions.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "\\begin{aligned} 360(x + 5) - 360x &= x(x + 5) \\\\ x^2 + 5x - 1800 &= 0 \\end{aligned}"
        }
      },
      {
        "kind": "calculation",
        "reason": "Factorise",
        "why": "45 x 40 = 1800 and 45 - 40 = 5.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "\\begin{aligned} (x + 45)(x - 40) &= 0 \\\\ x = -45 \\;\\text{ or }\\; x &= 40 \\end{aligned}"
        }
      },
      {
        "kind": "reasoning",
        "reason": "Reject the value that is not possible",
        "why": "Always check each root against the real situation. Examiners give a mark for this.",
        "earnsMarks": true,
        "block": {
          "type": "text",
          "text": "$x = -45$ is rejected, since speed cannot be negative."
        }
      }
    ],
    "answer": {
      "text": "Speed of the train = 40 km/h",
      "check": "Check: 360 / 40 = 9 h and 360 / 45 = 8 h, one hour less."
    }
  },
  "division156": {
    "formatVersion": 2,
    "header": {
      "level": "class1-5",
      "questionType": "Division",
      "method": {
        "id": "long-division",
        "label": "Long division",
        "alternatives": []
      }
    },
    "problem": {
      "latex": "156 \\div 4",
      "task": "Divide 156 by 4"
    },
    "steps": [
      {
        "kind": "layout",
        "reason": "The working, written out",
        "why": "This is the whole sum written the way it is taught, so you can follow each line.",
        "earnsMarks": false,
        "block": {
          "type": "longDivision",
          "dividend": 156,
          "divisor": 4
        }
      },
      {
        "kind": "calculation",
        "reason": "How many 4s are in 15?",
        "why": "1 is smaller than 4, so start with the first two digits, 15.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "15 \\div 4 = 3 \\text{ (write 3 on top)}"
        }
      },
      {
        "kind": "calculation",
        "reason": "Multiply and subtract",
        "why": "Write 12 under 15 and take it away. 3 is left.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "3 \\times 4 = 12,\\quad 15 - 12 = 3"
        }
      },
      {
        "kind": "calculation",
        "reason": "Bring down the 6",
        "why": "The next digit, 6, comes down next to the 3.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "\\text{Now we have } 36"
        }
      },
      {
        "kind": "calculation",
        "reason": "How many 4s are in 36?",
        "why": "4 x 9 = 36 exactly.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "36 \\div 4 = 9 \\text{ (write 9 on top)}"
        }
      },
      {
        "kind": "calculation",
        "reason": "Multiply and subtract",
        "why": "Nothing is left, so the remainder is 0.",
        "earnsMarks": true,
        "block": {
          "type": "equation",
          "latex": "9 \\times 4 = 36,\\quad 36 - 36 = 0"
        }
      }
    ],
    "answer": {
      "latex": "156 \\div 4 = 39",
      "sentence": "Quotient = 39, remainder = 0",
      "check": "Check: 39 x 4 = 156"
    }
  }
};


type Example = (typeof examples)["quadratic"];

// Deep copy so each test can change its own version.
function clone(): Example {
  return structuredClone(examples.quadratic);
}

function withBlock(block: unknown): unknown {
  const solution = clone();
  return { ...solution, steps: [{ ...solution.steps[0], block }] };
}

describe("solutionV2Schema", () => {
  it.each(Object.entries(examples))("accepts the %s example", (_name, solution) => {
    expect(solutionV2Schema.safeParse(solution).success).toBe(true);
  });

  it("rejects a step without a block", () => {
    const solution = clone();
    const stepWithoutBlock: Record<string, unknown> = { ...solution.steps[0] };
    delete stepWithoutBlock.block;
    expect(solutionV2Schema.safeParse({ ...solution, steps: [stepWithoutBlock] }).success).toBe(false);
  });

  it("rejects a header without a level", () => {
    const solution = clone();
    const header: Record<string, unknown> = { ...solution.header };
    delete header.level;
    expect(solutionV2Schema.safeParse({ ...solution, header }).success).toBe(false);
  });

  it("rejects an unknown block type", () => {
    expect(solutionV2Schema.safeParse(withBlock({ type: "video", url: "x" })).success).toBe(false);
  });

  it("rejects an answer with neither latex nor text", () => {
    const solution = clone();
    expect(solutionV2Schema.safeParse({ ...solution, answer: { sentence: "Done" } }).success).toBe(false);
  });

  it("rejects more than 30 steps", () => {
    const solution = clone();
    const steps = Array.from({ length: 31 }, () => solution.steps[0]);
    expect(solutionV2Schema.safeParse({ ...solution, steps }).success).toBe(false);
  });

  it("rejects a very long equation", () => {
    const block = { type: "equation", latex: "x".repeat(2001) };
    expect(solutionV2Schema.safeParse(withBlock(block)).success).toBe(false);
  });

  it("rejects a table with more than 50 rows", () => {
    const rows = Array.from({ length: 51 }, () => ["1", "2"]);
    const block = { type: "table", headers: ["a", "b"], rows };
    expect(solutionV2Schema.safeParse(withBlock(block)).success).toBe(false);
  });
});

describe("extra keys and more block shapes", () => {
  it("strips unknown keys instead of rejecting them", () => {
    const solution = clone();
    const input = {
      ...solution,
      extraTop: 1,
      steps: [{ ...solution.steps[0], extraStep: 2, block: { ...solution.steps[0].block, extraBlock: 3 } }],
    };
    const result = solutionV2Schema.safeParse(input);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty("extraTop");
    expect(result.data.steps[0]).not.toHaveProperty("extraStep");
    expect(result.data.steps[0].block).not.toHaveProperty("extraBlock");
  });

  it("accepts a statementReason block", () => {
    const block = { type: "statementReason", rows: [{ statement: "$AB = AC$", reason: "Given" }] };
    expect(solutionV2Schema.safeParse(withBlock(block)).success).toBe(true);
  });

  it("accepts a table block", () => {
    const block = { type: "table", headers: ["x", "y"], rows: [["1", "2"], ["3", "4"]] };
    expect(solutionV2Schema.safeParse(withBlock(block)).success).toBe(true);
  });

  it("rejects a table row with the wrong number of cells", () => {
    const block = { type: "table", headers: ["x", "y"], rows: [["1"]] };
    expect(solutionV2Schema.safeParse(withBlock(block)).success).toBe(false);
  });

  it("rejects 11 table columns", () => {
    const row = Array.from({ length: 11 }, () => "1");
    const block = { type: "table", headers: row, rows: [row] };
    expect(solutionV2Schema.safeParse(withBlock(block)).success).toBe(false);
  });

  it("rejects a 301 character table cell", () => {
    const block = { type: "table", headers: ["x"], rows: [["a".repeat(301)]] };
    expect(solutionV2Schema.safeParse(withBlock(block)).success).toBe(false);
  });

  it("rejects an empty steps array", () => {
    expect(solutionV2Schema.safeParse({ ...clone(), steps: [] }).success).toBe(false);
  });
});

describe("longDivision block", () => {
  const division = (dividend: number, divisor: number) =>
    withBlock({ type: "longDivision", dividend, divisor });

  it("accepts whole numbers", () => {
    expect(solutionV2Schema.safeParse(division(156, 4)).success).toBe(true);
  });

  it("rejects a divisor of 0", () => {
    expect(solutionV2Schema.safeParse(division(156, 0)).success).toBe(false);
  });

  it("rejects a negative dividend", () => {
    expect(solutionV2Schema.safeParse(division(-156, 4)).success).toBe(false);
  });

  it("rejects decimals", () => {
    expect(solutionV2Schema.safeParse(division(15.5, 4)).success).toBe(false);
  });

  it("rejects numbers too big to be exact", () => {
    expect(solutionV2Schema.safeParse(division(Number.MAX_SAFE_INTEGER + 1, 4)).success).toBe(false);
  });
});

describe("columnArithmetic block", () => {
  const column = (op: "+" | "-", operands: number[]) =>
    withBlock({ type: "columnArithmetic", op, operands });

  it("accepts adding three numbers", () => {
    expect(solutionV2Schema.safeParse(column("+", [12, 34, 56])).success).toBe(true);
  });

  it("accepts subtracting a smaller number", () => {
    expect(solutionV2Schema.safeParse(column("-", [50, 18])).success).toBe(true);
    expect(solutionV2Schema.safeParse(column("-", [18, 18])).success).toBe(true);
  });

  it("rejects fewer than 2 numbers", () => {
    expect(solutionV2Schema.safeParse(column("+", [5])).success).toBe(false);
  });

  it("rejects subtraction with 3 numbers", () => {
    expect(solutionV2Schema.safeParse(column("-", [50, 10, 5])).success).toBe(false);
  });

  it("rejects subtraction where the first number is smaller", () => {
    expect(solutionV2Schema.safeParse(column("-", [18, 50])).success).toBe(false);
  });

  it("rejects 11 operands", () => {
    expect(solutionV2Schema.safeParse(column("+", Array.from({ length: 11 }, () => 1))).success).toBe(false);
  });

  it("rejects negative numbers", () => {
    expect(solutionV2Schema.safeParse(column("+", [-5, 10])).success).toBe(false);
  });

  it("rejects decimals and unsafe numbers", () => {
    expect(solutionV2Schema.safeParse(column("+", [1.5, 2])).success).toBe(false);
    expect(solutionV2Schema.safeParse(column("+", [Number.MAX_SAFE_INTEGER + 1, 2])).success).toBe(false);
  });
});
