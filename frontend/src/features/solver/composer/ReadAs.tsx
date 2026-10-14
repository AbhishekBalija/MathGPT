import { containsMath, toLatex } from "../../../utils/latexUtils";
import { Math } from "../blocks/Math";

interface ReadAsProps {
  value: string;
}

// Algebra like "2x+3=7" is math even when containsMath does not spot it.
const looksLikeMath = (text: string): boolean => containsMath(text) || /[\d=^+\-*/×÷√π∫]/.test(text.trim());

// Function names are part of a formula, not words in a sentence
const FUNCTION_NAMES = new Set(["sin", "cos", "tan", "sec", "csc", "cot", "log", "ln", "exp", "sqrt", "lim"]);

// A word problem like "A train goes 120 km in 3 hours" has numbers but reads
// badly in math italics, so 3 or more plain words hide the preview.
function isWordProblem(text: string): boolean {
  const words = (text.match(/[a-z]{2,}/gi) ?? []).filter((word) => !FUNCTION_NAMES.has(word.toLowerCase()));
  return words.length >= 3;
}

// Shows how Neo understood the typed problem. Hidden when the field is empty,
// it is plain words, or it is a word problem.
export function ReadAs({ value }: ReadAsProps) {
  if (!value.trim() || !looksLikeMath(value) || isWordProblem(value)) return null;
  return (
    <p className="mb-2 flex items-center gap-2 px-1 text-sm text-gray-600 dark:text-gray-400">
      <span>Read as</span>
      <span className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-50">
        <Math latex={toLatex(value)} />
      </span>
    </p>
  );
}
