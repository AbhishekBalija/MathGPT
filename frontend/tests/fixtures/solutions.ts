import type { SolutionV2 } from "../../src/features/solver/model/solution";

const L = String.raw;
const createdAt = "2026-10-09T00:00:00.000Z";

// Class 10 quadratic, copied from the solver-v3 mockup.
export const quadratic: SolutionV2 = {
  formatVersion: 2,
  id: "quad",
  createdAt,
  header: {
    level: "class9-10",
    board: "CBSE",
    questionType: "Algebra",
    method: {
      id: "factorisation",
      label: "Factorisation",
      alternatives: [
        { id: "formula", label: "Quadratic formula" },
        { id: "square", label: "Completing the square" },
      ],
    },
  },
  problem: { latex: L`x^2 + 5x + 6 = 0`, task: "Solve for x" },
  steps: [
    {
      kind: "setup",
      reason: "Find two numbers that multiply to 6 and add to 5",
      why: "To split the middle term, find two numbers whose product is 6 and whose sum is 5.",
      earnsMarks: false,
      block: { type: "equation", latex: L`2 \times 3 = 6,\quad 2 + 3 = 5` },
    },
    {
      kind: "calculation",
      reason: "Split the middle term and factorise",
      why: "Splitting 5x into 2x + 3x lets you take out a common factor from each pair.",
      earnsMarks: true,
      block: {
        type: "equation",
        latex: L`\begin{aligned} x^2 + 2x + 3x + 6 &= 0 \\ x(x + 2) + 3(x + 2) &= 0 \\ (x + 2)(x + 3) &= 0 \end{aligned}`,
      },
    },
    {
      kind: "reasoning",
      reason: "Set each factor to zero",
      why: "If two numbers multiply to 0, at least one of them must be 0.",
      earnsMarks: true,
      block: { type: "equation", latex: L`x + 2 = 0 \;\text{ or }\; x + 3 = 0` },
    },
    {
      kind: "calculation",
      reason: "Solve each one",
      why: "Subtract the same number from both sides to get x on its own.",
      earnsMarks: true,
      block: {
        type: "equation",
        latex: L`\begin{aligned} x + 2 &= 0 &\Rightarrow\; x &= -2 \\ x + 3 &= 0 &\Rightarrow\; x &= -3 \end{aligned}`,
      },
    },
  ],
  answer: {
    latex: L`x = -2 \;\text{ or }\; x = -3`,
    sentence: "The roots are -2 and -3.",
    check: "Check: (-2)^2 + 5(-2) + 6 = 4 - 10 + 6 = 0",
  },
};

// Class 10 word problem with Given / To find.
export const trainProblem: SolutionV2 = {
  formatVersion: 2,
  id: "train",
  createdAt,
  header: {
    level: "class9-10",
    board: "CBSE",
    questionType: "Quadratic equations, word problem",
    method: {
      id: "factorisation",
      label: "Factorisation",
      alternatives: [{ id: "formula", label: "Quadratic formula" }],
    },
  },
  problem: {
    text: "A train travels 360 km at a uniform speed.",
    task: "If the speed had been 5 km/h more, it would have taken 1 hour less. Find the speed of the train.",
  },
  sections: {
    given: "Distance = 360 km. With 5 km/h more speed, the time is 1 hour less.",
    toFind: "The speed of the train.",
  },
  steps: [
    {
      kind: "setup",
      reason: "Let the speed of the train be x km/h",
      why: "Time = distance / speed. Naming the unknown first is the step examiners look for.",
      earnsMarks: true,
      block: { type: "equation", latex: L`\text{Time taken} = \frac{360}{x} \text{ hours}` },
    },
    {
      kind: "formula",
      reason: "Form the equation from the question",
      why: "The slower trip takes 1 hour more than the faster one.",
      earnsMarks: true,
      block: { type: "equation", latex: L`\frac{360}{x} - \frac{360}{x + 5} = 1` },
    },
    {
      kind: "calculation",
      reason: "Simplify to a quadratic",
      why: "Multiply both sides by x(x + 5) to clear the fractions.",
      earnsMarks: true,
      block: {
        type: "equation",
        latex: L`\begin{aligned} 360(x + 5) - 360x &= x(x + 5) \\ x^2 + 5x - 1800 &= 0 \end{aligned}`,
      },
    },
    {
      kind: "calculation",
      reason: "Factorise",
      why: "45 x 40 = 1800 and 45 - 40 = 5.",
      earnsMarks: true,
      block: {
        type: "equation",
        latex: L`\begin{aligned} (x + 45)(x - 40) &= 0 \\ x = -45 \;\text{ or }\; x &= 40 \end{aligned}`,
      },
    },
    {
      kind: "reasoning",
      reason: "Reject the value that is not possible",
      why: "Always check each root against the real situation. Examiners give a mark for this.",
      earnsMarks: true,
      block: { type: "text", text: "$x = -45$ is rejected, since speed cannot be negative." },
    },
  ],
  answer: {
    text: "Speed of the train = 40 km/h",
    check: "Check: 360 / 40 = 9 h and 360 / 45 = 8 h, one hour less.",
  },
};

// Class 3 long division (no marks key at this level).
export const division156: SolutionV2 = {
  formatVersion: 2,
  id: "div156",
  createdAt,
  header: {
    level: "class1-5",
    questionType: "Division",
    method: { id: "long-division", label: "Long division", alternatives: [] },
  },
  problem: { latex: L`156 \div 4`, task: "Divide 156 by 4" },
  steps: [
    {
      kind: "calculation",
      reason: "How many 4s are in 15?",
      why: "1 is smaller than 4, so start with the first two digits, 15.",
      earnsMarks: true,
      block: { type: "equation", latex: L`15 \div 4 = 3 \text{ (write 3 on top)}` },
    },
    {
      kind: "calculation",
      reason: "Multiply and subtract",
      why: "Write 12 under 15 and take it away. 3 is left.",
      earnsMarks: true,
      block: { type: "equation", latex: L`3 \times 4 = 12,\quad 15 - 12 = 3` },
    },
    {
      kind: "calculation",
      reason: "Bring down the 6",
      why: "The next digit, 6, comes down next to the 3.",
      earnsMarks: true,
      block: { type: "equation", latex: L`\text{Now we have } 36` },
    },
    {
      kind: "calculation",
      reason: "How many 4s are in 36?",
      why: "4 x 9 = 36 exactly.",
      earnsMarks: true,
      block: { type: "equation", latex: L`36 \div 4 = 9 \text{ (write 9 on top)}` },
    },
    {
      kind: "calculation",
      reason: "Multiply and subtract",
      why: "Nothing is left, so the remainder is 0.",
      earnsMarks: true,
      block: { type: "equation", latex: L`9 \times 4 = 36,\quad 36 - 36 = 0` },
    },
  ],
  answer: {
    latex: L`156 \div 4 = 39`,
    sentence: "Quotient = 39, remainder = 0",
    check: "Check: 39 x 4 = 156",
  },
};
