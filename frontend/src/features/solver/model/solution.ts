// The solution shape every solver UI component renders (format version 2).

export type Level = "class1-5" | "class6-8" | "class9-10" | "class11-12" | "college" | "grad";

export type StepKind =
  | "setup"
  | "formula"
  | "substitution"
  | "calculation"
  | "reasoning"
  | "conclusion"
  | "layout";

export type Block =
  | { type: "equation"; latex: string } // may contain \begin{aligned}
  | { type: "text"; text: string } // inline math as $...$
  | { type: "longDivision"; dividend: number; divisor: number }
  | { type: "columnArithmetic"; op: "+" | "-"; operands: number[] }
  | { type: "statementReason"; rows: { statement: string; reason: string }[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export interface SolutionStep {
  kind: StepKind;
  reason: string;
  why: string;
  earnsMarks: boolean;
  block: Block;
}

export interface SolutionV2 {
  formatVersion: 2;
  id: string;
  createdAt: string; // ISO date string
  header: {
    level?: Level; // unknown for old saved solutions
    board?: string;
    questionType: string;
    method: { id: string; label: string; alternatives: { id: string; label: string }[] };
  };
  problem: { latex?: string; text?: string; task: string };
  sections?: { given?: string; toFind?: string; toProve?: string };
  steps: SolutionStep[];
  answer: { latex?: string; text?: string; sentence?: string; unit?: string; check?: string };
  hint?: string;
}
