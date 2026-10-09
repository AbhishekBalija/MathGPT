import { z } from "zod";

// Shape of a solution in format version 2. The server adds `id` and
// `createdAt` when it saves, so they are not part of this schema.

const levelSchema = z.enum(["class1-5", "class6-8", "class9-10", "class11-12", "college", "grad"]);

const stepKindSchema = z.enum([
  "setup",
  "formula",
  "substitution",
  "calculation",
  "reasoning",
  "conclusion",
  "layout",
]);

const MAX_LONG_TEXT = 2000;
const MAX_REASON = 300; // a step's reason
const MAX_SHORT_TEXT = 300; // board, unit, labels, headers and table cells
const MAX_OPERANDS = 10;
const MAX_TABLE_COLUMNS = 10;
const MAX_WHY = 2000;
const MAX_STEPS = 30;
const MAX_TABLE_ROWS = 50;

const longText = z.string().min(1).max(MAX_LONG_TEXT);
const safeInt = z.number().refine(Number.isSafeInteger, "Must be a safe integer");
// The column renderer draws digits only, so no negatives
const digitsInt = safeInt.refine((n) => n >= 0, "Must not be negative");

const equationBlock = z.object({
  type: z.literal("equation"),
  latex: longText, // may contain \begin{aligned}
});

const textBlock = z.object({
  type: z.literal("text"),
  // Plain text with inline math written as $...$
  text: longText,
});

const longDivisionBlock = z.object({
  type: z.literal("longDivision"),
  dividend: safeInt.refine((n) => n >= 0, "Dividend cannot be negative"),
  divisor: safeInt.refine((n) => n > 0, "Divisor must be above zero"),
});

const columnArithmeticBlock = z
  .object({
    type: z.literal("columnArithmetic"),
    op: z.enum(["+", "-"]),
    operands: z.array(digitsInt).min(2).max(MAX_OPERANDS),
  })
  .refine((b) => b.op === "+" || b.operands.length === 2, {
    message: "Subtraction needs exactly 2 numbers",
    path: ["operands"],
  })
  .refine((b) => b.op === "+" || b.operands[0] >= b.operands[1], {
    message: "The first number must be at least the second",
    path: ["operands"],
  });

const statementReasonBlock = z.object({
  type: z.literal("statementReason"),
  rows: z
    .array(
      z.object({
        // Both are plain text with inline math written as $...$
        statement: longText,
        reason: z.string().min(1).max(MAX_SHORT_TEXT),
      }),
    )
    .min(1)
    .max(MAX_TABLE_ROWS),
});

const tableBlock = z
  .object({
    type: z.literal("table"),
    // Header and cells are plain text with inline math written as $...$
    headers: z.array(z.string().max(MAX_SHORT_TEXT)).min(1).max(MAX_TABLE_COLUMNS),
    rows: z.array(z.array(z.string().max(MAX_SHORT_TEXT)).max(MAX_TABLE_COLUMNS)).max(MAX_TABLE_ROWS),
  })
  .refine((t) => t.rows.every((row) => row.length === t.headers.length), {
    message: "Every row needs one cell per header",
    path: ["rows"],
  });

export const blockSchema = z.discriminatedUnion("type", [
  equationBlock,
  textBlock,
  longDivisionBlock,
  columnArithmeticBlock,
  statementReasonBlock,
  tableBlock,
]);

const stepSchema = z.object({
  kind: stepKindSchema,
  reason: z.string().min(1).max(MAX_REASON),
  why: z.string().max(MAX_WHY),
  earnsMarks: z.boolean(),
  block: blockSchema,
});

const answerSchema = z
  .object({
    latex: longText.optional(),
    text: longText.optional(),
    sentence: z.string().max(MAX_LONG_TEXT).optional(),
    unit: z.string().max(MAX_SHORT_TEXT).optional(),
    check: z.string().max(MAX_LONG_TEXT).optional(),
  })
  .refine((a) => a.latex !== undefined || a.text !== undefined, {
    message: "Answer needs latex or text",
  });

export const solutionV2Schema = z.object({
  formatVersion: z.literal(2),
  header: z.object({
    level: levelSchema,
    board: z.string().max(MAX_SHORT_TEXT).optional(),
    questionType: z.string().min(1).max(MAX_SHORT_TEXT),
    method: z.object({
      id: z.string().min(1).max(100),
      label: z.string().min(1).max(MAX_SHORT_TEXT),
      alternatives: z
        .array(z.object({ id: z.string().min(1).max(100), label: z.string().min(1).max(MAX_SHORT_TEXT) }))
        .max(10),
    }),
  }),
  problem: z.object({
    latex: longText.optional(),
    text: longText.optional(),
    task: z.string().min(1).max(MAX_LONG_TEXT),
  }),
  sections: z
    .object({
      given: z.string().max(MAX_LONG_TEXT).optional(),
      toFind: z.string().max(MAX_LONG_TEXT).optional(),
      toProve: z.string().max(MAX_LONG_TEXT).optional(),
    })
    .optional(),
  steps: z.array(stepSchema).min(1).max(MAX_STEPS),
  answer: answerSchema,
  hint: z.string().max(MAX_LONG_TEXT).optional(),
});

export type SolutionV2Content = z.infer<typeof solutionV2Schema>;
