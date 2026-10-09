# Solver Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chat-style solver with a solution page whose steps are typed blocks chosen by the problem and method, at every level from class 1 to grad.

**Architecture:** A `SolutionV2` shape (header, sections, typed steps, answer) is the one model the UI renders. The frontend ships first, fed by an adapter that turns today's flat steps into `SolutionV2`. Then the backend produces `SolutionV2` directly (validated with zod, stored in a new nullable `content` column), and the adapter remains only for old rows. Layout-heavy blocks (long division, column arithmetic) receive numbers, and the frontend computes the written layout, so the AI never has to place digits.

**Tech Stack:** React 19 + Vite + Tailwind v4 + zustand + KaTeX (frontend); Express 5 on Bun + zod + Drizzle/Neon + Vitest HTTP tests with the fake solver (backend). Bun only.

**Spec:** `docs/superpowers/specs/2026-10-09-solver-redesign-design.md` (read it with this plan; the approved mockup is `solver-v3.html` in the brainstorming companion).

## Global Constraints

- Branches: one branch per PR, each PR into `redesign`, never `main`. PR 1 = Tasks 1-7, PR 2 = Tasks 8-11, PR 3 = Tasks 12-15 (fast and safe solving), PR 4 = Task 16.
- Approved dependencies: `@marsidev/react-turnstile` (frontend, Task 15), `mathjs` (backend, Task 12, reused in Task 13).
- Owner decisions (2026-10-09): instant answers (arithmetic solved in code, cache hits) do not count toward the 5 free problems a day; the cache is shared between students (keyed only by problem, level, method and prompt version); Cloudflare Turnstile on sign-up (approved: one frontend package, `@marsidev/react-turnstile`); throwaway email domains blocked with a list kept in the repo (no npm package).
- Shared networks: a whole class can share one school IP. Per-IP limits must allow a classroom (sign-up 20 per hour once Turnstile is in; solving 100 per hour per IP).
- Every UI PR includes Playwright screenshots (desktop 1440×900 and phone 390×844, light and dark) via the `pr-assets` branch.
- Copy: short, plain words a class 3 student can read; no jargon, no raw error codes; no em dashes.
- No gradient text, no pill badges, no sparkle icons, no neon glow (brand rules, `docs/brand.md`).
- Tap targets at least 44px on phones; grey text at least 4.5:1 contrast (`text-gray-600` / `dark:text-gray-400` or darker).
- Marks: pink number = `earnsMarks: true`; grey number = working step; never show mark values. No marks key when the level's profile says so.
- The answer is the last step, a boxed conclusion with Copy; no answer box at the top; a "Jump to answer" link instead. In step mode the answer stays hidden until the last step ("Show it now").
- Remove every "Verified" badge and the hard-coded `VERIFIED` status from new solutions.
- KaTeX always with `throwOnError: false`; wide math scrolls sideways inside its block (`overflow-x-auto`), never widens the page.
- Unknown block types render as `text` (fallback), never crash.
- New dependencies: none expected. Ask the owner before adding any.

## Review Focus

1. **Old saved solutions** (stored before this change, flat `steps`, `status: "VERIFIED"`) opened from history: must render through the adapter with no "Verified" text. Test: Task 1 `toSolutionV2` cases, Task 7 history-open test.
2. **Malformed or partial AI output** (missing `answer`, unknown block `type`, invalid LaTeX): server retries once then returns a friendly 502 error; client renders unknown blocks as text and invalid LaTeX as plain text. Tests: Task 3 fallback and bad-LaTeX tests, Task 10 retry test.
3. **Long or wide content on a 390px phone** (word problems, 10-digit long division, long equations): no horizontal page scroll. Test: Task 3 `overflow-x-auto` class assertion and Task 7 Playwright check `document.documentElement.scrollWidth <= 390`.
4. **Long division with zeros and remainders** (412 ÷ 4 = 103, 1000 ÷ 8, 157 ÷ 4 r 1): digits stay under the right columns. Tests: Task 2.
5. **Limits while solving** (5 per minute with `retryAfter`, 5 per day): the problem text is kept, the countdown uses the server's `retryAfter`, and "Try again" enables at 0. Test: Task 5 error-state test.
6. **A classroom on one IP** (30 students signing up and solving from a school network): nobody is blocked by per-IP limits in normal use. Test: Task 15 (20 sign-ups and 100 solves from one IP succeed).

---

## PR 1: Solution page and typed blocks (frontend)

Branch: `feat/solver-page` from `redesign`.

### Task 1: Solution model, adapter and display profiles

**Files:**
- Create: `frontend/src/features/solver/model/solution.ts` (types)
- Create: `frontend/src/features/solver/model/adapter.ts`
- Create: `frontend/src/features/solver/model/displayProfile.ts`
- Test: `frontend/tests/solver-model.test.ts`

**Interfaces:**
- Produces (types, exported from `solution.ts`):
  ```ts
  export type Level = "class1-5" | "class6-8" | "class9-10" | "class11-12" | "college" | "grad";
  export type StepKind = "setup" | "formula" | "substitution" | "calculation" | "reasoning" | "conclusion" | "layout";
  export type Block =
    | { type: "equation"; latex: string }               // may contain \begin{aligned}
    | { type: "text"; text: string }                     // inline math as $...$
    | { type: "longDivision"; dividend: number; divisor: number }
    | { type: "columnArithmetic"; op: "+" | "-"; operands: number[] }
    | { type: "statementReason"; rows: { statement: string; reason: string }[] }
    | { type: "table"; headers: string[]; rows: string[][] };
  export interface SolutionStep { kind: StepKind; reason: string; why: string; earnsMarks: boolean; block: Block }
  export interface SolutionV2 {
    formatVersion: 2;
    id: string; createdAt: string;
    header: { level: Level; board?: string; questionType: string;
              method: { id: string; label: string; alternatives: { id: string; label: string }[] } };
    problem: { latex?: string; text?: string; task: string };
    sections?: { given?: string; toFind?: string; toProve?: string };
    steps: SolutionStep[];
    answer: { latex?: string; text?: string; sentence?: string; unit?: string; check?: string };
    hint?: string;
  }
  ```
- Produces: `toSolutionV2(old: Solution): SolutionV2` in `adapter.ts` (`Solution` from `stores/chatStore`).
- Produces: `DISPLAY_PROFILES: Record<Level, { sections: boolean; marksKey: boolean }>` and `profileFor(level: Level)` in `displayProfile.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("toSolutionV2", () => {
  it("turns each old step into an equation block, keeping reason and why", () => {
    const v2 = toSolutionV2(oldSolution); // fixture: 2 steps, status "VERIFIED", finalAnswer "x = 2"
    expect(v2.formatVersion).toBe(2);
    expect(v2.steps).toHaveLength(2);
    expect(v2.steps[1]).toMatchObject({ kind: "calculation", reason: "Divide both sides by 2",
      why: "Dividing both sides by 2 leaves x on its own.", earnsMarks: false,
      block: { type: "equation", latex: "x = 2" } });
    expect(v2.answer.latex).toBe("x = 2");
  });
  it("never carries a Verified status", () => {
    expect(JSON.stringify(toSolutionV2(oldSolution))).not.toMatch(/verified/i);
  });
  it("uses a neutral default header for old rows", () => {
    expect(toSolutionV2(oldSolution).header).toMatchObject({ level: "class9-10", questionType: "algebra",
      method: { id: "default", label: "", alternatives: [] } });
  });
});
describe("profileFor", () => {
  it("hides the marks key and sections for class 1-5 and college", () => {
    expect(profileFor("class1-5")).toEqual({ sections: false, marksKey: false });
    expect(profileFor("college")).toEqual({ sections: false, marksKey: false });
  });
  it("shows them for class 9-10", () => {
    expect(profileFor("class9-10")).toEqual({ sections: true, marksKey: true });
  });
});
```

- [ ] **Step 2: Run** `cd frontend && bunx vitest run tests/solver-model.test.ts` → FAIL (modules missing).
- [ ] **Step 3: Implement** the three files. Profiles from the spec table: class1-5 and class6-8 `{false,false}`, class9-10 and class11-12 `{true,true}`, college and grad `{false,false}`. Adapter: `problem.latex = old.problem`, `problem.task = ""`, `answer.latex = old.finalAnswer`, step `kind: "calculation"`, `earnsMarks: false`.
- [ ] **Step 4: Run** the same command → PASS.
- [ ] **Step 5: Commit** `feat(frontend): solution model with adapter for old solutions`.

### Task 2: Long-division and column-arithmetic layouts

**Files:**
- Create: `frontend/src/features/solver/layout/longDivision.ts`
- Create: `frontend/src/features/solver/layout/columnArithmetic.ts`
- Test: `frontend/tests/solver-layout.test.ts`

**Interfaces:**
- Produces: `layoutLongDivision(dividend: number, divisor: number): LongDivisionLayout`
  ```ts
  interface LongDivisionLayout {
    digits: string[];                  // dividend digits, one per column
    quotient: (string | null)[];       // same length as digits; null = blank (before the first quotient digit)
    rows: { value: string; endColumn: number; kind: "subtract" | "bringDown" | "remainder" }[];
    quotientValue: number; remainder: number;
  }
  ```
  `endColumn` = index in `digits` of the row's last digit (rows are right-aligned to it).
- Produces: `layoutColumnAddition(operands: number[]): { width: number; carries: (number | null)[]; rows: string[]; result: string }` and `layoutColumnSubtraction(a: number, b: number): { width: number; borrows: boolean[]; rows: string[]; result: string }` (all right-aligned, `width` = number of columns).

- [ ] **Step 1: Write the failing tests**

```ts
it("156 ÷ 4: quotient over 5 and 6, 12 under 15, 36 under 56", () => {
  const l = layoutLongDivision(156, 4);
  expect(l.quotient).toEqual([null, "3", "9"]);
  expect(l.rows).toEqual([
    { value: "12", endColumn: 1, kind: "subtract" },
    { value: "36", endColumn: 2, kind: "bringDown" },
    { value: "36", endColumn: 2, kind: "subtract" },
    { value: "0", endColumn: 2, kind: "remainder" },
  ]);
  expect([l.quotientValue, l.remainder]).toEqual([39, 0]);
});
it("412 ÷ 4 keeps the zero in the quotient", () => {
  const l = layoutLongDivision(412, 4);
  expect(l.quotient).toEqual(["1", "0", "3"]);
  expect(l.quotientValue).toBe(103);
});
it("157 ÷ 4 leaves remainder 1", () => {
  expect(layoutLongDivision(157, 4)).toMatchObject({ quotientValue: 39, remainder: 1 });
});
it("1000 ÷ 8 = 125", () => {
  expect(layoutLongDivision(1000, 8).quotient).toEqual([null, "1", "2", "5"]);
});
it("47 + 38 carries 1 into the tens", () => {
  expect(layoutColumnAddition([47, 38])).toEqual({ width: 2, carries: [1, null], rows: ["47", "38"], result: "85" });
});
it("52 − 17 borrows from the tens", () => {
  expect(layoutColumnSubtraction(52, 17)).toEqual({ width: 2, borrows: [true, false], rows: ["52", "17"], result: "35" });
});
```

(`carries[i]` / `borrows[i]` are per column, index 0 = leftmost.)

- [ ] **Step 2: Run** `bunx vitest run tests/solver-layout.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Long division, the algorithm the tests pin:

```text
current = 0; started = false
for i in 0..digits-1:
  current = current*10 + digit[i]
  if !started and current < divisor and i < last: quotient[i] = null; continue
  started = true
  q = floor(current / divisor); quotient[i] = str(q)
  if i > first column used: the previous loop already pushed a bringDown row for `current`
  push { value: str(q*divisor), endColumn: i, kind: "subtract" }
  current = current - q*divisor
  if i < last: push { value: str(current*10 + digit[i+1]), endColumn: i+1, kind: "bringDown" }
push { value: str(current), endColumn: last, kind: "remainder" }
```

Inputs must be non-negative integers with `divisor > 0`; throw `RangeError` otherwise.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(frontend): compute long-division and column layouts`.

### Task 3: Block renderers

**Files:**
- Modify: `frontend/vitest.config.ts` (include `tests/**/*.test.{ts,tsx}`)
- Create: `frontend/src/features/solver/blocks/{Math.tsx,EquationBlock.tsx,TextBlock.tsx,LongDivisionBlock.tsx,ColumnArithmeticBlock.tsx,StatementReasonBlock.tsx,TableBlock.tsx,BlockView.tsx}`
- Test: `frontend/tests/solver-blocks.test.tsx`

**Interfaces:**
- Consumes: `Block` (Task 1), layouts (Task 2).
- Produces: `<BlockView block={Block} />` (switch on `block.type`; unknown types render `<TextBlock>` with a JSON-free fallback text "This step could not be shown."). `<Math latex={string} display?: boolean />` renders KaTeX with `throwOnError: false` inside a wrapper with class `overflow-x-auto`.
- `TextBlock` renders `$...$` segments as inline `<Math>`, the rest as text (escape HTML).

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders an equation inside a sideways-scrolling wrapper", () => {
  const { container } = render(<BlockView block={{ type: "equation", latex: "x^2" }} />);
  expect(container.querySelector(".overflow-x-auto .katex")).toBeTruthy();
});
it("shows invalid LaTeX as text instead of crashing", () => {
  render(<BlockView block={{ type: "equation", latex: "\\frac{1" }} />);
  expect(document.body.textContent).toContain("frac");
});
it("falls back to text for an unknown block type", () => {
  render(<BlockView block={{ type: "graph" } as unknown as Block} />);
  expect(screen.getByText("This step could not be shown.")).toBeTruthy();
});
it("draws 156 ÷ 4 with 12 under 15", () => {
  const { container } = render(<BlockView block={{ type: "longDivision", dividend: 156, divisor: 4 }} />);
  const cell = container.querySelector('[data-row="0"][data-col="1"]');   // last digit of 12 under the 5
  expect(cell?.textContent).toBe("2");
});
it("renders statement and reason rows", () => {
  render(<BlockView block={{ type: "statementReason", rows: [{ statement: "AB = AC", reason: "Given" }] }} />);
  expect(screen.getByText("Given")).toBeTruthy();
});
it("renders inline math in text", () => {
  const { container } = render(<BlockView block={{ type: "text", text: "Let speed be $x$ km/h" }} />);
  expect(container.querySelectorAll(".katex")).toHaveLength(1);
});
```

- [ ] **Step 2: Run** `bunx vitest run tests/solver-blocks.test.tsx` → FAIL.
- [ ] **Step 3: Implement** each block. `LongDivisionBlock` is a CSS grid with one column for the divisor and one per digit; every cell carries `data-row` / `data-col`; subtract rows get a bottom border across their digits; quotient row has the vinculum, the dividend row the bracket (as in `solver-v3.html`, class `.ldg`). `ColumnArithmeticBlock` shows carries/borrows as small digits above the columns.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(frontend): renderers for each solution block type`.

### Task 4: Solution view (steps, marks, answer, step mode)

**Files:**
- Create: `frontend/src/features/solver/SolutionView.tsx`, `StepItem.tsx`, `AnswerStep.tsx`, `ProblemHeader.tsx`
- Test: `frontend/tests/solution-view.test.tsx`

**Interfaces:**
- Consumes: `SolutionV2`, `profileFor`, `BlockView`.
- Produces: `<SolutionView solution={SolutionV2} mode={"all" | "one"} onModeChange={(m) => void} />`. In `one` mode it owns `revealed` (starts at 1) and renders a "Next step" button (desktop inline; phone uses Task 6's bar via `onNextStep`, see prop `renderNextStep?: (next: () => void, shown: number, total: number) => ReactNode`).
- Produces: `<ProblemHeader solution={SolutionV2} onEdit={() => void} onNew={() => void} />` with level label, problem (latex or text), task line, "Jump to answer" anchor to `#answer`.

- [ ] **Step 1: Write the failing tests**

```tsx
it("numbers mark-earning steps pink and working steps grey", () => {
  render(<SolutionView solution={quadratic} mode="all" onModeChange={() => {}} />); // fixture from solver-v3 "quad"
  expect(screen.getByTestId("step-num-1").dataset.marks).toBe("false");
  expect(screen.getByTestId("step-num-2").dataset.marks).toBe("true");
  expect(screen.getByText("Pink numbers are the steps that earn marks in exams.")).toBeTruthy();
});
it("hides the marks key for class 1-5", () => {
  render(<SolutionView solution={division156} mode="all" onModeChange={() => {}} />);
  expect(screen.queryByText(/earn marks/)).toBeNull();
});
it("puts the answer last with Copy, and no answer above the steps", () => {
  render(<SolutionView solution={quadratic} mode="all" onModeChange={() => {}} />);
  const items = screen.getAllByTestId(/^(step|answer)$/);
  expect(items.at(-1)?.dataset.testid).toBe("answer");
  expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
});
it("in step mode reveals one step at a time and hides the answer", () => {
  render(<SolutionView solution={quadratic} mode="one" onModeChange={() => {}} />);
  expect(screen.getAllByTestId("step")).toHaveLength(1);
  expect(screen.getByText("The answer shows after the last step.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
  expect(screen.getAllByTestId("step")).toHaveLength(2);
});
it("toggles the longer why", () => {
  render(<SolutionView solution={quadratic} mode="all" onModeChange={() => {}} />);
  fireEvent.click(screen.getAllByRole("button", { name: /why/i })[0]);
  expect(screen.getByText(/product is 6/)).toBeTruthy();
});
it("shows the method with Change only when alternatives exist", () => { /* quadratic: "Method: Factorisation" + Change; division156: no Change */ });
it("shows Given / To find when the profile allows and sections exist", () => { /* trainProblem fixture */ });
```

Fixtures `quadratic`, `trainProblem`, `division156` live in `frontend/tests/fixtures/solutions.ts`, copied from the three examples in `solver-v3.html` (same steps, reasons, why texts, answers).

- [ ] **Step 2: Run** `bunx vitest run tests/solution-view.test.tsx` → FAIL.
- [ ] **Step 3: Implement** per the mockup: divider "N steps and the answer"; All / One at a time switch; step kind label (uppercase, small); copy uses `navigator.clipboard.writeText(answer.text ?? answer.latex)`; answer has `id="answer"`; "Why?" button label "Show" (≥ 640px) / "Tap to see" (phones) via Tailwind `hidden sm:inline` pairs.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(frontend): solution view with marks, step mode and answer-last`.

### Task 5: Page states (empty, thinking, hint, error)

**Files:**
- Create: `frontend/src/features/solver/states/{EmptyState.tsx,ThinkingState.tsx,HintCard.tsx,ErrorState.tsx}`
- Modify: `frontend/src/stores/chatStore.ts` (add `pendingProblem: string | null`, `solveError: { message: string; retryAfter?: number } | null`, `view: "all" | "one" | "hint"`)
- Test: `frontend/tests/solver-states.test.tsx`

**Interfaces:**
- Produces: `<EmptyState onPick={(problem: string) => void} />` with three examples: `{ label: "Class 3", problem: "156 ÷ 4" }`, `{ label: "Class 10", problem: "x^2 + 5x + 6 = 0" }`, `{ label: "College", problem: "\\int x e^x dx" }`, heading "What are we solving?", line "Type a problem below. Neo shows every step."
- Produces: `<ThinkingState onCancel={() => void} />` text "Neo is working through it…", sub "Usually takes about 10 seconds."; after 15 s the sub changes to "Still working on it. Tricky one!".
- Produces: `<HintCard hint={string} onShowSolution={() => void} onTryIt={() => void} />`.
- Produces: `<ErrorState message={string} retryAfter?={number} onRetry={() => void} />`; counts down from `retryAfter` (`m:ss`), "Try again" disabled until 0.

- [ ] **Step 1: Write the failing tests** (use `vi.useFakeTimers()`)

```tsx
it("counts down from the server's retryAfter and enables Try again at zero", () => {
  render(<ErrorState message="That's 5 problems in a minute." retryAfter={40} onRetry={retry} />);
  expect(screen.getByText("0:40")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
  act(() => vi.advanceTimersByTime(40_000));
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
});
it("changes the thinking text after 15 seconds", () => { /* advance 15_000, expect "Still working on it. Tricky one!" */ });
it("picks an example problem", () => { /* click "Class 10" card → onPick("x^2 + 5x + 6 = 0") */ });
```

- [ ] **Step 2: Run** `bunx vitest run tests/solver-states.test.tsx` → FAIL.
- [ ] **Step 3: Implement.** Map server errors to copy in `frontend/src/utils/errorMessages.ts` (existing): rate limit → "That's 5 problems in a minute." + retryAfter; daily limit → "You've used today's 5 free problems. Come back tomorrow."; unsolvable → "I couldn't read that problem. Try writing it like x^2 + 5x + 6 = 0."; network → "No internet. Your problem is still here."
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(frontend): solver empty, thinking, hint and error states`.

### Task 6: Input bar (Read as, keypad, hint, phone modes)

**Files:**
- Create: `frontend/src/features/solver/composer/{Composer.tsx,ReadAs.tsx,Keypad.tsx,SlimComposer.tsx}`
- Test: `frontend/tests/composer.test.tsx`

**Interfaces:**
- Consumes: existing `cleanExpression` / LaTeX conversion in `frontend/src/utils/latexUtils.ts` for the Read-as preview (reuse whatever `MathInputPreview.tsx` uses today).
- Produces: `<Composer value onChange onSolve={(problem: string, view: "all" | "hint") => void} disabled? />`: field, disabled camera button (`title="Photo input is coming soon"`, `aria-disabled="true"`), keypad toggle, "Just a hint", "Solve"; Enter solves, Shift+Enter new line; helper line from `dailyCredits.remaining`: "N of 5 free problems left today".
- Produces: `<SlimComposer onOpen={() => void} />` ("Ask another problem" + New) for phones while reading.

- [ ] **Step 1: Write the failing tests**

```tsx
it("shows how the input was read before solving", () => { /* type "x^2+5x+6=0" → ReadAs contains a .katex */ });
it("solves on Enter and adds a line on Shift+Enter", () => { /* onSolve called once with ("x^2+5x+6=0","all") */ });
it("asks for a hint with Just a hint", () => { /* onSolve(problem, "hint") */ });
it("inserts a keypad symbol at the cursor", () => { /* open keypad, click "√" → value contains "√" */ });
it("keeps the camera button disabled", () => { /* aria-disabled="true" */ });
it("shows today's remaining free problems", () => { /* remaining=3 → "3 of 5 free problems left today" */ });
```

- [ ] **Step 2: Run** `bunx vitest run tests/composer.test.tsx` → FAIL.
- [ ] **Step 3: Implement.** Keypad symbols: `x² √ π ÷ × ( ) ∫ θ ≤ ≥`. All buttons `min-h-11` on phones.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(frontend): solver input bar with read-as preview and keypad`.

### Task 7: Solver page, history sidebar, and wiring

**Files:**
- Create: `frontend/src/features/solver/SolverPage.tsx`, `frontend/src/features/solver/history/{HistorySidebar.tsx,groupByDate.ts,PrevNext.tsx}`
- Modify: `frontend/src/pages/AppLayout.tsx` (render `<SolverPage />` instead of `ChatWindow` + `AnswerPanel` + `PanelResizer`)
- Delete (after the page works): `ChatWindow.tsx`, `AnswerPanel.tsx`, `StepCard.tsx`, `PanelResizer.tsx`, `SidebarResizer.tsx` if no longer imported (check with `grep`)
- Test: `frontend/tests/solver-page.test.tsx`, `frontend/tests/history-group.test.ts`

**Interfaces:**
- Consumes: everything above; `useChatStore` (existing `loadHistory`, `fetchSolution`, `deleteChat`) and `solveProblem` from `services/solve.service.ts`; `toSolutionV2` for every solution until PR 2.
- Produces: `groupByDate(items: HistoryItem[], now: Date): { label: "Today" | "This week" | "Older"; items: HistoryItem[] }[]`.
- Delete with Undo: remove from the list at once, show toast "Problem deleted · Undo" for 5 s, call `deleteChat` only if not undone.

- [ ] **Step 1: Write the failing tests**

```ts
it("groups history into Today, This week and Older", () => { /* fixed now; 3 items → 3 groups in that order */ });
```
```tsx
it("filters history by search text", () => { /* type "sin" → only "Derivative of sin(x)" */ });
it("deletes with Undo and only calls the API if not undone", () => { /* fake timers; Undo before 5 s → deleteChat not called */ });
it("opens an old saved solution without any Verified text", () => { /* fetchSolution returns old shape → page shows steps, no /verified/i */ });
it("moves to the previous and next problem", () => { /* PrevNext arrows change the active solution; label "Problem 1 of 3" */ });
```

- [ ] **Step 2: Run** `bunx vitest run tests/history-group.test.ts tests/solver-page.test.tsx` → FAIL.
- [ ] **Step 3: Implement** the page: desktop grid (sidebar 260px + page, input pinned at bottom); phone: top bar (menu opens history drawer, logo, new), `SlimComposer` while a solution is shown, focused input screen while typing, "Next step" bottom bar in step mode.
- [ ] **Step 4: Run** the whole frontend suite: `bun run typecheck && bun run lint && bunx vitest run` → all pass.
- [ ] **Step 5: Screens.** With the local backend on the preview database (scratch launcher), take Playwright screenshots of every state (desktop and phone, light and dark) and assert `document.documentElement.scrollWidth <= 390` on phone pages. Look at each image; fix anything off before the PR.
- [ ] **Step 6: Commit, push, PR** into `redesign` with the screenshot table: `feat(frontend): solution page with typed blocks`.

---

## PR 2: Backend produces SolutionV2

Branch: `feat/solution-v2-backend` from `redesign` (after PR 1 merges).

### Task 8: Shared SolutionV2 schema

**Files:**
- Create: `backend/src/modules/solutions/solution-v2.schema.ts`
- Test: `backend/tests/unit/solution-v2-schema.test.ts`

**Interfaces:**
- Produces: `solutionV2Schema` (zod, matching Task 1's types exactly, minus `id`/`createdAt` which the server adds) and `type SolutionV2Content = z.infer<typeof solutionV2Schema>`. Block schema is a `z.discriminatedUnion("type", [...])` over the six block types; `longDivision` requires integers with `divisor > 0`.

- [ ] **Step 1: Write the failing tests:** accepts the three spec examples (copy Task 4 fixtures as JSON); rejects a step without `block`; rejects `longDivision` with `divisor: 0`; rejects `answer` with neither `latex` nor `text` (use `.refine`).
- [ ] **Step 2: Run** `cd backend && bunx vitest run tests/unit/solution-v2-schema.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(backend): SolutionV2 schema`.

### Task 9: Store and return the new format

**Files:**
- Modify: `backend/src/db/schema.ts` (`solutions`: add `content: jsonb("content").$type<SolutionV2Content>()` nullable, `formatVersion: integer("format_version").notNull().default(1)`)
- Create: migration via `bun run db:generate` (expect `backend/drizzle/0005_*.sql` with two `ALTER TABLE ... ADD COLUMN`; review it, additive only)
- Modify: `backend/src/modules/solutions/solution.repository.ts` (`create` accepts optional `content`; reads return it), `backend/src/routes/solution.route.ts` and history route (include `content` and `formatVersion`)
- Test: `backend/tests/solutions.test.ts` (extend)

**Interfaces:**
- Produces: `GET /api/solutions/:id` (existing path in `routes/index.ts`) returns `{ ..., formatVersion, content }`; old rows return `formatVersion: 1, content: null`.

- [ ] **Step 1: Write the failing tests:** a solution saved with content returns it unchanged with `formatVersion: 2`; an old-style row returns `formatVersion: 1, content: null` and its `steps`.
- [ ] **Step 2: Run** `bunx vitest run tests/solutions.test.ts` → FAIL.
- [ ] **Step 3: Implement**; run `bun run db:generate`, read the SQL, apply to the test database through the existing test setup.
- [ ] **Step 4: Run** the backend suite: `bun run typecheck && bun run lint && bunx vitest run` → all pass.
- [ ] **Step 5: Commit** `feat(backend): store solutions in the new format`. (Applying the migration to Neon preview, then production, is done on purpose before deploy, as in `docs/deployment.md`; ask the owner first.)

### Task 10: Solver prompt, validation, method and hint

**Files:**
- Modify: `backend/src/modules/ai/math-solver.ts` (`solve(problem: string, options?: { method?: string }): Promise<SolveResult>`)
- Modify: `backend/src/services/ai/prompts.ts`, `backend/src/services/ai/ai.service.ts` (ask for `SolutionV2Content` JSON incl. `hint`; parse with `solutionV2Schema`; on failure retry once with the error appended; then throw `InvalidSolverOutputError`)
- Modify: `backend/src/routes/solve.route.ts` (accept `method?: string` (max 50); store `content`; respond `{ success, solution: { id, createdAt, formatVersion: 2, content } }`; map `InvalidSolverOutputError` to 502 "Neo got confused by this one. Please try again.")
- Modify: `backend/tests/support/fake-math-solver.ts` (return a valid `SolutionV2Content`; `FAKE_INVALID_OUTPUT` marker makes the first call invalid)
- Test: `backend/tests/solve.test.ts` (extend)

**Interfaces:**
- Produces: `type SolveResult = { content: SolutionV2Content; problemType: string; processingTimeMs: number; tokenUsage?: {...} }`.
- Prompt must state: answer last, as a conclusion sentence with units; pick block types by problem and method (`longDivision` / `columnArithmetic` for class 1-5 arithmetic, `statementReason` for proofs, `text` for word-problem reasoning, `equation` otherwise); `earnsMarks` only on setup, formula, substitution, key calculation and conclusion steps (never claim mark values); use only methods taught at the inferred level; default to CBSE conventions; include a one-sentence `hint`; no "verified" claims.

- [ ] **Step 1: Write the failing tests:** solve returns `formatVersion: 2` and content that passes `solutionV2Schema`; `method: "quadratic-formula"` is passed to the solver (fake echoes it into `header.method.id`); `FAKE_INVALID_OUTPUT` succeeds after one retry; two invalid outputs → 502 with the friendly message; daily and per-minute limits still apply (existing tests stay green).
- [ ] **Step 2: Run** `bunx vitest run tests/solve.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Remove `status: "VERIFIED"` from new results.
- [ ] **Step 4: Run** the backend suite → all pass. Then one real solve of each spec example against the local backend (testing key) and check the output by eye.
- [ ] **Step 5: Commit** `feat(backend): solver returns typed blocks with method and hint`.

### Task 11: Frontend reads SolutionV2

**Files:**
- Modify: `frontend/src/services/solve.service.ts`, `frontend/src/services/history.service.ts`, `frontend/src/stores/chatStore.ts` (store `SolutionV2`; use `content` when `formatVersion === 2`, else `toSolutionV2`)
- Modify: `frontend/src/features/solver/SolverPage.tsx` (method "Change" calls solve with `method`; "Just a hint" shows `HintCard` from `content.hint` without a second request)
- Test: `frontend/tests/solver-page.test.tsx` (extend)

- [ ] **Step 1: Write the failing tests:** a v2 response renders its blocks directly (long division grid present for `division156`); a v1 history item still renders via the adapter; "Change" → picks "Quadratic formula" → `solveProblem` called with `method: "quadratic-formula"`; hint view shows the hint, "Show the full solution" reveals steps with no extra request.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** frontend suite → pass; Playwright screens of the three examples from real solves.
- [ ] **Step 5: Commit, push, PR** into `redesign` (backend + frontend, with screenshots): `feat: solver returns and shows typed blocks`.

---

## PR 3: Fast and safe solving

Branch: `feat/fast-safe-solving` from `redesign` (after PR 2 merges).

### Task 12: Instant answers for plain arithmetic

**Files:**
- Create: `backend/src/modules/solver/instant/arithmetic.ts`
- Modify: `backend/src/routes/solve.route.ts` (try instant first; skip the AI and the daily credit when it answers; the per-minute limit still applies)
- Test: `backend/tests/unit/instant-arithmetic.test.ts`, `backend/tests/solve.test.ts` (extend)

**Interfaces:**
- Produces: `trySolveArithmetic(problem: string): SolutionV2Content | null`. Returns `null` for anything that is not pure arithmetic (any letter other than a recognised phrase, `=`, more than 12 digits per number).
- Accepts: integers and decimals; `+ - × x(between numbers) * ÷ / ( )`; the phrases "divide A by B", "add A and B", "A plus/minus/times B".
- Output: `header.level = "class1-5"`, `method = { id: "arithmetic", label: "Arithmetic", alternatives: [] }`. One operation per step in BODMAS order. Blocks: integer `a + b` (2+ digits) → `columnArithmetic` "+"; integer `a - b` with `a >= b` → `columnArithmetic` "-"; integer `a ÷ b` with `a >= 10`, `b <= 99` → `longDivision`; otherwise `equation`. Answer `{ latex, sentence }`, e.g. "Quotient = 39, remainder = 0". Never use `eval`, `Function` or `mathjs.evaluate`. Parse with `mathjs.parse` (owner decision 2026-10-09: mathjs replaces a hand-written tokenizer; `cd backend && bun add mathjs` happens here, Task 13 reuses it) after rewriting the phrases and `×`/`÷`/`x` to `* /`. Accept only trees made of `ConstantNode`, `ParenthesisNode` and `OperatorNode` with `+ - * /` (unary minus allowed); any `SymbolNode`, `FunctionNode`, `AssignmentNode` or other node → `null`. Walk the tree bottom-up, one step per operator, and compute with mathjs `BigNumber` (or `Fraction` for `/` when exact) so `0.1 + 0.2` gives `0.3`, not `0.30000000000000004`.
- Response adds `source: "instant"`.

- [ ] **Step 1: Write the failing tests:** `trySolveArithmetic("5+3")` → one `equation` step, answer "8"; `"47 + 38"` → `columnArithmetic`; `"156 ÷ 4"` and `"Divide 156 by 4"` → `longDivision`, sentence "Quotient = 39, remainder = 0"; `"2 + 3 × 4"` → steps `3 × 4 = 12` then `2 + 12 = 14`; `"x + 3 = 5"` → `null`; `"sqrt(16)"` and `"a = 5"` → `null`; `"0.1 + 0.2"` → answer "0.3"; `"7 ÷ 0"` → throws `UnsolvableProblemError` with "You can't divide by zero."; HTTP: solving "5+3" returns in under 300 ms, the fake solver is not called, and `/api/profile` `dailyCredits.used` stays 0.
- [ ] **Step 2: Run** `cd backend && bunx vitest run tests/unit/instant-arithmetic.test.ts tests/solve.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(backend): answer plain arithmetic instantly without the AI`.

### Task 13: Shared solution cache

**Files:**
- Modify: `backend/src/db/schema.ts` (new table `solution_cache`: `key text primary key`, `content jsonb not null`, `problem_type text not null`, `hits integer not null default 0`, `created_at timestamptz default now()`), migration via `bun run db:generate` (additive)
- Create: `backend/src/modules/solver/cache/solution-cache.ts`, `backend/src/modules/solver/verify/verify-answer.ts` (+ `backend/tests/unit/verify-answer.test.ts`); mathjs is already added in Task 12
- Modify: `backend/src/routes/solve.route.ts`, `backend/src/services/ai/prompts.ts` (export `PROMPT_VERSION = "2026-10-09.1"`)
- Test: `backend/tests/solution-cache.test.ts`

**Interfaces:**
- Produces: `cacheKey(problem: string, level: string | undefined, method: string | undefined): string` = sha256 of `PROMPT_VERSION + "|" + normalize(problem) + "|" + (level ?? "") + "|" + (method ?? "")`; `normalize` trims, collapses whitespace and unifies the minus sign (`−` → `-`) only, never touching letters. `solutionCache.get(key)`, `solutionCache.put(key, content, problemType)`.
- Order in the route: validate → per-minute limit → instant (Task 12) → cache → daily credit → AI → cache put. A cache hit still saves a `solutions` row for the student's history and does not use a daily credit. Nothing about the student is stored in `solution_cache`.
- **Safeguard against spreading a wrong answer (owner decisions, 2026-10-09):** a cache entry is only served (`status = 'shared'`) once its answer passed an independent check; otherwise it stays `status = 'unchecked'` and is never served. Independent check, in order:
  1. **Code check** with `mathjs` (approved dependency, backend only), in `backend/src/modules/solver/verify/verify-answer.ts`, `verifyAnswer(problem: string, content: SolutionV2Content): "passed" | "failed" | "unchecked"`: equations in one variable → substitute each root (both sides equal within 1e-9 relative); plain arithmetic → recompute; derivatives → compare to a central-difference slope at 3 points; definite integrals → numeric integration (Simpson, 1000 intervals); indefinite integrals → differentiate the answer numerically and compare with the integrand at 3 points. Anything else → "unchecked". Never use `eval`; parse with `mathjs.parse` and evaluate with a fixed scope.
  2. **Different-model check** when the code check is "unchecked": ask the fallback model from a different vendor (OpenRouter, see #34) for the final answer only; share if the normalised answers match.
  3. Otherwise never shared: each student gets their own fresh solve.
  Columns: `status text not null default 'unchecked'`, `check_method text` ('code' | 'second-model' | null). A "failed" code check also logs the solution for the admin (existing error log) and is not shared.
- **Honest label:** when `verifyAnswer` returns "passed", the response sets `content.answer.check` to "Checked by putting the answer back in." (or "Checked by recomputing." for arithmetic). Nothing else ever claims a check.
- **Reports evict:** `POST /api/solutions/:id/report` (requireUser; body `{ reason?: string }`, max 500 chars) stores a row in a new `solution_reports` table (`id`, `solution_id`, `user_id`, `reason`, `created_at`) and sets the matching cache entry to `status = 'blocked'` (never served, never re-shared until the prompt version changes). The frontend "Something looks wrong? Tell us" link calls it and shows "Thanks. We'll check it."

- [ ] **Step 1: Write the failing tests:** `verifyAnswer` passes x = -2 or x = -3 for x^2 + 5x + 6 = 0 and fails x = 2; passes d/dx sin(x) = cos(x) and fails = -cos(x); passes the definite integral of x^2 from 0 to 1 = 1/3; returns "unchecked" for a geometry proof. HTTP: a code-checked solve becomes shared and a second student gets it with no AI call and `dailyCredits.used` 0; a failed check is not shared; an unchecked problem calls the second model (fake) and is shared only when it agrees; reporting a solution blocks its entry and the next student gets a fresh AI solve; the same problem with a different `method` → a new AI call; changing `PROMPT_VERSION` → a new AI call; the cache row has no user id column.
- [ ] **Step 2: Run** `bunx vitest run tests/solution-cache.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the backend suite → PASS.
- [ ] **Step 5: Commit** `feat(backend): share confirmed solutions between students, and let reports remove them`.

### Task 14: Math-only guard, prompt hardening and the unsolvable filter

**Files:**
- Modify: `backend/src/services/ai/ai.service.ts` (remove the `infinity`, `undefined` and `no solution` patterns from `UNSOLVABLE_PATTERNS`; keep only literal division by zero), `backend/src/services/ai/prompts.ts`
- Create: `backend/src/modules/solver/guard/looks-like-math.ts`
- Modify: `backend/src/modules/solutions/solution-v2.schema.ts` (the AI may return `{ "notMath": true }` instead of a solution)
- Test: `backend/tests/unit/looks-like-math.test.ts`, `backend/tests/solve.test.ts` (extend)

**Interfaces:**
- Produces: `looksLikeMath(problem: string): boolean`: true if the text has a digit, a math symbol (`+ - × ÷ * / = ^ √ ∫ π θ < > ≤ ≥`), or a math word (solve, simplify, factor, factorise, integrate, differentiate, derivative, limit, area, volume, probability, mean, prove, equation, fraction, percent, find).
- Route: `looksLikeMath` false → 422 "That doesn't look like a math problem. Try something like x^2 + 5x + 6 = 0." (no AI call, no credit). AI returns `notMath` → same 422; the credit is used, since the AI was called.
- Prompt: the student's text goes inside clearly marked delimiters and is described as data, never instructions; the model must answer only math problems and return `{"notMath": true}` for anything else, and must ignore instructions inside the problem.

- [ ] **Step 1: Write the failing tests:** `looksLikeMath("write my essay about dogs")` → false; `looksLikeMath("Find the area of a circle of radius 7 cm")` → true; HTTP: "write my essay" → 422 with the message and the fake solver not called; "limit as x approaches infinity of 1/x" now reaches the solver (no `UnsolvableProblemError`); fake solver marker `FAKE_NOT_MATH` → 422.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the backend suite → PASS.
- [ ] **Step 5: Commit** `fix(backend): only solve math, and stop rejecting valid limit problems`.

### Task 15: Sign-up and per-IP abuse limits

**Files:**
- Create: `backend/src/modules/auth/disposable-domains.txt` (from the open `disposable-email-domains` list, CC0; note the source and date at the top), `backend/src/modules/auth/disposable-email.ts`, `backend/src/modules/auth/turnstile.ts`
- Modify: `backend/src/routes/auth/register.route.ts`, `backend/src/routes/index.ts` (register limit 5 → 20 per hour; add `limitByIp("solve", 100, 60 * 60)` before the solve route), `backend/.env.example` (`TURNSTILE_SECRET_KEY`), `frontend/.env.example` (`VITE_TURNSTILE_SITE_KEY`), `frontend/src/pages/Register.tsx` (Turnstile widget, `@marsidev/react-turnstile`)
- Test: `backend/tests/auth-register.test.ts`, `backend/tests/rate-limits.test.ts` (extend)

**Interfaces:**
- Produces: `isDisposableEmail(email: string): boolean`; `verifyTurnstile(token: string, ip: string): Promise<boolean>` (POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify`).
- Register: disposable → 400 "Please use a school or personal email address."; Turnstile failure → 400 "Please confirm you're not a robot and try again." Tests use Cloudflare's published test secrets (always-pass `1x0000000000000000000000000000000AA`, always-fail `2x0000000000000000000000000000000AA`) through the env.
- Owner action before deploy: create the free Cloudflare Turnstile site and put the keys in Vercel (never in chat).

- [ ] **Step 1: Write the failing tests:** `user@mailinator.com` → 400 with the message; failing Turnstile secret → 400; passing secret → 201; 20 registrations from one IP in an hour succeed and the 21st gets 429; 100 solves from one IP across several accounts succeed (per-minute and daily limits set high in the test), the 101st gets 429.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Install** `cd frontend && bun add @marsidev/react-turnstile` (approved). **Implement.**
- [ ] **Step 4: Run** both suites → PASS. Playwright screenshot of the sign-up page with the widget.
- [ ] **Step 5: Commit, push, PR 3** into `redesign` with screenshots: `feat: fast answers, shared cache and abuse guards`.

---

## PR 4: Small fixes

Branch: `fix/solver-polish` from `redesign`.

### Task 16: Password rules on sign-up

**Files:**
- Modify: `frontend/src/pages/Register.tsx`
- Test: `frontend/tests/register.test.tsx`

**Interfaces:**
- Consumes: the backend's password rules (read them in `backend/src/routes/auth/register.route.ts` and mirror the same list; at least 8 characters and one uppercase letter, plus any others defined there).

- [ ] **Step 1: Write the failing test:** the password field shows the rules under it before submitting (e.g. "At least 8 characters, with one capital letter"), and each rule turns to done as the user types a matching password.
- [ ] **Step 2: Run** `bunx vitest run tests/register.test.tsx` → FAIL.
- [ ] **Step 3: Implement** with the rules as one exported constant used by both the hint text and the check.
- [ ] **Step 4: Run** frontend suite → pass.
- [ ] **Step 5: Commit, push, PR** with screenshots: `fix(frontend): show password rules before sign-up`.

---

## Spec corrections (do in PR 1, Task 1 commit)

Update `docs/superpowers/specs/2026-10-09-solver-redesign-design.md`:
- "5 FREE/DAY" is correct (there is a daily limit of 5 as well as 5 per minute). Replace that fix with: the helper line reads "N of 5 free problems left today".
- Hint mode: the backend accepts `mode: "hint"` but never uses it. The plan returns a `hint` with every solution instead, so "Just a hint" needs no second request.
