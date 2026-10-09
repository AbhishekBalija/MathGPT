import { InlineText } from "./InlineText";

const CELL = "border border-gray-300 px-3 py-2 text-left align-top dark:border-gray-700";

export function StatementReasonBlock({ rows }: { rows: { statement: string; reason: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-base text-gray-900 dark:text-gray-100">
        <thead>
          <tr>
            <th className={`${CELL} text-gray-600 dark:text-gray-400`}>Statement</th>
            <th className={`${CELL} text-gray-600 dark:text-gray-400`}>Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className={CELL}>
                <InlineText text={row.statement} />
              </td>
              <td className={CELL}>
                <InlineText text={row.reason} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
