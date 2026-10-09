import { containsMath, toLatex } from "../../../utils/latexUtils";
import { Math } from "../blocks/Math";

interface ReadAsProps {
  value: string;
}

// Shows how Neo understood the typed problem. Hidden when the field is empty
// or the text does not look like math.
export function ReadAs({ value }: ReadAsProps) {
  if (!value.trim() || !containsMath(value)) return null;
  return (
    <p className="mb-2 flex items-center gap-2 px-1 text-sm text-gray-600 dark:text-gray-400">
      <span>Read as</span>
      <span className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-50">
        <Math latex={toLatex(value)} />
      </span>
    </p>
  );
}
