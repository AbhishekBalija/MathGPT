import type { Block } from "../model/solution";
import { ColumnArithmeticBlock } from "./ColumnArithmeticBlock";
import { EquationBlock } from "./EquationBlock";
import { LongDivisionBlock } from "./LongDivisionBlock";
import { StatementReasonBlock } from "./StatementReasonBlock";
import { TableBlock } from "./TableBlock";
import { TextBlock } from "./TextBlock";

// Picks the renderer for a block. Unknown or broken blocks show plain text, never crash.
export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "equation":
      return <EquationBlock latex={block.latex} />;
    case "text":
      return <TextBlock text={block.text} />;
    case "longDivision":
      return <LongDivisionBlock dividend={block.dividend} divisor={block.divisor} />;
    case "columnArithmetic":
      return <ColumnArithmeticBlock op={block.op} operands={block.operands} />;
    case "statementReason":
      return <StatementReasonBlock rows={block.rows} />;
    case "table":
      return <TableBlock headers={block.headers} rows={block.rows} />;
    default:
      return <TextBlock text="This step could not be shown." />;
  }
}
