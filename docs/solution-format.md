# Solution format (version 2)

Every new solution is stored and sent as `SolutionV2`. The one source of
truth is the zod schema in
`backend/src/modules/solutions/solution-v2.schema.ts`. The AI's reply is
parsed with it, the cache re-checks it on the way out, and the frontend
draws it with `frontend/src/features/solver/`.

Old solutions (format 1, the `steps` column) are never rewritten. The
frontend turns each old step into an `equation` block
(`model/adapter.ts`).

## The whole solution

```json
{
  "formatVersion": 2,
  "header": {
    "level": "class9-10",
    "board": "CBSE",
    "questionType": "Quadratic equation",
    "method": {
      "id": "factorisation",
      "label": "Factorisation",
      "alternatives": [{ "id": "quadratic-formula", "label": "Quadratic formula" }]
    }
  },
  "problem": { "latex": "x^2 + 5x + 6 = 0", "task": "Solve for x" },
  "sections": { "given": "$x^2 + 5x + 6 = 0$", "toFind": "the values of $x$" },
  "steps": [
    {
      "kind": "setup",
      "reason": "Split the middle term",
      "why": "6 = 2 x 3 and 2 + 3 = 5, so 5x can be written as 2x + 3x.",
      "earnsMarks": true,
      "block": { "type": "equation", "latex": "x^2 + 2x + 3x + 6 = 0" }
    }
  ],
  "answer": {
    "latex": "x = -2 \\text{ or } x = -3",
    "sentence": "Hence, the roots are -2 and -3.",
    "check": "Checked by putting the answer back in."
  },
  "hint": "Look for two numbers that multiply to 6 and add to 5."
}
```

| Field | Notes |
|---|---|
| `header.level` | `class1-5`, `class6-8`, `class9-10`, `class11-12`, `college` or `grad`. Inferred by the AI until onboarding asks the student (#39). |
| `header.board` | Optional, `"CBSE"` for class 1 to 12 by default. |
| `header.method` | The method used, and up to 10 others the student can switch to. Switching sends the `id` back as `method` in `POST /api/solve`. |
| `problem` | `latex` or `text` (at least one) and the `task`. |
| `sections` | Optional `given`, `toFind`, `toProve`, for exam-style answers. |
| `steps` | 1 to 30. `kind` is one of `setup`, `formula`, `substitution`, `calculation`, `reasoning`, `conclusion`, `layout`. `earnsMarks` gives the step a pink number. `why` is the "Why?" explanation. |
| `answer` | `latex` or `text`, never the same answer in both. Optional `sentence` and `unit`. |
| `answer.check` / `answer.warning` | **Set only by our code**, never the AI: `check` when code confirmed the answer, `warning` when code proved it wrong twice. Any the AI writes are removed. |
| `hint` | One nudge, shown by "Just a hint" with no second request. |

Strings with inline math write it as `$...$`. Lengths are capped (2000
characters for long text, 300 for short labels), so one bad reply cannot
store a huge row.

## Block types

Each step has exactly one `block`. The frontend shows an unknown block type
as text, so an older app never breaks on a newer solution.

### `equation`

One line or an aligned set of lines in LaTeX.

```json
{ "type": "equation", "latex": "\\begin{aligned} x + 2 &= 0 \\\\ x &= -2 \\end{aligned}" }
```

### `text`

Plain words with inline math, for word problems and reasoning.

```json
{ "type": "text", "text": "Ravi has $3$ more apples than Sita, so Ravi has $x + 3$." }
```

### `longDivision`

Drawn digit by digit in code, the way class 3 to 5 write it. Whole
numbers only, divisor above zero.

```json
{ "type": "longDivision", "dividend": 156, "divisor": 4 }
```

### `columnArithmetic`

Addition of 2 to 10 numbers, or subtraction of 2 (the first at least the
second), drawn in columns with the carries. Whole numbers, no negatives.

```json
{ "type": "columnArithmetic", "op": "+", "operands": [478, 256] }
```

### `statementReason`

The two-column table for proofs.

```json
{
  "type": "statementReason",
  "rows": [
    { "statement": "$AB = AC$", "reason": "Given" },
    { "statement": "$\\angle B = \\angle C$", "reason": "Angles opposite equal sides" }
  ]
}
```

### `table`

Any small table, such as a frequency table. Every row needs one cell per
header (up to 10 columns and 50 rows).

```json
{
  "type": "table",
  "headers": ["Marks", "Students"],
  "rows": [["0-10", "3"], ["10-20", "7"]]
}
```
