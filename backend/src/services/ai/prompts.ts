/**
 * Prompts for the Math AI Service
 *
 * These prompts are carefully crafted to generate teacher-style,
 * notebook-like step-by-step solutions that students can learn from.
 */

/**
 * System prompt that sets the AI's persona and output format
 */
export const MATH_TUTOR_SYSTEM_PROMPT = `You are an expert math tutor writing solutions in a notebook for a student. Your goal is to help students understand EXACTLY how to solve math problems step-by-step, just like a teacher would write on a blackboard or paper.

CRITICAL RULES:
1. Write expressions in LaTeX format (e.g., \\frac{x}{y}, x^2, \\sqrt{x})
2. Every step must be COMPLETE and STANDALONE - a student should be able to follow from any step
3. Explanations should be educational - explain the "why" and "how", not just the "what"
4. Use simple language a high school student can understand
5. If there are multiple approaches, pick the most intuitive one

OUTPUT FORMAT:
You must respond with valid JSON only. No markdown, no explanations outside the JSON.`;

/**
 * Main problem-solving prompt template
 */
export const SOLVE_PROBLEM_PROMPT = `Solve this math problem step-by-step:

PROBLEM: {problem}

Respond with this exact JSON structure:
{
  "problemType": "<one of: algebra, calculus_derivative, calculus_integral, calculus_limit, trigonometry, linear_algebra, geometry, statistics, unknown>",
  "steps": [
    {
      "expression": "<LaTeX expression showing the work at this step>",
      "justification": "<Brief 1-line description of what operation was performed>",
      "explanation": "<2-3 sentences explaining HOW this step works and WHY we do it. Include the reasoning a student needs to understand and replicate this step on their own.>"
    }
  ],
  "finalAnswer": "<The final answer in LaTeX format, clearly stated>",
  "summary": "<One sentence summarizing the solution approach used>"
}

IMPORTANT:
- Include ALL steps, even simple ones. Students learn from seeing every detail.
- The first step should state the original problem clearly
- The last step should clearly show the final answer
- Each expression should show the complete equation/state at that step
- Justifications should be short (5-10 words)
- Explanations should be teaching-focused (2-3 sentences, explain concepts)

Example justifications: "Factor the quadratic", "Apply power rule", "Simplify both sides"
Example explanation: "We factor x² + 2x + 1 by recognizing it as a perfect square trinomial. When we have a² + 2ab + b², it equals (a + b)². Here, a = x and b = 1, giving us (x + 1)²."`;

/**
 * Prompt for hint mode - gives only the next step
 */
export const HINT_PROMPT = `The student is working on this problem and needs a HINT (not the full solution):

PROBLEM: {problem}
CURRENT WORK: {currentWork}

Give only the NEXT step they should take. Respond with JSON:
{
  "problemType": "<problem type>",
  "hint": {
    "expression": "<What the next step should look like in LaTeX>",
    "justification": "<What operation to perform>",
    "explanation": "<Guide them on how to think about this step, without giving away too much>"
  }
}`;

/**
 * Builds the complete prompt for solving a problem
 */
export function buildSolvePrompt(problem: string): string {
  return SOLVE_PROBLEM_PROMPT.replace("{problem}", problem);
}

/**
 * Builds the hint prompt
 */
export function buildHintPrompt(
  problem: string,
  currentWork: string = ""
): string {
  return HINT_PROMPT.replace("{problem}", problem).replace(
    "{currentWork}",
    currentWork || "None - just starting"
  );
}

/**
 * Example problems for testing (can be used in dev/test mode)
 */
export const EXAMPLE_PROBLEMS = [
  "Solve x² + 2x + 1 = 0",
  "Find the derivative of f(x) = x³ + 2x² - 5x + 3",
  "Evaluate the integral ∫(2x + 3)dx",
  "Simplify: (3x² + 6x) / (3x)",
  "Solve the system: 2x + y = 5, x - y = 1",
];
