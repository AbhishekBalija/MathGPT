# Solver redesign

Status: approved · 2026-10-09 · Part of the `redesign` branch (nothing ships to production until the whole redesign is ready).

## Goal

Make solving a math problem feel clear and trustworthy for every student from class 1 to grad school, mostly on phones. A student enters a problem, sees the working at their level in the format they are marked on, and understands why each step happens.

Approved mockup: `solver-v3.html` in the brainstorming companion (desktop and phone, all states, three examples).

## Decisions already made

| Topic | Decision |
| --- | --- |
| Shape | A solution page, not a chat. The backend gives one problem, one solution, and no follow-up conversation. |
| Steps | All steps by default, with a "One at a time" switch that reveals them one by one. |
| Hint | "Just a hint" next to Solve. The backend already supports a hint mode. |
| Answer | The answer is the last step, written as the exam conclusion. No answer box at the top; a "Jump to answer" link instead. |
| Format | How a solution is shown depends on the problem and the method (see "Typed blocks"). |
| Marks | Steps that earn exam marks get a pink number; working steps a grey one. Never claim exact mark values. Hidden at levels without step marking (class 1 to 5). |
| Honesty | Remove the hard-coded "Verified" badges. Nothing is claimed that the app does not do. |

## The page

### Desktop

- **Sidebar:** logo; two icons (search, new problem); history grouped Today / This week / Older; delete with Undo; user at the bottom.
- **Page header:** level label (e.g. "Class 10 · Algebra"), previous / next problem arrows with "Problem 1 of 12", the problem set as math (or as text for word problems), the task line ("Solve for x"), "Jump to answer", Edit problem, New problem.
- **Method line:** "Method: Factorisation · Change" (Change re-solves with another allowed method).
- **Marks key:** one line, shown only when the solution has step marking.
- **Steps:** a divider ("5 steps and the answer"), the All / One at a time switch, then the blocks.
- **Answer:** the final step, boxed, with Copy and an optional check line.
- **Input bar (bottom):** text field, camera slot (disabled until photo input, #43), math keypad button, "Just a hint", "Solve". Above the field, "Read as" shows how the input was understood before solving.

### Phone

- Top bar: menu (history drawer), logo, new problem.
- Steps run edge to edge with thin dividers.
- While reading, the input is one slim bar ("Ask another problem"). Tapping it opens a focused input screen with the keypad.
- In step mode, "Next step" sits in a bar at the bottom in place of the input.
- All tap targets at least 44px.

### States

| State | What the student sees |
| --- | --- |
| Empty | Neo, "What are we solving?", example problems at three levels (Class 3, Class 10, College). |
| Typing | "Read as" preview, keypad. On phones, the focused input screen. |
| Thinking | Neo thinking, "Usually takes about 10 seconds", Cancel. If it takes long: "Still working on it". (Neo's thinking motion is designed in the separate motion step.) |
| Solved | The full solution. |
| One at a time | Steps reveal with "Next step"; the answer stays hidden until the last step, with "Show it now". |
| Hint | A hint card, then "Show the full solution" or "I'll try it". |
| Error | Specific and friendly, with what to do next. Rate limit shows a live countdown and "Try again"; the problem is never lost. |

Copy rules: short, plain words a class 3 student can read. No jargon ("invalid input"), no raw error codes.

## Typed blocks: how a solution is shown

A solution is no longer a flat list of steps. It is a list of typed blocks, and the frontend has one renderer per block type. The solver chooses block types from the problem, the method and the level.

| Block type | Used for | Renders as |
| --- | --- | --- |
| `equation` | Algebra, calculus, most steps | One or more aligned lines of LaTeX (KaTeX), scrolling sideways if too wide |
| `text` | Word problems, reasoning, proofs in prose | A sentence with inline math |
| `longDivision` | Primary division | The written layout: quotient on top, bracket, each subtraction under the digits it came from |
| `columnArithmetic` | Primary addition and subtraction | Digits in columns with carries or borrows |
| `statementReason` | Geometry proofs | Two-column rows: statement, reason |
| `table` | Statistics (mean, mode), data | A simple table |
| `figure` | Geometry | Later: a described figure, then a drawn one |
| `graph` | Functions, roots | Later: plotted with a library |

Unknown block types fall back to `text`, so an older app version never breaks on a newer solution.

## Solution data (new format)

```ts
type Level = "class1-5" | "class6-8" | "class9-10" | "class11-12" | "college" | "grad";

interface SolutionV2 {
  formatVersion: 2;
  header: {
    level: Level;               // until onboarding (#39) exists, the solver infers it from the problem
    board?: string;             // e.g. "CBSE"; from onboarding later
    questionType: string;       // e.g. "quadratic", "word-problem", "long-division"
    method: { id: string; label: string; alternatives: { id: string; label: string }[] };
  };
  problem: { latex?: string; text?: string; task: string };   // text for word problems
  sections?: { given?: string; toFind?: string; toProve?: string };  // class 9 and up, longer answers
  steps: {
    kind: "setup" | "formula" | "substitution" | "calculation" | "reasoning" | "conclusion" | "layout";
    reason: string;             // one line, shown as the step title
    why: string;                // longer explanation, shown on tap
    earnsMarks: boolean;
    block: Block;               // one of the typed blocks above
  }[];
  answer: { latex?: string; text?: string; sentence?: string; unit?: string; check?: string };
  hint?: string;                // for "Just a hint"
}
```

Display profile per level (frontend constant, later per board):

| Level | Sections | Arithmetic steps | Marks key |
| --- | --- | --- | --- |
| Class 1 to 5 | No | All, as visual blocks | No |
| Class 6 to 8 | No | Most | No |
| Class 9 to 12 | Given / To find for longer answers | Only where marks are given | Yes |
| College, grad | No | Skipped | No |

## Backend changes

1. **Prompt and schema:** the solver returns `SolutionV2`. A zod schema validates it; invalid output is retried once, then fails with a friendly error. The schema lives in one shared place for backend and tests.
2. **Storage:** add a nullable `content` jsonb column and `format_version` (default 1) to `solutions` (additive migration, ADR-0002 rules). New solutions store `SolutionV2` in `content`. Old rows keep `steps` and are shown through an adapter (each old step becomes an `equation` block). Nothing is rewritten.
3. **Remove fake verification:** drop the hard-coded `VERIFIED` status from new solutions.
4. **Method change:** `/api/solve` accepts an optional `method` id and re-solves with it; the solver must pick only methods allowed for the level.
5. **Hint:** use the existing `hint` mode; the response fills `hint`.

## Smaller items in this round

- History search: client-side filter over the loaded history.
- Delete with Undo: hide immediately, delete after a few seconds unless Undo is pressed.
- Copy answer.
- Previous / next problem.
- Fix: sign-up shows the real password rules up front (it rejected passwords without an uppercase letter while saying only "At least 8 characters").
- Fix: "5 FREE/DAY" label becomes "5 problems a minute" (the real limit).

## Not in this round

- Photo input (#43). The input keeps a disabled camera slot.
- Onboarding questions and level-aware prompts per board (#39). Until then the solver infers the level.
- An admin screen for reports (the report itself is built with the cache, since reports remove cached answers).
- Graph and figure blocks.
- Neo's thinking and loading motion (separate motion step).
- Free-model switch (#34) and child-privacy changes (#40) are separate tickets.

## Testing

- **Renderers:** unit tests per block type, including long-division digit alignment (each subtraction under the right digits) and the text fallback for unknown blocks.
- **Schema:** zod tests for valid and invalid solver output; the adapter turns old rows into blocks.
- **API:** HTTP tests with the fake solver returning `SolutionV2`, including `method` and `hint`.
- **Screens:** Playwright screenshots of every state, desktop and phone, light and dark, attached to the PR.

## Build order

1. Frontend page, states and block renderers, fed by the adapter from today's data (ships value before any backend change).
2. Backend: schema, prompt, storage column, method and hint.
3. Smaller items and fixes.

Each step is its own PR into `redesign`.

## Fast and safe solving (added 2026-10-09)

- **Instant answers:** plain arithmetic ("5 + 3", "156 ÷ 4") is solved in code, instantly, with exact column and long-division layouts. No AI call.
- **Shared cache:** the same problem (same level, method and prompt version) reuses a stored solution for every student. Nothing about the student is stored with it. A solution is only shared after two independent AI answers agree, and a "Something looks wrong?" report removes it from the cache at once.
- **Free limit:** instant answers and cache hits do not count toward the 5 free problems a day; only AI solves do.
- **Math only:** text that does not look like math is turned away before the AI; the AI also refuses non-math and ignores instructions inside a problem. The "unsolvable" filter stops rejecting valid problems that mention infinity.
- **Sign-up abuse:** Cloudflare Turnstile and a list of throwaway email domains. Per-IP limits sized for a classroom on one school network (20 sign-ups and 100 solves per hour).
- **Corrections to this spec:** the 5-a-day limit is real (the input shows "N of 5 free problems left today"); hint mode was never wired to the AI, so every solution now includes a hint and "Just a hint" needs no second request.

## Decided after review

- Exam style: the answer is the last step, a boxed "∴" conclusion with a sentence and units, as in the mockup (owner, 2026-10-09).
- Default conventions before onboarding exists: CBSE.
