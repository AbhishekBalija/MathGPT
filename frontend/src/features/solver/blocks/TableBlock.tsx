import { Math } from "./Math";

const CELL = "border border-gray-300 px-3 py-2 text-left dark:border-gray-700";

export function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-base text-gray-900 dark:text-gray-100">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`${CELL} text-gray-600 dark:text-gray-400`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className={CELL}>
                  <Math latex={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
