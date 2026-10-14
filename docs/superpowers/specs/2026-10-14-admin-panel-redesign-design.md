# Admin panel redesign

## Goal

The owner opens `/admin` and knows in 5 seconds whether anything is wrong.
Fixing something takes one paste to Claude. The panel matches the redesigned
student app and also shows how the business is doing.

Who uses it: the owner, on a laptop first; the phone is for a quick check.
Claude does most of the building and fixing, so the panel also shows what
Claude needs to debug.

Mockups (approved 2026-10-14) live in
`.superpowers/brainstorm/71784-1791999973/content/`: `admin-overview-v4.html`,
`admin-screens-v4.html`, `admin-business-health-settings-v4.html` and
`admin-ux-flows-v4.html`. v1 to v3 are kept there for reference.

## Decisions already made

- Every number on every screen is real data. A value we cannot measure yet is
  dropped, not faked (for example the "ms (example)" placeholders).
- **Team accounts** are left out of business numbers. Admins are team
  automatically; any other account can be marked as team.
- **Copy for Claude** on every item. It never includes the student's email.
- **Small actions get Undo, big ones ask first** (see "Undo and confirm").
- **Email alerts**: right away when solving breaks and when it recovers, plus a
  daily summary.
- **Every item and filter has its own link.**
- **Auto-refresh** every minute while the tab is open.
- **Motion**: none beyond hover and press states.
- **Not in this round**:
  - Settings: the daily limit, sign-ups on/off and maintenance mode. These are
    designed, but come next as their own piece, because they need a settings
    table.
  - The "Make a GitHub issue" button
  - Keyboard shortcuts
  - Owner vs admin roles
  - A cache browser

## Look

The same system as the student app:

- **Type and colour**: Inter; near-black `#0a0a0a` or light grey `#f9fafb`; the
  brand pinks from `index.css`.
- **Shapes and sizes**: cards with a 14px radius and 1px lines; 44px tap targets
  on phones.
- **Contrast** (measured, every text pair passes 4.5:1):
  - small grey text is `#8b93a1` in dark mode and `#6b7280` in light mode
  - status green is `#34d399` in dark mode and `#047857` in light mode
- **Dates**: today shows only the time ("22:49"). Older items show
  "10 Oct, 22:07".
- **Monospace** only for ids, commits, error codes and env var names.

### Layout

- **Laptop**:
  - Left nav, grouped **Watch** (Overview, Business, Health, Events),
    **Handle** (Failed solves, Reports, Feedback, with counts) and **People**
    (Students).
  - The groups show as small labels with a thin rail.
  - The details panel opens on the right only when a row is picked.
- **Phone**:
  - The nav becomes a row across the top, with the Handle items first.
  - Everything stacks into one column, and details open below the list.

### Neo (the personal touch)

A box at the top of the Overview, Business and Health screens. Neo sums the
screen up in one line. The box has three states, so a bad day never looks like
a calm one:

| State | Edge | Example |
|---|---|---|
| All fine | green | "Nothing needs you right now." |
| Needs you | amber | "1 failed solve tonight needs a look." |
| Something is down | red | "Gemini is down. Students are getting the backup model." |

Neo also appears in empty states, and nowhere else.

## Screens

**Overview**
- Neo.
- Four number tabs (solves, real students, active this week, failed tries).
  Clicking one switches the 7-day chart.
- **Health** card.
- **AI usage today**: Gemini, backup, cache and instant answers, against the
  daily limit.
- **Needs you**: failed solves, reports and feedback in one list.
- **Business** card: the funnel and top topics, real students only.

**Business**
- Neo.
- Numbers: real students, active this week, solves per active student, and how
  many times a student hit the daily limit.
- New students per day.
- The **funnel**: signed up, then verified, then solved a problem, then came
  back another day.
- **Do students come back?**: a table by signup week, where Week 0 is always
  100%.
- Cost: today, and tokens per solve.
- What they ask (topics).
- A checkbox to include team accounts.

**Health**
- Neo.
- **Services**, each a row with up/down and its latest result:
  - API, database, Gemini, backup model (OpenRouter)
  - email (Resend), robot check (Turnstile), Sentry
- Tapping a row opens **"If this is down"**, a short runbook.
- **Solving**:
  - the last 24 hours first ("2 of 9 tries failed")
  - then 7 daily ticks
  - failures grouped by error code
- **Speed**: average, and the slowest 10%.
- **What's live**:
  - the commit each app runs
  - migrations applied, and whether they match the code
  - which env vars are set, by name only, never values
- **Copy health report for Claude.**

**Failed solves**
- Open / Resolved / All.
- Repeats of the same problem by the same student are one row, with "×3".
  The header says "5 problems · 7 tries".
- The row tag is the error type (for example "Gemini error"), and the row says
  if a later try worked.
- Details:
  - student, tries, the full error, models tried, prompt version, time taken
  - a timeline
  - Copy for Claude, Mark resolved, and Sentry and Vercel links
- Records saved before this round say plainly that their details are missing.

**Reports**
- Blocked / Unblocked / All.
- Details:
  - the answer
  - the reason
  - cache status
  - whether our code checker agreed
  - a timeline
  - "See the full solution"
- Actions: Unblock (asks first) and Copy for Claude.

**Feedback**
- Open / Done, plus type filters.
- Details: who sent it, the page, and the solution they had open.
- Actions: Mark done (with Undo), "Open their solution", and Copy for Claude.

**Students**
- Search, then a table: name, solves, last active, joined. Tags for Admin and
  Team.
- Details:
  - history: solves, failures, reports
  - today's free-limit use
- Actions:
  - Mark as team
  - Make admin
  - Delete, which asks first and says what goes and what stays

**Events**
- The raw log, with filter chips and counts.
- A new column shows source and model.

## Undo and confirm

- **Undo for 5 seconds**: mark resolved, mark done, mark as team. These use the
  same pattern as deleting a problem in the app (`useDeleteWithUndo`), so the
  request is only sent once the Undo time has passed.
- **Ask first**: unblock an answer, make admin, delete a student. In the next
  round, maintenance mode and the daily limit join this list. The limit gets a
  Save button instead of applying on change.

## Links

Each item and filter gets its own address:

- `/admin/failed/:id`, `/admin/reports/:id`, `/admin/feedback/:id`,
  `/admin/students/:id`
- filters in the query, like `/admin/failed?status=resolved`

Copy for Claude and the alert emails use these links.

## Copy for Claude

Built in the browser from the details panel, as plain text.

- **Every item includes**:
  - the item id and its admin link
  - when it happened, in IST and UTC
  - how long it took
  - the error code and full message
  - the models tried, the prompt version, level and method
  - the problem text
- **Reports also include** the answer, and whether the code checker agreed.
- **Links**: a Sentry search for that id, and the `neomath-api` Vercel logs for
  that 5-minute window.
- **Never included**: the student's email or name.

The health report has the same shape: every service, its latest result,
what's live, and the last 24 hours of failures.

## Backend

### Data the backend starts saving

1. **Every solve** records `source` (`ai`, `cache` or `instant`), `model` and
   `promptVersion` in its `solution_saved` event. These go in the event's JSON
   data, so no migration is needed.
2. **A failed solve** keeps up to 2,000 characters of the problem. Today it is
   cut to 200, in five places in `solve.route.ts`.
3. **A failed solve** also saves its details: the models tried and each one's
   error, the full message, and the prompt version.
4. **Today almost every failure is saved as error code `"Error"`** (7 of 8 in
   production). The code becomes the real cause, for example
   `AllModelsFailedError` or `GeminiRateLimited`.

### Migration 0010 (adds things only)

- `error_logs.details`: jsonb, nullable.
- `users.is_team`: boolean, default false.
- `alert_state`: one row per alert kind, with `kind`, `status` (`ok` or
  `failing`), `changed_at` and `last_sent_at`. It decides when to send an alert.

### Endpoints (all behind `requireUser` and `requireAdmin`)

- `GET /admin/overview`: the numbers, solves per day, funnel, top topics, AI
  usage today and the "Needs you" list, in one call.
- `GET /admin/business?includeTeam=true`: the Business screen.
- `GET /admin/health`: live checks, run in parallel and each with a 3 s timeout.
  - The database runs `select 1`.
  - Gemini lists its models, which does not use up any solves.
  - Resend reads its domain.
  - OpenRouter, Turnstile and Sentry check that their key is set. Their rows
    say "Key set", not "Up", because nothing calls them.
  - It also returns:
    - the backend's deployed commit (`VERCEL_GIT_COMMIT_SHA`). The frontend
      shows its own from `VITE_VERCEL_GIT_COMMIT_SHA`.
    - the migrations applied compared with those in the code, using the same
      list as `scripts/check-migrations.ts`, read from the bundled
      `drizzle/meta/_journal.json`
    - which env var names from `.env.example` are set
- `GET /admin/failed?status=` and `GET /admin/failed/:id`: grouped repeats and
  the full details.
- `GET /admin/students/:id` and `PATCH /admin/users/:id/team`.
- The existing errors, reports, feedback, users and analytics endpoints stay,
  with the same shapes plus new fields.

### Daily AI limit

The limit comes from an optional `AI_DAILY_LIMIT` env var until Settings
exists. It resets at 12:30 IST, when Gemini's free tier resets.

### Email alerts

The backend runs on Vercel Hobby, where scheduled jobs run at most once a day
and only to within about an hour. So:

- **"Solving is failing"**:
  - Sent when 3 solves fail in a row, or 3 within 10 minutes, with a provider
    error.
  - The failure path checks `alert_state`, sends one email and marks the kind
    as failing. It sends at most one email every 30 minutes.
- **"Solving is back"**: sent by the next successful solve after a failing
  alert.
- **Daily summary**:
  - A once-a-day Vercel cron at 03:30 UTC (9:00 to 10:00 IST) calls
    `POST /internal/daily-summary`, protected by `CRON_SECRET`.
  - The email lists new failed solves, reports and feedback since yesterday,
    with links.
  - It is skipped when there is nothing new.
- **Delivery**: Resend sends every email, to every admin. They need
  `ALERT_EMAILS_ENABLED=true`, so local runs and tests never send real mail.

### Auto-refresh

- The Overview and Health refetch every 60 s while the tab is visible, and stop
  while it is hidden.
- They show "Updated 20s ago".
- Health runs its live checks at most once a minute, cached in memory, so
  several open tabs don't multiply the calls.

## Error handling

- If one health check fails or times out, only that row shows as down.
  `/admin/health` still answers 200.
- If an Overview section fails, that card says "Couldn't load this" with a
  Retry button, and the other cards still show.
- Older records with no details are shown honestly: "Saved before this round."

## Testing

Test-first, at seams agreed before coding, as with Feedback.

- **Backend** (HTTP API):
  - overview and business numbers, including that team accounts are left out
  - health, with fake Gemini and Resend, a timeout, and a failing database
    check
  - failed-solve grouping
  - the new solve fields and longer problem text
  - alert sending, using fake email and fake time
  - the daily summary, including the cron secret
- **Frontend** (components with mocked services):
  - Neo's three states
  - the Copy for Claude text, including that it has no email
  - Undo and confirm
  - item links
  - the auto-refresh timer
- **Screenshots**: every screen in light and dark mode, at laptop and phone
  width, checked before each PR.

## Build order

Each step is its own PR into `main`, with tests:

1. The new solve fields (source, model, prompt version), the longer problem
   text, the real error codes, and migration 0010.
2. The admin shell: new layout, nav, Neo, links, auto-refresh, Undo and
   confirm.
3. Overview, with `GET /admin/overview`.
4. Health, with `GET /admin/health` and the health report.
5. Failed solves, Reports, Feedback, Students and Events, all with the details
   panel and Copy for Claude.
6. Business and team accounts.
7. Email alerts and the daily summary.

Settings comes after these, as its own spec.

## Open items found while designing

- Tonight's failure (14 Oct, 22:49) was a long pasted worksheet. Gemini failed
  with a fetch error after 31 s, and the student's next try worked. Step 1
  captures enough to see why next time.
- 7 of 8 production failures have the useless code `"Error"`. Step 1 fixes
  this.
