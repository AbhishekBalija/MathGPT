import { Math } from "./Math";

export function EquationBlock({ latex }: { latex: string }) {
  return (
    <div className="overflow-x-auto">
      <Math latex={latex} display />
    </div>
  );
}
