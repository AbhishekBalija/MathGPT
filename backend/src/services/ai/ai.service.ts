/**
 * AI Service for Math Problem Solving
 *
 * Uses Google Gemini API to generate step-by-step math solutions
 * with proper LaTeX formatting and educational explanations.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type AISolutionResponse,
  type SolutionStep,
  type Solution,
  type ProblemType,
} from "../../types/solve.types";
import { MATH_TUTOR_SYSTEM_PROMPT, buildSolvePrompt } from "./prompts";

// Custom error for problems that cannot be solved (not server errors)
export class UnsolvableProblemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsolvableProblemError";
  }
}

// Patterns that indicate an unsolvable or mathematically invalid problem
const UNSOLVABLE_PATTERNS = [
  /divide\s*by\s*zero/i,
  /1\s*\/\s*0\b/,
  /\b0\s*\/\s*0\b/,
  /\binfinity\b/i,
  /\bundefined\b/i,
  /\bno\s*solution\b/i,
];

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_MATH_AI_API || "");

/**
 * Main function to solve a math problem using Gemini AI
 */
export async function solveMathProblem(problem: string): Promise<Solution> {
  const startTime = Date.now();

  // Check for obviously unsolvable problems before calling AI
  for (const pattern of UNSOLVABLE_PATTERNS) {
    if (pattern.test(problem)) {
      throw new UnsolvableProblemError(
        "This problem involves undefined or unsolvable mathematical operations."
      );
    }
  }

  try {
    // Get the Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent math
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
      },
    });

    // Build the prompt
    const userPrompt = buildSolvePrompt(problem);

    // Send to Gemini
    const result = await model.generateContent([
      { text: MATH_TUTOR_SYSTEM_PROMPT },
      { text: userPrompt },
    ]);

    const response = result.response;
    const text = response.text();

    // DEBUG: Log raw AI response
    console.log("\n========== RAW AI RESPONSE ==========");
    console.log(text);
    console.log("========== END RAW AI RESPONSE ==========\n");

    // Parse the JSON response
    const aiResponse = parseAIResponse(text);

    // DEBUG: Log parsed response (especially expressions and finalAnswer)
    console.log("\n========== PARSED AI RESPONSE ==========");
    console.log("Problem Type:", aiResponse.problemType);
    console.log("Final Answer:", JSON.stringify(aiResponse.finalAnswer));
    console.log("Steps:");
    aiResponse.steps.forEach((step, i) => {
      console.log(
        `  Step ${i + 1}: expression = ${JSON.stringify(step.expression)}`
      );
    });
    console.log("========== END PARSED RESPONSE ==========\n");

    // Transform to our Solution format
    const solution = transformToSolution(
      problem,
      aiResponse,
      Date.now() - startTime
    );

    return solution;
  } catch (error) {
    // Re-throw UnsolvableProblemError without wrapping
    if (error instanceof UnsolvableProblemError) {
      throw error;
    }

    console.error("Error solving math problem:", error);
    throw new Error(
      `Failed to solve problem: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Parse the AI response, handling potential JSON formatting issues
 */
function parseAIResponse(text: string): AISolutionResponse {
  // Clean up the response - remove markdown code blocks if present
  let cleanedText = text.trim();

  // Remove ```json and ``` markers
  if (cleanedText.startsWith("```json")) {
    cleanedText = cleanedText.slice(7);
  } else if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.slice(3);
  }

  if (cleanedText.endsWith("```")) {
    cleanedText = cleanedText.slice(0, -3);
  }

  cleanedText = cleanedText.trim();

  try {
    return JSON.parse(cleanedText) as AISolutionResponse;
  } catch (parseError) {
    console.error("Failed to parse AI response:", cleanedText);
    throw new Error("AI returned invalid JSON response");
  }
}

/**
 * Transform the AI response to our Solution format
 */
function transformToSolution(
  problem: string,
  aiResponse: AISolutionResponse,
  processingTimeMs: number
): Solution {
  const steps: SolutionStep[] = aiResponse.steps.map((step, index) => ({
    stepNumber: index + 1,
    expression: step.expression,
    justification: step.justification,
    explanation: step.explanation,
    status: "VERIFIED" as const, // Default to verified; SymPy verification can update this later
    notes: undefined,
  }));

  return {
    id: crypto.randomUUID(),
    problem,
    problemType: validateProblemType(aiResponse.problemType),
    steps,
    finalAnswer: aiResponse.finalAnswer,
    summary: aiResponse.summary,
    processingTimeMs,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validate and normalize problem type
 */
function validateProblemType(type: string): ProblemType {
  const validTypes: ProblemType[] = [
    "algebra",
    "calculus_derivative",
    "calculus_integral",
    "calculus_limit",
    "trigonometry",
    "linear_algebra",
    "geometry",
    "statistics",
    "unknown",
  ];

  const normalizedType = type.toLowerCase().replace(/\s+/g, "_") as ProblemType;

  return validTypes.includes(normalizedType) ? normalizedType : "unknown";
}

/**
 * Health check for the AI service
 */
export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    await model.generateContent('Say "OK" if you are working.');
    return true;
  } catch {
    return false;
  }
}
