import { Component, type ReactNode } from "react";
import type { Block } from "../model/solution";
import { ColumnArithmeticBlock } from "./ColumnArithmeticBlock";
import { EquationBlock } from "./EquationBlock";
import { LongDivisionBlock } from "./LongDivisionBlock";
import { StatementReasonBlock } from "./StatementReasonBlock";
import { TableBlock } from "./TableBlock";
import { TextBlock } from "./TextBlock";

const FALLBACK = "This step could not be shown.";

// Catches any renderer error (for example bad numbers) so one block never breaks the page.
class BlockBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <TextBlock text={FALLBACK} /> : this.props.children;
  }
}

function renderBlock(block: Block): ReactNode {
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
      return <TextBlock text={FALLBACK} />;
  }
}

// Picks the renderer for a block. Unknown or broken blocks show plain text, never crash.
export function BlockView({ block }: { block: Block }) {
  return <BlockBoundary>{renderBlock(block)}</BlockBoundary>;
}
