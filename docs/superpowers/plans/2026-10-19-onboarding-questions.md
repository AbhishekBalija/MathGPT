# Onboarding Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ask a new student their class range and board (or university) once after sign-up, save it on the User, and let them change it from a refreshed Profile popup.

**Architecture:** Backend: seven nullable `users` columns, a small `class-info` module (zod schema, `toClassInfo`, `needsOnboarding`), two routes under `/api/profile/class`, and the fields on every auth response. Frontend: one shared `ClassSteps` component used by a new `/welcome` page and by the Profile popup; `AppLayout` sends students who need it to `/welcome` once per visit.

**Tech Stack:** Bun, Express 5, Drizzle (Postgres on Neon), zod, React + Vite + Tailwind, Zustand, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-19-onboarding-questions-design.md`

## Global Constraints

- Ranges, saved values: `class_1_5`, `class_6_8`, `class_9_10`, `class_11_12`, `college`
- Boards, saved values: `cbse`, `icse`, `state`, `ib`, `cambridge`, `other`; labels CBSE, ICSE / ISC, State board, IB, Cambridge, Other
- `board_state` at most 40 characters; `institution` at most 120, trimmed, empty becomes null
- Example problems per row: `156 ÷ 4`, `3x + 5 = 20`, `x² + 5x + 6 = 0`, `d/dx (sin x)`, `∫ x eˣ dx`
- Copy is exactly as the spec writes it (Hello lines, questions, why lines, "Not set yet", "Helping with …")
- No age or date of birth anywhere. No new dependencies. No new animation
- Bun only; TypeScript strict, no `any`; comments in plain words
- Backend PR is version 1.8.0, frontend PR 1.9.0, each with a CHANGELOG line
- Migration `0012_onboarding` is applied by the owner to Neon preview, then production, before the backend PR merges

## Review Focus

1. **Sessions saved before this ships** have no `onboarding` field in local storage. Expect no redirect until `/auth/me` says `"needed"` (never a loop or a blank screen). Test in Task 7.
2. **Browser back from `/welcome`** lands on `/app`, which must not bounce the student straight back. Once shown in a visit, it is not forced again. Test in Task 7.
3. **A college student who leaves the university box empty** gets `institution: null`, not `""`, and the Profile line reads just "College & above". Tests in Tasks 2 and 5.
4. **Changing from a school range to college in the Profile** must clear the old board and state (and the reverse clears the institution). Test in Task 3.
5. **Skip after a class is already set** (an old tab) must not wipe the class. Test in Task 3.

---

## Backend PR (branch `feat/onboarding-backend`, off `docs/onboarding-spec`)

### Task 1: Columns, migration and the class-info module

**Files:**
- Modify: `backend/src/db/schema.ts` (users table)
- Create: `backend/drizzle/0012_onboarding.sql` (via `bun run db:generate`, then rename the tag to `0012_onboarding`)
- Create: `backend/src/modules/users/class-info.ts`
- Test: `backend/tests/unit/class-info.test.ts`

**Interfaces:**
- Produces:
  - Columns on `users`: `classRange` (`class_range`, text, check in the five values), `helping` (boolean, not null, default false), `board` (text, check in the six values), `boardState` (`board_state`, text), `institution` (text), `classSetAt` (`class_set_at`, timestamptz), `onboardingSkippedAt` (`onboarding_skipped_at`, timestamptz)
  - `type ClassRange`, `type Board`, `const SCHOOL_RANGES: ClassRange[]`
  - `classAnswerSchema` (zod): `{ range, helping: boolean, board?, state?, institution? }` with the spec's rules, refined with message code `INVALID_CLASS`
  - `type ClassAnswer = z.infer<typeof classAnswerSchema>`
  - `interface ClassInfo { range: ClassRange; helping: boolean; board: Board | null; state: string | null; institution: string | null }`
  - `toClassInfo(user: User): ClassInfo | null` (null when `classRange` is null)
  - `needsOnboarding(user: User): boolean` (true when `classRange` and `onboardingSkippedAt` are both null)

- [ ] **Step 1: Write the failing tests** for `classAnswerSchema`:
  `accepts a school range with a board`, `accepts a school range with no board`, `needs a state for a state board` (`{range:"class_6_8",board:"state"}` fails; with `state:"Karnataka"` passes), `refuses a state without a state board`, `refuses a board for college`, `refuses an institution for a school range`, `trims the institution and turns empty into null` (`"  VTU  "` → `"VTU"`, `"   "` → `null`), `refuses an institution over 120 characters`. Plus `needsOnboarding` true for a fresh user, false once `classRange` or `onboardingSkippedAt` is set.
- [ ] **Step 2: Run** `bunx vitest run tests/unit/class-info.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Add the columns** to `users` in `schema.ts` with the two `check`s, then `bun run db:generate` and rename the file and journal tag to `0012_onboarding`.
- [ ] **Step 4: Implement** `class-info.ts` with the exports above.
- [ ] **Step 5: Run** the unit test again. Expected: PASS. Also `bun run typecheck`.
- [ ] **Step 6: Commit** `feat: class range and board columns on users`.

### Task 2: Class info on every auth response

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts` (`PublicUser`, `toPublicUser`)
- Modify: `backend/src/routes/auth/me.route.ts`
- Test: `backend/tests/onboarding.test.ts` (new)

**Interfaces:**
- Consumes: `toClassInfo`, `needsOnboarding` (Task 1)
- Produces: `PublicUser` gains `onboarding: "needed" | "done"` and `classInfo: ClassInfo | null`. `GET /auth/me` returns `{ user: toPublicUser(dbUser) }` (load the User with `userRepository.findById`)

- [ ] **Step 1: Write the failing test** `a new student needs onboarding`: register a verified user, `GET /auth/me` → `user.onboarding === "needed"`, `user.classInfo === null`; the register response's `user.onboarding` is `"needed"` too.
- [ ] **Step 2: Run** `bunx vitest run tests/onboarding.test.ts`. Expected: FAIL (`undefined`).
- [ ] **Step 3: Implement** the two fields in `toPublicUser` and switch `me.route.ts` to it.
- [ ] **Step 4: Run** the test, plus `tests/auth.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: onboarding state on auth responses`.

### Task 3: Save and skip routes

**Files:**
- Create: `backend/src/routes/profile-class.route.ts`
- Modify: `backend/src/modules/users/user.repository.ts`, `backend/src/routes/index.ts`
- Test: `backend/tests/onboarding.test.ts`

**Interfaces:**
- Consumes: `classAnswerSchema`, `ClassAnswer`, `toPublicUser` (Tasks 1–2)
- Produces:
  - `userRepository.setClass(id: string, answer: ClassAnswer): Promise<User | null>` sets all five answer columns (absent ones to null) and `classSetAt = now`
  - `userRepository.skipOnboarding(id: string): Promise<User | null>` sets `onboardingSkippedAt = coalesce(onboarding_skipped_at, now)`
  - `PUT /api/profile/class` → `200 { user: PublicUser }` or `400 { error, code: "INVALID_CLASS" }`
  - `POST /api/profile/class/skip` → `200 { user: PublicUser }`
  - Both behind `requireUser`; 401 without a login

- [ ] **Step 1: Write the failing tests** in `onboarding.test.ts`:
  - `saves a school class with a board`: PUT `{range:"class_6_8",helping:false,board:"cbse"}` → 200, `user.onboarding "done"`, `classInfo` matches; `/auth/me` shows the same
  - `saves a school class with no board` → `board: null`
  - `saves a parent's answer` with `helping: true`
  - `needs a state for a state board` → 400 `INVALID_CLASS`; with `state:"Karnataka"` → 200
  - `refuses a board for college` → 400
  - `switching to college clears the old board and state` (save state board, then `{range:"college",helping:false,institution:"VTU"}` → `board null, state null, institution "VTU"`) and the reverse clears the institution
  - `an empty university becomes null`
  - `skip makes onboarding done and saves no class`; `skipping twice keeps the first time` (read `onboarding_skipped_at` is unchanged via a second skip returning `done`, and `classInfo` still null)
  - `skip after a class is set keeps the class`
  - `needs a login` → 401 for both routes
- [ ] **Step 2: Run** `bunx vitest run tests/onboarding.test.ts`. Expected: FAIL (404).
- [ ] **Step 3: Implement** the repository methods, the route file (zod parse → `setClass` → `toPublicUser`), and mount both routes in `index.ts` next to `/api/profile`.
- [ ] **Step 4: Run** the test file. Expected: PASS. Then `bun run typecheck && bun run lint`.
- [ ] **Step 5: Commit** `feat: save or skip the class after sign-up`.

### Task 4: Backend docs, version, PR

**Files:**
- Modify: `docs/api-reference.md` (the two routes, the new auth fields), `CHANGELOG.md` (1.8.0), `backend/package.json` and `frontend/package.json` (1.8.0)

- [ ] **Step 1:** Document both routes and the two new `user` fields in `api-reference.md`.
- [ ] **Step 2:** Bump to 1.8.0 and add "Added: the API saves a student's class range and board, or that they skipped (#39)".
- [ ] **Step 3: Run** `bun run test` in `backend/`. Expected: all pass.
- [ ] **Step 4: Commit** `docs: onboarding API` and open the PR (bot identity, plain-language body, note the migration must be applied first).

---

## Frontend PR (branch `feat/onboarding-page`, off `feat/onboarding-backend`)

### Task 5: Options, labels and the service

**Files:**
- Create: `frontend/src/features/onboarding/class-options.ts`
- Create: `frontend/src/services/class.service.ts`
- Modify: `frontend/src/services/auth.service.ts` (`User` type)
- Test: `frontend/tests/class-options.test.ts`

**Interfaces:**
- Produces:
  - `User` gains `onboarding?: "needed" | "done"` and `classInfo?: ClassInfo | null` (optional: old saved sessions lack them)
  - `type ClassRange`, `type Board`, `interface ClassInfo` (same shape as the API)
  - `RANGES: { value: ClassRange; label: string; sub?: string; example: string }[]` (labels "Class 1–5" … "College & above", sub "PU · Diploma" on 11–12, examples from Global Constraints)
  - `BOARDS: { value: Board; label: string }[]`
  - `INDIAN_STATES: string[]` (Karnataka first, then the other states and union territories A–Z)
  - `isSchoolRange(range: ClassRange): boolean`
  - `describeClass(info: ClassInfo | null | undefined): string`
  - `classService.save(answer: ClassAnswer): Promise<User>` and `classService.skip(): Promise<User>` (PUT/POST, return `data.user`)

- [ ] **Step 1: Write the failing tests** for `describeClass`: `null` → "Not set yet"; `{class_6_8, cbse}` → "Class 6–8 · CBSE"; state board Karnataka → "Class 9–10 · State board · Karnataka"; college + "VTU" → "College & above · VTU"; college, no institution → "College & above"; school, no board → "Class 1–5"; `helping: true` → "Helping with Class 6–8 · CBSE". And `INDIAN_STATES[0] === "Karnataka"`.
- [ ] **Step 2: Run** `bunx vitest run tests/class-options.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the module, the service and the `User` fields.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat: class options and service`.

### Task 6: The shared `ClassSteps` component

**Files:**
- Create: `frontend/src/features/onboarding/ClassSteps.tsx`, `frontend/src/features/onboarding/QuestionHeader.tsx`
- Test: `frontend/tests/class-steps.test.tsx`

**Interfaces:**
- Consumes: Task 5
- Produces:
  - `QuestionHeader({ question, why }: { question: string; why: string })`: header option C (large left heading, Neo peeking top right, why line full width)
  - `ClassSteps({ initial, onSaved, onSkip, onBackFromFirst }: { initial?: ClassInfo | null; onSaved: (user: User) => void; onSkip?: (user: User | null) => void; onBackFromFirst?: () => void })`
  - Step 1: five `RANGES` rows as radio buttons (role `radio`, name from label), the parent/teacher link toggles `helping` and the question; **Continue** disabled until a row is picked
  - Step 2: school → `BOARDS` chips (role `radio`) and, for State board, a `select` labelled "Which state?" with `INDIAN_STATES`; college → text box labelled "University or college" (maxLength 120). **Done** disabled until a chip is picked (college: always enabled). Done calls `classService.save`
  - Skip on step 1 calls `classService.skip`; Skip on step 2 saves the class alone (no board)
  - Back arrow on step 2 returns to step 1; on step 1 calls `onBackFromFirst`

- [ ] **Step 1: Write the failing tests** (mock `classService`):
  - `Continue stays disabled until a class is picked`
  - `a school class leads to the board chips, and State board shows the state list` (Karnataka is the first option)
  - `College leads to the university box` and Done saves `{range:"college",helping:false}` with an empty box
  - `the parent or teacher link changes the question` to "Which class are you helping with?" and saves `helping: true`
  - `Skip on the class step skips`; `Skip on the board step saves the class without a board`
  - `starts from the saved answer when given one` (Class 6–8 selected, CBSE selected)
- [ ] **Step 2: Run** `bunx vitest run tests/class-steps.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** both components to the mockup (`onboarding-v1.html` rows/chips, `class-header-v2.html` option C header), using existing tokens (Inter, `rounded-2xl`, near-black buttons, `brand-600` link) with dark variants.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat: class and board steps`.

### Task 7: The `/welcome` page and the redirect

**Files:**
- Create: `frontend/src/pages/Welcome.tsx`
- Modify: `frontend/src/App.tsx` (protected `/welcome` route), `frontend/src/pages/AppLayout.tsx`
- Test: `frontend/tests/welcome.test.tsx`

**Interfaces:**
- Consumes: `ClassSteps`, `authStore` user, `setUser`
- Produces: `Welcome` page: Hello screen ("Hi, I'm Neo!", "Two quick questions, so your steps fit your class. It takes 10 seconds.", **Let's go**, "Skip for now"), then `ClassSteps`, all in a centred column at most 440px wide on a laptop; on save or skip it calls `setUser(user)` and navigates to `/app` (replace). `AppLayout` navigates to `/welcome` when `user.onboarding === "needed"` and `sessionStorage["neomath-welcome-shown"]` is not set; `Welcome` sets that key on mount and sends anyone with `onboarding === "done"` to `/app`.

- [ ] **Step 1: Write the failing tests**:
  - `a student who needs onboarding is sent to /welcome`
  - `a saved session without the onboarding field stays on /app` (Review Focus 1)
  - `after /welcome was shown this visit, /app does not send them back` (Review Focus 2)
  - `a student who is done is sent from /welcome to /app`
  - `Let's go opens the class step; Skip for now skips and opens /app`
- [ ] **Step 2: Run** `bunx vitest run tests/welcome.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the page, route and redirect.
- [ ] **Step 4: Run** the test plus `tests/solver-page.test.tsx` and `tests/path-after-login.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: welcome page asks the class once`.

### Task 8: The refreshed Profile popup

**Files:**
- Modify: `frontend/src/components/ProfileModal.tsx`
- Test: `frontend/tests/profile-modal.test.tsx` (new)

**Interfaces:**
- Consumes: `describeClass`, `ClassSteps`, `useAuthStore` user, `useAppDataStore` profile
- Produces: the new look from the mockup (avatar, name, email; "Your class" card with `describeClass` and **Change**; "Problems solved" and the join month). Change swaps the card for `ClassSteps` with `initial = user.classInfo`; saving updates the user and returns to the Profile. The problem-type bars are removed.

- [ ] **Step 1: Write the failing tests**: `shows the class line` ("Class 6–8 · CBSE"); `shows Not set yet with no class`; `Change opens the class steps and saving returns with the new line`; `no problem-type bars` (no "Algebra" text).
- [ ] **Step 2: Run** `bunx vitest run tests/profile-modal.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the refresh; keep the existing open/close behaviour and phone slide-up.
- [ ] **Step 4: Run** the test plus `tests/profile-fetch-once.test.tsx`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: Profile shows and changes the class`.

### Task 9: Check, screenshots, PR

**Files:**
- Modify: `CHANGELOG.md` (1.9.0), both `package.json` (1.9.0)

- [ ] **Step 1: Run** `bun run typecheck && bun run lint && bun run test --run` in `frontend/`. Expected: all pass.
- [ ] **Step 2:** Screenshot Hello, Class, Board (State board picked), College, Profile on phone and desktop, light and dark, with the API faked as in the Problem Guard PR. Look at each; fix anything off.
- [ ] **Step 3:** Bump to 1.9.0, CHANGELOG "Added: after sign-up Neo asks the student's class and board once; the Profile shows and changes it (#39)".
- [ ] **Step 4: Commit** and open the PR with the screenshots (base `feat/onboarding-backend` until that merges).

---

## Revision 2 (19 Oct): role step, teachers pick several classes, quiet motion

The spec now asks the Role first and stores a list of Class ranges. Tasks 1–9
above are done; these change them in place on the same two branches.

### R1: Backend (`feat/onboarding-backend`)
- Migration `0013_onboarding_roles`: add `role` (text, check student/parent/teacher) and `class_ranges` (text[] not null default `{}`, check `<@` the five values); drop `class_range` and `helping` (empty on preview and production, checked 19 Oct)
- `class-info.ts`: `Role`, `ROLES`; `classAnswerSchema` = `{ role, ranges?, board?, state?, institution? }` with the spec's rules; `ClassInfo` = `{ role, ranges, board, state, institution }`; `toClassInfo` null when `role` is null; `needsOnboarding` = no role and no skip
- `userRepository.setClass` writes `role` and `classRanges`
- Tests: update `tests/unit/class-info.test.ts` and `tests/onboarding.test.ts` to the spec's Testing list (red first)

### R2: Frontend steps (`feat/onboarding-page`)
- `class-options.ts`: `Role`, `ROLES`, new `ClassInfo`/`ClassAnswer`, `describeClass` led by the role ("Teacher · Class 6–8, 9–10 · CBSE")
- `ClassSteps`: role step first (plain rows, radio), class step per role (teacher multi with checkboxes), board step for school / college / both; skip rules per step; Profile starts at the role step
- Tests: `class-options`, `class-steps`, `profile-modal` updated red first

### R3: Motion
- CSS keyframes in `index.css` under `motion-safe`: step slide 240ms 24px, bar `scaleX` 300ms, dot/tick pop 160ms, rows 30ms stagger 200ms, press 97% 100ms. No Neo motion (#132)

### R4: Check and ship
- Full suites, screenshots (role, teacher multi, mixed board step, Profile), update #130/#131 bodies, migration commands for 0013
