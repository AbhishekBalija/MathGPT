import { Math } from "./Math";

// Math already scrolls sideways in display mode, so no extra wrapper is needed.
export function EquationBlock({ latex }: { latex: string }) {
  return <Math latex={latex} display />;
}
