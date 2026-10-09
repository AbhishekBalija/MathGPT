import { containsMath, toLatex } from "../../../utils/latexUtils";
import { Math } from "../blocks/Math";

interface ReadAsProps {
  value: string;
}

// Algebra like "2x+3=7" is math even when containsMath does not spot it.
const looksLikeMath = (text: string): boolean => containsMath(text) || /[\d=^+\-*/×÷√π∫]/.test(text.trim());

// Shows how Neo understood the typed problem. Hidden when the field is empty
// or it is plain words.
export function ReadAs({ value }: ReadAsProps) {
  if (!value.trim() || !looksLikeMath(value)) return null;
  return (
    <p className="mb-2 flex items-center gap-2 px-1 text-sm text-gray-600 dark:text-gray-400">
      <span>Read as</span>
      <span className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-50">
        <Math latex={toLatex(value)} />
      </span>
    </p>
  );
}
