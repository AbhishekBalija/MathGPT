import { layoutLongDivision } from "../layout/longDivision";

const LINE = "border-gray-900 dark:border-gray-100";

// Draws the layout as a grid: one column for the divisor, then one per dividend digit.
export function LongDivisionBlock({ dividend, divisor }: { dividend: number; divisor: number }) {
  const layout = layoutLongDivision(dividend, divisor);
  const count = layout.digits.length;
  const cols = Array.from({ length: count }, (_, c) => c);

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid font-serif text-2xl leading-snug text-gray-900 dark:text-gray-100"
        style={{ gridTemplateColumns: `2rem repeat(${count}, 1.5rem)` }}
      >
        {/* Quotient row, with the line under it */}
        <span />
        {cols.map((c) => (
          <span
            key={c}
            data-row="q"
            data-col={c}
            className={`border-b-2 text-center ${LINE}`}
          >
            {layout.quotient[c]}
          </span>
        ))}

        {/* Dividend row: divisor on the left, bracket before the first digit */}
        <span data-row="n" data-col="divisor" className="pr-2 text-right">
          {divisor}
        </span>
        {cols.map((c) => (
          <span
            key={c}
            data-row="n"
            data-col={c}
            className={`text-center ${c === 0 ? `rounded-tl-lg border-l-2 ${LINE}` : ""}`}
          >
            {layout.digits[c]}
          </span>
        ))}

        {/* Working rows, right-aligned to each row's end column */}
        {layout.rows.map((row, r) => {
          const start = row.endColumn - row.value.length + 1;
          return (
            <div key={r} className="contents">
              <span />
              {cols.map((c) => {
                const inRow = c >= start && c <= row.endColumn;
                const underline = row.kind === "subtract" && inRow;
                return (
                  <span
                    key={c}
                    data-row={r}
                    data-col={c}
                    className={`text-center ${underline ? `border-b-2 ${LINE}` : ""}`}
                  >
                    {inRow ? row.value[c - start] : ""}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
