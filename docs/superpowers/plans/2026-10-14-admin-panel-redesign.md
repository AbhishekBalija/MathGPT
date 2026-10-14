# Admin Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin` so the owner knows in 5 seconds whether anything is
wrong, can hand any problem to Claude in one paste, and can see how the
business is doing.

**Architecture:**
- **PR 1 (backend):** the backend first starts saving what the admin screens
  need: solve source, model, prompt version, real error codes, failure details
  and longer problem text.
- **PRs 2 to 7:** each adds one admin endpoint group, plus the React screens
  that use it, inside a new admin shell.
- **Alerts:** event-driven from real solves, because Vercel Hobby only allows
  one cron run a day.

**Tech Stack:**
- Backend: Express 5 on Bun, Drizzle + Postgres (Neon), zod
- Frontend: React + Vite + Tailwind, lucide-react
- Tests: Vitest. Backend tests go through HTTP to the real app with fake AI and
  email; frontend tests render components with mocked services.

**Spec:** `docs/superpowers/specs/2026-10-14-admin-panel-redesign-design.md`.
Approved mockups are in `.superpowers/brainstorm/71784-1791999973/content/*-v4.html`.

**Before starting:** merge #94 (admin login redirect), #95 (Reports) and #97
(Feedback). This plan builds on their routes and pages. Each numbered PR
below is its own branch from `main` and its own PR. Run
`bun run typecheck && bun run lint && bun run test` in each package you touch
before committing.

## Global Constraints

- **Code:**
  - Bun only (`bun add`, `bun run`, `bunx`), never npm.
  - TypeScript strict, no `any`.
  - zod for request validation.
  - Drizzle for every query. Only repositories import `db` (ADR-0004).
- **Migrations:** only add things.
  - The owner applies them to Neon preview, then production, before merging.
    `vercel-build` fails while a migration is missing.
  - Generate with `bun run db:generate --name <name>`.
- **Every number is real data.** A value we cannot measure is left out, never
  faked.
- **Team accounts** (`users.is_admin` OR `users.is_team`) are left out of every
  business number unless `includeTeam=true`.
- **"Today", days and weeks** are Asia/Kolkata (IST); the server runs in UTC.
  Weeks start on Monday.
- **Copy for Claude and the health report** never contain a student's email or
  name.
- **Colours** (contrast checked):
  - small grey text: `#8b93a1` dark, `#6b7280` light
  - status green: `#34d399` dark, `#047857` light
  - status red: `#f87171` dark, `#dc2626` light
  - status amber: `#fbbf24` dark, `#b45309` light
- **Dates:** today shows only the time (`22:49`). Other days show
  `10 Oct, 22:07`.
- **Sizes and motion:** phone tap targets are at least 44px (`min-h-11`). No
  motion besides hover and press states.
- **Copy:** plain words, no em dashes.
- **Each PR:**
  - updates `docs/api-reference.md` for new or changed endpoints
  - updates `.env.example` for new env vars
  - adds new domain terms to `CONTEXT.md`
  - carries light and dark, laptop and phone screenshots (Playwright) if it
    changes UI

## Review Focus

1. **Empty data** (no solves today, no reports, no team): every screen shows 0
   or an empty state. Percentages with a 0 denominator are `0`, never
   `null`/`NaN`.
   Tests: Task 7 Step 1 (`emptyRate`), Task 8 Step 1, Task 14 Step 1.
2. **IST day boundaries:** a solve at 00:30 IST (19:00 UTC the day before)
   counts for the IST day.
   Test: Task 7 Step 1 (`counts a solve at 00:30 IST on the IST day`).
3. **Very long problems** (2,000 characters, newlines, LaTeX): list rows clamp
   to 2 lines, details show all of it, and Copy for Claude keeps it whole.
   Tests: Task 3 Step 1, Task 13 Step 1.
4. **A health check that hangs:** that one row is down with "timed out after
   3 s", and the endpoint still answers 200 in under 4 s.
   Test: Task 9 Step 1.
5. **Deleted students:** error logs whose student was deleted show "Deleted
   account". Nothing crashes, and Copy for Claude still works.
   Test: Task 11 Step 1.

---

## PR 1: The data the admin needs (`feat/solve-admin-data`)

### Task 1: Real error codes

**Files:**
- Create: `backend/src/modules/solver/error-code.ts`
- Modify: `backend/src/services/ai/failover.ts:21-29` (`AllModelsFailedError` gains `attempts`)
- Test: `backend/tests/unit/error-code.test.ts`

**Interfaces:**
- Produces:
  - `type SolveErrorCode = "AI_RATE_LIMITED" | "AI_TIMEOUT" | "AI_UNREACHABLE" | "ALL_MODELS_FAILED" | "UNKNOWN_ERROR"`
  - `errorCodeFor(error: unknown): SolveErrorCode`
  - `isProviderFailure(code: string): boolean`, which is true for the first
    four codes
  - `AllModelsFailedError.attempts: Array<{ label: string; reason: string }>`

- [ ] **Step 1: Write the failing tests**

```ts
it.each([
  [new AllModelsFailedError([{ label: "gemini-2.5-flash", reason: "[429 Too Many Requests] quota exceeded" }, { label: "backup", reason: "rate limit" }]), "AI_RATE_LIMITED"],
  [new AllModelsFailedError([{ label: "gemini-2.5-flash", reason: "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com" }, { label: "backup", reason: "fetch failed" }]), "AI_UNREACHABLE"],
  [new AllModelsFailedError([{ label: "gemini-2.5-flash", reason: "gemini-2.5-flash timed out after 30000ms" }, { label: "backup", reason: "timed out" }]), "AI_TIMEOUT"],
  [new AllModelsFailedError([{ label: "a", reason: "bad JSON" }, { label: "b", reason: "bad JSON" }]), "ALL_MODELS_FAILED"],
  [new ModelTimeoutError("gemini", 30000), "AI_TIMEOUT"],
  [new Error("All models failed"), "UNKNOWN_ERROR"],
  ["not an error", "UNKNOWN_ERROR"],
])("%s gives %s", (error, code) => expect(errorCodeFor(error)).toBe(code));
```

Order matters: a rate limit wins over "fetching", because Gemini's 429 errors
contain both.

- [ ] **Step 2: Run** `bun run test tests/unit/error-code.test.ts`. Expected: FAIL, the module does not exist yet.
- [ ] **Step 3: Implement.** `AllModelsFailedError` takes `attempts` and builds
  `reasons` from them (`"label: reason | label: reason"`, the same text as
  today). `runWithFailover` passes the two attempts. `errorCodeFor` checks the
  joined reasons with
  `/429|quota|rate.?limit|resource.?exhausted/i`, then `/timed out|timeout/i`,
  then `/fetch|ECONN|ENOTFOUND|network|socket/i`.
- [ ] **Step 4: Run** the unit test and `tests/unit` for failover. Expected: PASS.
- [ ] **Step 5: Commit** `feat(backend): real error codes for failed solves`.

### Task 2: Migration 0010

**Files:**
- Modify: `backend/src/db/schema.ts` (`errorLogs`, `users`, new `alertState`)
- Create: `backend/drizzle/0010_admin_redesign.sql`, generated with `bun run db:generate --name admin_redesign`

**Interfaces:**
- Produces:
  - `errorLogs.details: jsonb<ErrorDetails> | null`, where
    `ErrorDetails = { attempts: Array<{ model: string; error: string }>; promptVersion: string; fullMessage: string }`
  - `users.isTeam: boolean`, not null, default false
  - `alertState` table:
    - `kind` (text primary key)
    - `status` (`'ok' | 'failing'`, with a check constraint)
    - `recent` (jsonb `number[]` of failure times in ms, default `[]`)
    - `consecutive` (integer, default 0)
    - `changedAt` (timestamptz)
    - `lastSentAt` (timestamptz, nullable)

`recent` and `consecutive` are additions to the spec's column list. The
"3 in a row or 3 in 10 minutes" rule needs them.

- [ ] **Step 1:** Edit the schema and generate the migration. Check the SQL only adds a column or table.
- [ ] **Step 2: Run** `bun run test tests/health.test.ts`. Global setup applies every migration to the test database. Expected: PASS.
- [ ] **Step 3: Commit** `feat(backend): migration 0010 for admin details, team accounts and alerts`. Tell the owner to apply it to preview, then production.

### Task 3: Failed solves keep details and 2,000 characters

**Files:**
- Modify: `backend/src/routes/solve.route.ts`:
  - the five `problem.slice(0, 200)` calls become `logged(problem)`
  - line 503 uses `errorCodeFor`
- Modify: `backend/src/events/solution/handle-solve-error.ts` (`SolveErrorData.details?`)
- Modify: `backend/src/modules/analytics/analytics.repository.ts` (`recordError` stores `details`; `listErrors` returns it)
- Modify: `backend/src/modules/admin/admin-errors.route.ts` (adds `details` to the response)
- Test: `backend/tests/admin.test.ts` (new `describe("failed solve details")`)

**Interfaces:**
- Consumes: `errorCodeFor` (Task 1), `ErrorDetails` (Task 2), `PROMPT_VERSION` from `services/ai/prompts.ts`.
- Produces:
  - `MAX_LOGGED_PROBLEM = 2000`
  - `logged(problem: string): string`
  - `GET /admin/errors` items gain `details: ErrorDetails | null`

- [ ] **Step 1: Write the failing test**

```ts
it("keeps 2,000 characters of the problem, the real error code and the details", async () => {
  const { accessToken } = await registerVerifiedUser();
  const problem = `${FAKE_SOLVER_FAILURE} ${"∫ x sin x dx\n".repeat(300)}`; // over 3,000 chars, with newlines
  await authedFetch(accessToken, "/api/solve", { method: "POST", body: { problem } });

  const { errors } = await (await authedFetch(adminToken, "/admin/errors?limit=200")).json();
  const logged = errors.find((e: { problemText: string }) => e.problemText.startsWith(FAKE_SOLVER_FAILURE));
  expect(logged.problemText).toHaveLength(2000);
  expect(logged.problemText).toBe(problem.slice(0, 2000));
  expect(logged.errorCode).toBe("AI_TIMEOUT"); // FAKE_SOLVER_ERROR_MESSAGE is "The AI did not answer in time"
  expect(logged.details).toMatchObject({ promptVersion: PROMPT_VERSION, fullMessage: FAKE_SOLVER_ERROR_MESSAGE });
});
```

`"did not answer in time"` has to map to `AI_TIMEOUT`. Add `/in time/` to the
timeout pattern in Task 1, with its own unit case.

- [ ] **Step 2: Run** `bun run test tests/admin.test.ts`. Expected: FAIL, the text is cut at 200 and the code is "Error".
- [ ] **Step 3: Implement.** For `AllModelsFailedError`, `details.attempts`
  come from `error.attempts`. For other errors it is one attempt
  `{ model: "unknown", error: message }`.
- [ ] **Step 4: Run** the backend tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(backend): failed solves keep the full problem and what failed`.

### Task 4: Every solve records source, model and prompt version

**Files:**
- Modify: `backend/src/events/solution/track-analytics.ts` (`properties` gains `source: "ai" | "cache" | "instant"`, `model: string | null`, `promptVersion: string`)
- Modify: `backend/src/routes/solve.route.ts`:
  - the instant path (around line 140) and the cache path (around line 200)
    also send `solution_saved`. Today only the AI path does.
  - the AI path adds the new fields
- Test: `backend/tests/solve.test.ts`

**Interfaces:**
- Consumes: `FAKE_MODEL` from `tests/support/fake-math-solver.ts`.
- Produces: the `solution_saved` properties
  `{ problemType, stepsCount, processingTimeMs, source, model, promptVersion }`.
  The model is `null` for instant answers, and the cache entry's
  `checkedBy.primary` for cache answers.

- [ ] **Step 1: Write the failing test.** Solve `"156 ÷ 4"` (instant) and
  `uniqueProblem()` (AI). Then `GET /admin/analytics`. Expect the newest
  `solution_saved` events to include `{ source: "instant", model: null }` and
  `{ source: "ai", model: FAKE_MODEL, promptVersion: PROMPT_VERSION }`.
- [ ] **Step 2: Run.** Expected: FAIL, the instant solve records no event.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the backend tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(backend): every solve records its source, model and prompt version`. Open PR 1 with the migration note.

---

## PR 2: The admin shell (`feat/admin-shell`)

### Task 5: Nav counts endpoint, new layout and routes

**Files:**
- Create: `backend/src/modules/admin/counts.route.ts`
- Create: `backend/src/modules/admin/failed/failed.repository.ts` (grouping key and `countOpenGroups()`. Task 11 adds the list and details to this file)
- Modify: `backend/src/modules/admin/admin.router.ts`
- Create: `frontend/src/pages/Admin/AdminShell.tsx` (replaces `AdminLayout.tsx`, which is deleted)
- Create: `frontend/src/pages/Admin/AdminNav.tsx`
- Modify: `frontend/src/App.tsx` (admin routes)
- Modify: `frontend/src/services/admin.service.ts` (adds `getCounts`)
- Test: `backend/tests/admin.test.ts`, `frontend/tests/admin-shell.test.tsx`

**Interfaces:**
- Produces:
  - `GET /admin/counts` returns
    `{ failedOpen: number; reportsBlocked: number; feedbackOpen: number }`.
    `failedOpen` counts groups (same `userId` plus the same
    `normalize(problemText)`), not tries. The grouping lives in
    `failed.repository.ts` so Task 11 reuses it.
  - Routes:
    - `/admin` (Overview), `/admin/business`, `/admin/health`,
      `/admin/events`
    - `/admin/failed/:id?`, `/admin/reports/:id?`, `/admin/feedback/:id?`,
      `/admin/students/:id?`
    - Old paths redirect: `/admin/errors` → `/admin/failed`,
      `/admin/users` → `/admin/students`, `/admin/analytics` → `/admin/events`.
  - Until their own PR lands, each route renders the existing page inside the
    new shell.
  - `AdminNav` groups: Watch (Overview, Business, Health, Events), Handle
    (Failed solves, Reports, Feedback, with counts), People (Students). On
    phones it's a top row, with Handle first.

- [ ] **Step 1: Write the failing tests.**
  - Backend: two failed tries of the same problem by one student, plus one
    other failure, give `failedOpen` of at least 2. Assert by creating a
    fresh student and comparing before and after.
  - Frontend: the nav shows "Failed solves" with the count from `getCounts`.
    `/admin/errors` redirects to `/admin/failed`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** both packages' tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): new shell, grouped nav and item links`.

### Task 6: Shared admin pieces

**Files:**
- Create: `frontend/src/pages/Admin/shared/NeoStatus.tsx`
- Create: `frontend/src/pages/Admin/shared/DetailsPanel.tsx`
- Create: `frontend/src/pages/Admin/shared/ConfirmInline.tsx`
- Create: `frontend/src/pages/Admin/shared/useAutoRefresh.ts`
- Create: `frontend/src/pages/Admin/shared/formatAdminTime.ts`
- Test: `frontend/tests/admin-shared.test.tsx`

**Interfaces:**
- Produces:
  - `type NeoState = "fine" | "attention" | "down"`
  - `NeoStatus({ state, title, text }: { state: NeoState; title: string; text: string })`. The state labels are "All fine", "Needs you" and "Something is down".
  - `DetailsPanel({ onClose, children })`. It renders only when an item is
    selected: on the right on laptops, below the list on phones.
  - `ConfirmInline({ message, confirmLabel, onConfirm, onCancel })`
  - `useAutoRefresh<T>(load: () => Promise<T>, intervalMs = 60000): { data: T | null; error: string | null; updatedAt: Date | null; refresh: () => void }`.
    It pauses while `document.visibilityState === "hidden"` and refetches when
    the tab is shown again.
  - `formatAdminTime(date: Date, now = new Date()): string`, in IST
  - For Undo, reuse `useDeleteWithUndo` from
    `features/solver/history/useDeleteWithUndo.ts` as it is (its `commit(id)`
    is generic). Do not copy it.

- [ ] **Step 1: Write the failing tests.**
  - `formatAdminTime`:
    - `2026-10-14T17:19:00Z` with now `2026-10-14T18:00:00Z` gives `"22:49"`
    - `2026-10-10T16:37:00Z` gives `"10 Oct, 22:07"`
    - `2026-10-14T19:00:00Z` with now `2026-10-15T05:00:00Z` gives
      `"00:30"`, because it is the same IST day
  - `useAutoRefresh` (fake timers): it calls `load` once on mount, again after
    60 s, and not while hidden.
  - `NeoStatus` with `"down"` shows "Something is down".
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Use `Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", ... })`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): Neo status, details panel, confirm, auto-refresh and admin dates`. Take shell screenshots and open PR 2.

---

## PR 3: Overview and team accounts (`feat/admin-overview`)

### Task 7: `GET /admin/overview` and `PATCH /admin/users/:id/team`

**Files:**
- Create: `backend/src/modules/admin/overview/overview.repository.ts`
- Create: `backend/src/modules/admin/overview/overview.route.ts`
- Create: `backend/src/modules/admin/overview/ist.ts`
- Create: `backend/src/modules/admin/team.route.ts`
- Modify: `backend/src/modules/admin/admin.router.ts`
- Modify: `backend/src/lib/env.ts` (optional `AI_DAILY_LIMIT`)
- Test: `backend/tests/admin-overview.test.ts`, `backend/tests/unit/ist.test.ts`
- Modify: `backend/tests/support/time-travel.ts` (adds `moveSolutionTo(solutionId: string, utcIso: string)` and `moveEventsOf(userId: string, utcIso: string)`)

**Interfaces:**
- Consumes: the `solution_saved` properties (Task 4), `users.isTeam` (Task 2),
  `alertState` (Task 2).
- Produces:
  - `istDay(date: Date): string` returns `"2026-10-14"`
  - `istWeekStart(date: Date): string`
  - `geminiResetAt(now: Date): Date`: the next midnight America/Los_Angeles,
    which is 12:30 IST in summer
  - `emptyRate(part: number, whole: number): number`: `0` when `whole` is 0,
    otherwise rounded to a whole percent
  - `PATCH /admin/users/:id/team` with body `{ isTeam: boolean }` returns
    `{ id, isTeam }`. Admins are always team; `isTeam: false` on an admin is
    ignored.
  - `GET /admin/overview` returns:

```ts
{
  status: { state: "fine" | "attention" | "down"; failingSince: string | null };
  numbers: { solves: number; solvesToday: number; realStudents: number; teamStudents: number; activeThisWeek: number; failedTries: number; failedTries24h: number; tries24h: number };
  solvesPerDay: Array<{ day: string; count: number }>;   // the last 7 IST days, oldest first, with zeros
  aiUsage: { ai: number; backup: number; cache: number; instant: number; tokensToday: number; avgTokensPerSolve: number; limit: number | null; resetsAt: string };
  needsYou: Array<{ kind: "failed" | "report" | "feedback"; id: string; title: string; subtitle: string; at: string }>; // the newest 8
  funnel: { signedUp: number; verified: number; solved: number; cameBack: number };  // real students only
  topTopics: Array<{ problemType: string; count: number }>;                         // real students only
}
```

Rules:
- `status.state` is `"down"` when the `alertState` row `solving` is
  `failing`, otherwise `"attention"` if `needsYou` is not empty, otherwise
  `"fine"`.
- `backup` means `source === "ai"` with a model that is not the primary.
  The primary is the model of most AI solves today.
- `cameBack` means solved on 2 or more IST days.

- [ ] **Step 1: Write the failing tests.**
  - The admin-only check comes from the shared list in `admin.test.ts` (add
    both endpoints there).
  - "leaves team accounts out": a new student solves once. Then mark them
    team, and `realStudents` drops by 1 and `funnel.solved` drops by 1.
  - "counts a solve at 00:30 IST on the IST day": move a solve to
    `yesterday 19:00Z` and check that `solvesPerDay` for today's IST day
    includes it.
  - `ist.test.ts`:
    - `emptyRate(0, 0) === 0`
    - `emptyRate(2, 3) === 67`
    - `geminiResetAt(new Date("2026-10-14T18:00:00Z"))` is
      `"2026-10-15T07:00:00.000Z"`
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the repository with Drizzle `sql` for IST grouping (`date(created_at at time zone 'Asia/Kolkata')`).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): overview endpoint and team accounts`.

### Task 8: Overview page

**Files:**
- Create: `frontend/src/pages/Admin/Overview.tsx`, replacing `Dashboard.tsx` (deleted)
- Create: `frontend/src/pages/Admin/overview/` (`NumberTabs.tsx`, `HealthCard.tsx`, `AiUsageCard.tsx`, `NeedsYou.tsx`, `BusinessCard.tsx`)
- Create: `frontend/src/pages/Admin/overview/neoLine.ts`
- Modify: `frontend/src/services/admin.service.ts` (adds `getOverview`)
- Test: `frontend/tests/admin-overview.test.tsx`

**Interfaces:**
- Consumes: `getOverview`, `NeoStatus`, `useAutoRefresh`, `formatAdminTime`
  (Task 6), and `HealthCard`'s data from `getHealth` once Task 9 lands. Until
  then the card shows only `status`.
- Produces: `neoLine(overview): { title: string; text: string }`. Copy for each
  state:
  - fine: "Nothing needs you right now."
  - attention: "`n` thing(s) need a look."
  - down: "Solving is failing since `HH:MM`."

- [ ] **Step 1: Write the failing tests.**
  - An empty overview (all zeros, empty lists) renders "All fine" and "Nothing
    needs you right now", with no "NaN" anywhere in the text.
  - `needsYou` with one failed item shows it. Clicking it opens the details
    panel.
  - When `getHealth` fails, the Health card shows "Couldn't load this" with
    Retry, and the other cards still render. The Health card loads
    separately from `getOverview` for this reason.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to match `admin-overview-v4.html`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit, take screenshots** (light and dark, laptop and phone), and **open PR 3**. Add "Team account" to `CONTEXT.md`.

---

## PR 4: Health (`feat/admin-health`)

### Task 9: `GET /admin/health`

**Files:**
- Create: `backend/src/modules/admin/health/probes.ts` (the real Gemini and Resend probes)
- Create: `backend/src/modules/admin/health/health.service.ts`
- Create: `backend/src/modules/admin/health/health.route.ts`
- Create: `backend/src/db/migrations-journal.ts`
- Modify: `backend/scripts/check-migrations.ts` (imports `migrations-journal.ts`)
- Modify: `backend/src/create-app.ts` (`AppServices.healthProbes`)
- Modify: `backend/src/app.ts`
- Modify: `backend/tests/support/test-app.ts` (`fakeHealthProbes` with `setGemini("ok" | "fail" | "hang")`)
- Test: `backend/tests/admin-health.test.ts`

**Interfaces:**
- Produces:
  - `interface HealthProbes { gemini(): Promise<void>; email(): Promise<void> }`
  - `REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET", "GOOGLE_CLIENT_ID", "GEMINI_MATH_AI_API", "OPEN_ROUTER_API_KEY", "SENTRY_DSN", "TURNSTILE_SECRET_KEY", "RESEND_API", "FROM_EMAIL", "APP_URL"] as const`
  - `readJournal(): Array<{ tag: string; when: number }>`, which imports
    `drizzle/meta/_journal.json` so it is bundled
  - `GET /admin/health` returns:

```ts
{
  checkedAt: string;
  services: Array<{ id: "api" | "database" | "gemini" | "backup" | "email" | "turnstile" | "sentry"; status: "up" | "down" | "key_set" | "key_missing"; ms: number | null; detail: string | null }>;
  solving: { tries24h: number; failed24h: number; days: Array<{ day: string; tries: number; failed: number }>; byCode: Array<{ errorCode: string; count: number }> };
  speed: { avgMs: number; p90Ms: number };
  live: { backendCommit: string; migrations: { applied: number; latest: string; pending: string[] }; env: Array<{ name: (typeof REQUIRED_ENV)[number]; set: boolean }> };
}
```

Rules:
- Each probe runs in parallel inside `withTimeout(…, 3000, id)`, from
  `services/ai/failover.ts`. The database probe is `select 1`.
- Results are cached in memory for 60 s.
- `backendCommit` is `process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"`.

- [ ] **Step 1: Write the failing tests.**
  - All up: every service is `up` or `key_set`, and `migrations.pending`
    equals `[]`.
  - "a hanging check": `setGemini("hang")`. Gemini is `down` with a detail
    matching `/timed out after 3000ms/`. The response is 200, and it arrives
    in under 4,000 ms (measure it).
  - "never sends secret values": the response text does not contain
    `"test-access-secret"`.
  - The cache: two calls within 60 s run the probe once (the fake counts
    calls). Reset the cache between tests with `resetHealthCache()`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The Gemini probe: `GET https://generativelanguage.googleapis.com/v1beta/models?key=…`
    (listing models uses no quota).
  - The Resend probe: `GET https://api.resend.com/domains`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): live health checks`.

### Task 10: Health page and health report

**Files:**
- Create: `frontend/src/pages/Admin/Health.tsx`
- Create: `frontend/src/pages/Admin/health/runbooks.ts`
- Create: `frontend/src/pages/Admin/health/buildHealthReport.ts`
- Test: `frontend/tests/admin-health.test.tsx`

**Interfaces:**
- Consumes: `getHealth`, `NeoStatus`, `useAutoRefresh`.
- Produces:
  - `RUNBOOKS: Record<ServiceId, string>`, with the "If this is down" text
    copied from `admin-business-health-settings-v4.html`
  - `buildHealthReport(health, frontendCommit: string): string`. The frontend
    commit comes from `import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA ?? "local"`.

- [ ] **Step 1: Write the failing tests.**
  - The report lists every service, the 24h failures and the migrations.
  - It contains no `@`.
  - Opening the Gemini row shows its runbook.
  - Solving leads with "2 of 9 tries failed" for `tries24h: 9, failed24h: 2`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit, take screenshots, open PR 4.**

---

## PR 5: Handle screens (`feat/admin-handle-screens`)

### Task 11: Failed-solve groups and report and student details

**Files:**
- Modify: `backend/src/modules/admin/failed/failed.repository.ts` (from Task 5)
- Create: `backend/src/modules/admin/failed/failed.route.ts` (`GET /admin/failed`, `GET /admin/failed/:id`, `POST /admin/failed/:id/resolve`)
- Create: `backend/src/modules/admin/report-detail.route.ts` (`GET /admin/reports/:id`)
- Create: `backend/src/modules/admin/student-detail.route.ts` (`GET /admin/students/:id`)
- Test: `backend/tests/admin-failed.test.ts`, `backend/tests/admin-students.test.ts`

**Interfaces:**
- Consumes: `normalize` from `modules/solver/cache/solution-cache.ts`,
  `errorLogs.details` (Task 3).
- Produces:
  - `FailedGroup`:

```ts
{ id: string; problem: string; tries: number; firstAt: string; lastAt: string; errorCode: string; student: { id: string; name: string } | null; workedLater: boolean; resolved: boolean }
```

    - `id` is the newest error log id.
    - A group is the same `userId` plus the same `normalize(problemText)`.
    - `workedLater` is true when that student saved a solution of the same
      normalized problem after `lastAt`.
  - `GET /admin/failed?status=open|resolved|all` (default `open`) returns
    `{ groups: FailedGroup[]; problems: number; tries: number }`.
  - `GET /admin/failed/:id` returns `FailedGroup` plus
    `{ attempts: Array<{ at: string; ms: number | null; errorCode: string; details: ErrorDetails | null }> }`.
  - `POST /admin/failed/:id/resolve` resolves every log in the group and
    returns `{ resolved: number }`.
  - `GET /admin/reports/:id` returns the report plus
    `{ solution: SolutionV2Content | null; checkedByCode: boolean }`.
  - `GET /admin/students/:id` returns:

```ts
{ id; name; email; provider; joinedAt; isAdmin; isTeam; solves: number; failed: number; reports: number; usedToday: number; dailyLimit: 5; history: Array<{ kind: "solved" | "failed" | "reported" | "joined"; title: string; at: string }> }
```

    `history` holds the newest 20 items.

- [ ] **Step 1: Write the failing tests.**
  - Three failing tries of one problem form one group with `tries: 3`.
  - Then a successful solve of it makes `workedLater: true`.
  - "a deleted student": fail once, delete the student through
    `DELETE /admin/users/:id`. The group has `student: null`, and
    `GET /admin/failed/:id` still answers 200.
  - Resolving a group resolves all 3 tries.
  - The student detail counts match what the test created.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): failed-solve groups and report and student details`.

### Task 12: Copy for Claude

**Files:**
- Create: `frontend/src/pages/Admin/shared/buildClaudeNote.ts`
- Create: `frontend/src/pages/Admin/shared/CopyForClaude.tsx`
- Test: `frontend/tests/claude-note.test.ts`

**Interfaces:**
- Produces:
  - The input type:

```ts
type ClaudeNoteInput = {
  kind: "failed" | "report" | "feedback";
  id: string;
  adminPath: string;
  at: Date;
  ms: number | null;
  errorCode?: string;
  fullMessage?: string;
  attempts?: Array<{ model: string; error: string }>;
  promptVersion?: string;
  problem: string;
  answer?: string;
  checkedByCode?: boolean;
  message?: string;
};
```

  - `buildClaudeNote(input: ClaudeNoteInput, origin: string): string`
  - `CopyForClaude({ input })`: a button that copies the note, then shows
    "Copied".
  - Note format, one line each:
    - `## <Failed solve|Report|Feedback> <id first 8>`
    - `Link: <origin><adminPath>`
    - `When: <yyyy-mm-dd HH:mm> IST (<HH:mm> UTC)<, N ms>`
    - `Error: <code>` then `<full message>`
    - `Models: <model: error | …>`
    - `Prompt: <version>`
    - `Answer: …` and `Code check: agreed|did not check`, for reports
    - `Problem:` then the whole problem, indented two spaces
    - `Links:` with
      - `Sentry: https://sentry.io/issues/?query=<id>`
      - `Vercel: https://vercel.com/abhishek-an-83378fc9/neomath-api/logs?startDate=<at−2.5min ms>&endDate=<at+2.5min ms>`
  - It never takes an email or name; the input type has no field for them.

- [ ] **Step 1: Write the failing tests.**
  - The note has the IST and UTC times for `2026-10-14T17:19:00Z`
    (`22:49 IST (17:19 UTC)`).
  - A 2,000-character problem with newlines comes through whole.
  - The Vercel link window is 5 minutes wide.
  - The text matches no `/@/`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): Copy for Claude`.

### Task 13: Failed solves, Reports, Feedback, Students and Events pages

**Files:**
- Create: `frontend/src/pages/Admin/FailedSolves.tsx` (replaces `Errors.tsx`, deleted)
- Create: `frontend/src/pages/Admin/Students.tsx` (replaces `Users.tsx`, deleted)
- Create: `frontend/src/pages/Admin/Events.tsx` (replaces `Analytics.tsx`, deleted)
- Modify: `frontend/src/pages/Admin/Reports.tsx`, `Feedback.tsx` (from #95 and #97)
- Create: `frontend/src/pages/Admin/shared/ListDetail.tsx` (list on the left, `DetailsPanel` when `:id` is set, filters from the query)
- Test: `frontend/tests/admin-handle.test.tsx`

**Interfaces:**
- Consumes: Tasks 6, 11 and 12, plus `useDeleteWithUndo` for Mark resolved,
  Mark done and Mark as team.
- Produces: none new.

- [ ] **Step 1: Write the failing tests.**
  - Failed solves shows "5 problems · 7 tries" for `problems: 5, tries: 7`,
    and ×3 on a group with `tries: 3`.
  - The row tag is the error type, and the row says "worked on the next try"
    when `workedLater`.
  - A group with `student: null` shows "Deleted account".
  - A 2,000-character problem clamps to 2 lines in the row (it has the
    `line-clamp-2` class) and shows in full in the panel.
  - Mark resolved hides the row and calls the API only after 5 s (fake
    timers). Undo within 5 s calls nothing.
  - Unblock on Reports asks first ("Unblock and share this answer with
    everyone?") and calls `unblockReport` only after confirming.
  - Delete on Students asks first and names what goes.
  - Visiting `/admin/failed/<id>` opens that item's panel.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to match `admin-screens-v4.html`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit, take screenshots** of all five pages, **open PR 5**.

---

## PR 6: Business (`feat/admin-business`)

### Task 14: `GET /admin/business`

**Files:**
- Create: `backend/src/modules/admin/business/business.repository.ts`, `business.route.ts`
- Test: `backend/tests/admin-business.test.ts`

**Interfaces:**
- Consumes: `istDay`, `istWeekStart`, `emptyRate` (Task 7) and the team rule.
- Produces: `GET /admin/business?includeTeam=true|false` (default false)
  returns:

```ts
{
  numbers: { students: number; activeThisWeek: number; activeRate: number; solvesPerActive: number; limitHits: number };
  newPerDay: Array<{ day: string; count: number }>;                 // the last 7 IST days
  funnel: { signedUp: number; verified: number; solved: number; cameBack: number };
  cohorts: Array<{ weekStart: string; students: number; weeks: number[] }>; // up to 6 signup weeks, newest first; weeks[0] = 100
  cost: { tokensToday: number; avgTokensPerSolve: number };
  topics: Array<{ problemType: string; count: number }>;
  hiddenTeam: number;
}
```

Rules:
- `limitHits` counts student-days with at least `DAILY_FREE_LIMIT` (5)
  `solution_saved` events whose `source` is `ai` or `cache`.
- `weeks[n]` is the share of that cohort with a solve in week n, as a whole
  percent.

- [ ] **Step 1: Write the failing tests.**
  - The default leaves team accounts out (`hiddenTeam` is at least 1 after
    marking one).
  - `includeTeam=true` adds them back.
  - The newest cohort's `weeks[0]` is `100`.
  - A cohort with 0 students gives `weeks` of `[]`, never `NaN`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(admin): business numbers`.

### Task 15: Business page

**Files:**
- Create: `frontend/src/pages/Admin/Business.tsx`
- Test: `frontend/tests/admin-business.test.tsx`

- [ ] **Step 1: Write the failing tests.**
  - The "Include team accounts" checkbox refetches with `includeTeam: true`.
  - The cohort table marks the current week with `*`.
  - Zero students shows "No real students yet."
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to match the Business screen in `admin-business-health-settings-v4.html`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit, take screenshots, open PR 6.**

---

## PR 7: Email alerts (`feat/admin-alerts`)

### Task 16: When to alert

**Files:**
- Create: `backend/src/modules/alerts/alert-rules.ts`
- Test: `backend/tests/unit/alert-rules.test.ts`

**Interfaces:**
- Produces:
  - `type AlertRecord = { status: "ok" | "failing"; recent: number[]; consecutive: number; lastSentAt: number | null; changedAt: number }`
  - `nextAlert(record: AlertRecord, event: { kind: "failed"; code: string } | { kind: "succeeded" }, now: number): { record: AlertRecord; send: "failing" | "recovered" | null }`
  - Constants: `FAILS_TO_ALERT = 3`, `WINDOW_MS = 10 * 60_000`,
    `RESEND_GAP_MS = 30 * 60_000`
  - Only `isProviderFailure(code)` failures count (Task 1).

- [ ] **Step 1: Write the failing tests.**
  - 2 failures send nothing. The 3rd in a row sends `"failing"`.
  - 3 failures within 10 min, with successes between them, send
    `"failing"`.
  - 3 failures spread over 11 min, with successes between, send nothing.
  - While failing, another failure 20 min later sends nothing. One 31 min
    later sends `"failing"` again.
  - The first success after failing sends `"recovered"`, and the status
    becomes `"ok"`.
  - `UNKNOWN_ERROR` failures never count.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** it as a pure function. It drops `recent` entries older than `WINDOW_MS`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(backend): rules for when solving alerts are sent`.

### Task 17: Alert wiring and the daily summary

**Files:**
- Create: `backend/src/modules/alerts/alert.repository.ts` (reads and writes `alertState`, in a transaction with `select … for update`)
- Create: `backend/src/modules/alerts/solve-alerts.ts`
- Create: `backend/src/modules/alerts/alert-emails.ts`
- Create: `backend/src/modules/alerts/daily-summary.ts`
- Create: `backend/src/routes/internal/daily-summary.route.ts`
- Modify: `backend/src/create-app.ts` (`AppServices.alerts: SolveAlerts`), `backend/src/app.ts`, `backend/src/routes/solve.route.ts` (calls `alerts.onSolveFailed` / `onSolveSucceeded` in `runInBackground`), `backend/src/routes/index.ts`
- Modify: `backend/vercel.json` (`"crons": [{ "path": "/internal/daily-summary", "schedule": "30 3 * * *" }]`)
- Modify: `backend/.env.example` (`ALERT_EMAILS_ENABLED=false`, `CRON_SECRET=`, `AI_DAILY_LIMIT=`)
- Modify: `backend/tests/support/test-app.ts` (`recordingAlerts`, which keeps the calls in memory)
- Test: `backend/tests/alerts.test.ts`, `backend/tests/unit/daily-summary.test.ts`

**Interfaces:**
- Consumes: `nextAlert` (Task 16) and `EmailSender`.
- Produces:
  - `interface SolveAlerts { onSolveFailed(code: string): Promise<void>; onSolveSucceeded(): Promise<void> }`.
    The real one uses the `solving` row of `alertState`. It emails every
    admin, and only when `ALERT_EMAILS_ENABLED === "true"`.
  - `buildDailySummary(items: { failed: FailedGroup[]; reports: number; feedback: number }, origin: string): EmailMessage | null`.
    It returns `null` when all are empty.
  - `POST /internal/daily-summary` requires
    `Authorization: Bearer ${CRON_SECRET}` (otherwise 401). It sends the
    summary of the last 24 hours to every admin.
  - Subjects:
    - "NeoMath: solving is failing (`code`)"
    - "NeoMath: solving is back"
    - "NeoMath: `n` new things to look at"

- [ ] **Step 1: Write the failing tests.**
  - A `FAKE_SOLVER_FAILURE` solve calls `onSolveFailed("AI_TIMEOUT")`. A
    normal solve calls `onSolveSucceeded()` (via `recordingAlerts`).
  - The daily summary with no secret, or a wrong one, gives 401.
  - With the secret, it gives 200, and this file's admin gets an email that
    lists this file's failed problem.
  - `buildDailySummary` with empty items gives `null`.
  - The real `SolveAlerts`, run against the test database with
    `ALERT_EMAILS_ENABLED` unset, never sends: 3 failures leave the fake
    outbox empty.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the backend tests. Expected: PASS.
- [ ] **Step 5: Commit and open PR 7.** The owner adds `CRON_SECRET` and
  `ALERT_EMAILS_ENABLED=true` to `neomath-api` production in Vercel. Add
  "Alert" to `CONTEXT.md`.

### Task 18: An outside check for "everything is down"

The alerts in Task 17 need a running backend, a working database and real
solves. If the backend can't start, or the database is down, or no student
is solving, nothing would send an email. An outside check covers that case.

The repo is public, so scheduled GitHub Actions are free. GitHub emails the
owner when a scheduled run fails, so no new service or account is needed.

**Files:**
- Modify: `backend/src/routes/health.route.ts`
- Create: `.github/workflows/uptime.yml`
- Test: `backend/tests/health.test.ts`

**Interfaces:**
- Produces:
  - `GET /health` runs `select 1` with a 3 s timeout.
    - It answers 200 `{ status: "healthy", timestamp }` when that works.
    - It answers 503 `{ status: "unhealthy", timestamp }` when it doesn't,
      with no error details.
  - The workflow runs `on: schedule: - cron: "*/10 * * * *"` (plus
    `workflow_dispatch`). It does
    `curl --fail --max-time 15 https://neomath-api.vercel.app/health` and
    `curl --fail --max-time 15 https://neomath.vercel.app/`, retrying once
    after 30 s before failing.

- [ ] **Step 1: Write the failing test.** With the database reachable, `/health` still answers 200 `healthy`. A unit test of `healthRoute` with a database stub that throws gets 503 and a body without the error text.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the check and the workflow.
- [ ] **Step 4: Run** the tests. Then trigger the workflow once by hand (`gh workflow run uptime.yml`) and check that it passes.
- [ ] **Step 5: Commit** `feat: outside uptime check every 10 minutes`. Tell the owner that GitHub emails them when a run fails (Settings → Notifications → Actions → "Send notifications for failed workflows only").

---

## After this plan

- Settings (daily limit, sign-ups, maintenance mode) gets its own spec from the
  approved design.
- **Found while planning, not fixed here:** the daily free limit uses the
  server's date (UTC, in `profile.route.ts` and `solve.route.ts`). A student in
  India gets a fresh 5 at 05:30 IST, not midnight. File it as its own issue.
