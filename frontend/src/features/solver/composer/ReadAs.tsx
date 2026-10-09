import { cleanExpression } from "../../../utils/latexUtils";
import { Math } from "../blocks/Math";

// Keypad and common typed symbols, turned into LaTeX so KaTeX can draw them.
const SYMBOLS: Record<string, string> = {
  "²": "^{2}",
  "³": "^{3}",
  "√": "\\sqrt{}",
  "π": "\\pi ",
  "θ": "\\theta ",
  "÷": "\\div ",
  "×": "\\times ",
  "∫": "\\int ",
  "≤": "\\leq ",
  "≥": "\\geq ",
};

function toLatex(text: string): string {
  return Array.from(cleanExpression(text))
    .map((char) => SYMBOLS[char] ?? char)
    .join("");
}

interface ReadAsProps {
  value: string;
}

// Shows how Neo understood the typed problem. Hidden while the field is empty.
export function ReadAs({ value }: ReadAsProps) {
  if (!value.trim()) return null;
  return (
    <p className="mb-2 flex items-center gap-2 px-1 text-sm text-gray-600 dark:text-gray-400">
      <span>Read as</span>
      <span className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-50">
        <Math latex={toLatex(value)} />
      </span>
    </p>
  );
}
