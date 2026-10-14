import { layoutColumnAddition, layoutColumnSubtraction } from "../layout/columnArithmetic";

const LINE = "border-gray-900 dark:border-gray-100";
const SMALL = "text-xs leading-none text-gray-600 dark:text-gray-400";

// One digit per cell. Short numbers are padded on the left so digits line up on the right.
function digitAt(value: string, width: number, col: number): string {
  const index = col - (width - value.length);
  return index >= 0 ? value[index] : "";
}

interface GridProps {
  width: number;
  label: string;
  children: React.ReactNode;
}

function Grid({ width, label, children }: GridProps) {
  return (
    <div className="overflow-x-auto" role="img" aria-label={label}>
      <div
        aria-hidden="true"
        className="inline-grid font-serif text-2xl leading-snug text-gray-900 dark:text-gray-100"
        style={{ gridTemplateColumns: `1.5rem repeat(${width}, 1.5rem)` }}
      >
        {children}
      </div>
    </div>
  );
}

function AdditionView({ operands }: { operands: number[] }) {
  const layout = layoutColumnAddition(operands);
  const cols = Array.from({ length: layout.width }, (_, c) => c);
  const lastRow = layout.rows.length - 1;

  return (
    <Grid width={layout.width} label={operands.join(" plus ")}>
      {/* Carries sit above the column they were carried into */}
      <span />
      {cols.map((c) => (
        <span key={c} data-row="carry" data-col={c} className={`text-center ${SMALL}`}>
          {layout.carries[c]}
        </span>
      ))}
      {layout.rows.map((row, r) => (
        <div key={r} className="contents">
          <span className="text-center">{r === lastRow ? "+" : ""}</span>
          {cols.map((c) => (
            <span
              key={c}
              data-row={r}
              data-col={c}
              className={`text-center ${r === lastRow ? `border-b-2 ${LINE}` : ""}`}
            >
              {digitAt(row, layout.width, c)}
            </span>
          ))}
        </div>
      ))}
      <span />
      {cols.map((c) => (
        <span key={c} data-row="result" data-col={c} className="text-center">
          {digitAt(layout.result, layout.width, c)}
        </span>
      ))}
    </Grid>
  );
}

function SubtractionView({ a, b }: { a: number; b: number }) {
  const layout = layoutColumnSubtraction(a, b);
  const cols = Array.from({ length: layout.width }, (_, c) => c);
  const [top, bottom] = layout.rows;

  // A column received a borrow when the column on its left lent one.
  // A column can do both (like the 0 in 302 - 18).
  function borrowedValue(c: number): number | null {
    const received = c > 0 && layout.borrows[c - 1];
    const lent = layout.borrows[c];
    if (!received && !lent) return null;
    return Number(top[c]) + (received ? 10 : 0) - (lent ? 1 : 0);
  }

  return (
    <Grid width={layout.width} label={`${a} minus ${b}`}>
      <span />
      {cols.map((c) => (
        <span key={c} data-row="borrow" data-col={c} className={`text-center ${SMALL}`}>
          {borrowedValue(c)}
        </span>
      ))}
      <span />
      {cols.map((c) => {
        const changed = borrowedValue(c) !== null;
        return (
          <span
            key={c}
            data-row={0}
            data-col={c}
            className={`text-center ${changed ? "text-gray-600 line-through dark:text-gray-400" : ""}`}
          >
            {digitAt(top, layout.width, c)}
          </span>
        );
      })}
      <span className="text-center">&minus;</span>
      {cols.map((c) => (
        <span key={c} data-row={1} data-col={c} className={`text-center border-b-2 ${LINE}`}>
          {digitAt(bottom, layout.width, c)}
        </span>
      ))}
      <span />
      {cols.map((c) => (
        <span key={c} data-row="result" data-col={c} className="text-center">
          {digitAt(layout.result, layout.width, c)}
        </span>
      ))}
    </Grid>
  );
}

export function ColumnArithmeticBlock({ op, operands }: { op: "+" | "-"; operands: number[] }) {
  // The boundary in BlockView turns this into the "could not be shown" text.
  if (operands.length < 2) throw new RangeError("need at least two numbers");
  if (op === "+") return <AdditionView operands={operands} />;
  return <SubtractionView a={operands[0]} b={operands[1]} />;
}
