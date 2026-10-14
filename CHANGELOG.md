# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- "Something looks wrong? Tell us" under every answer: it reports the
  solution (`POST /api/solutions/:id/report`, new `solution_reports` table,
  migration `0007`) and blocks its shared-cache entry, so no other student
  gets it (#53).

- Shared solution cache (`solution_cache`, migration `0006`): a student asking
  a problem someone already solved gets that solution with no AI call and no
  Credit. Only answers that passed a check are shared: a code check
  (`verifyAnswer`) first, otherwise a second model from a different maker
  must give the same answer. A code-checked answer shows "Checked by putting
  the answer back in." (#52)

- Backend error alerts with Sentry (`@sentry/bun`, `backend/src/lib/sentry.ts`).
  Every failed solve and every unhandled error is reported, without problem
  text, request bodies, headers or cookies. Off unless `SENTRY_DSN` is set.

- Deploys of the backend stop at build time when the database is missing a
  migration (`bun run db:check`, run as `vercel-build`), so the live site
  never runs code ahead of its schema.

- The backend is ready for Vercel: `backend/src/app.ts` is the deployed
  entry (imports express, default-exports the app; `server.ts` only listens
  locally), `backend/vercel.json`
  selects the Bun runtime and the Singapore region, background work uses
  `waitUntil` and the Postgres pool is attached with `attachDatabasePool`
  (`@vercel/functions`).

- Postgres with Drizzle (`backend/src/db/`), with committed SQL migrations
  and `bun run db:generate` / `bun run db:migrate`.
- `bun run test` runs the real app in-process against a throwaway local
  database, with a fake AI solver and a fake email outbox.
- CI on every PR: lint, typecheck and tests for backend and frontend.
- `emailVerified` on the user object in sign-up, login, Google sign-in and
  `GET /auth/me` responses.
- Email verification (ADR-0003): email sign-ups get a 6-digit Verification
  Code, entered on a new "Verify your email" screen. `POST /auth/verify-email`
  and `POST /auth/resend-verification` (1 per minute, 5 per hour). Codes last
  15 minutes, are stored as an HMAC and allow 5 wrong attempts.
- Rate Limits stored in Postgres (`rate_limits`), shared by every server
  instance: sign-up 5 per hour per IP, login 10 per 15 minutes per IP, solve
  5 per minute per User. Blocked requests get 429 with `code: "RATE_LIMITED"`
  and `retryAfter`.
- `EMAIL_TRANSPORT=console` prints emails to the server log in development.

### Changed

- Sign-in, sign-up and email verification share a new layout: a pink panel
  with Neo on top of three steps (desktop) and the form on the right; on
  phones the logo, Neo on his own, then the form. Google comes first, then
  the email form, separated by a thin "or" line. Removed the "Remember me" box and the
  "Forgot password?" link, which did nothing (password reset is tracked as
  its own issue).

- New brand: the NeoMath logo is the Honk wordmark with π-Neo sitting on
  the 'h'. It is a baked SVG (no colour-font support needed), has a dark-mode
  version with a white rim, and is used in the navbar, sidebar, sign-in pages
  and admin. Neo replaces the 5.7 MB avatar image in the chat. New favicons,
  home-screen icons and a link preview card (og:image). Accent colour is now
  the logo pink, contrast-checked; dark mode uses warm blacks and a solid pink. See
  docs/brand.md.

- The landing waves are smoother: no stretching, softer curves that fade at
  the edges, and a seamless symbol loop.

- Removed unused decorative fonts (seven Google Fonts loaded on every page)
  and unused images (about 8 MB).

- Landing page touch-up: copy now only promises what the solver does (no
  "verified" or "no hallucinations" claims), one accent colour taken from the
  logo, tighter hero spacing, no slow or endless animations (the math waves
  pause for reduced motion), and the stock 3D feature images are replaced by
  real slices of the app in a bento grid with a closing sign-up section.

- The landing page shows a "Get started" button to sign-up and the user
  count, and the navbar shows Log in and Sign up on the landing page again.
- Solving requires a verified email (403 `EMAIL_NOT_VERIFIED` otherwise).
  Unverified Users can still log in and see their profile and History.
- The welcome email is sent after verification instead of at sign-up; email
  sign-ups get the Verification Code first.
- Analytics Events and Error Logs are stored in Postgres. Every admin
  endpoint lives in one admin module behind `requireUser` and `requireAdmin`.
  Error Log filters combine, and resolved logs are hidden unless
  `includeResolved=true`.
- Admins sign in normally: the Admin Passcode screen, `POST
  /admin/verify-passcode` and `ADMIN_PASSCODE` are removed (#20).
- Solutions are stored in Postgres. A Solution's id is the id solving
  returned, so opening and deleting a just-solved Problem works (before, the
  stored id was different). Deleting a User deletes their Solutions through a
  database cascade. If saving a Solution fails, solving returns a generic 500
  and no Credit is spent.
- Users are stored in Postgres instead of MongoDB. User ids are now UUIDs,
  so tokens issued before this change stop working and Users log in again.
- Emails are stored lowercase and matched in any letter case.
- Authentication for `/auth/me`, `/api/profile`, `/api/solve` and the admin
  user endpoints runs as `requireUser` / `requireAdmin` middleware. Their 401
  and 403 errors are now `Authentication required` and `Admin access required`.
- `GET /admin/users` falls back to page 1 and 20 per page for invalid values
  and caps `limit` at 100.
- `scripts/create-admin.ts` writes to the database in `DATABASE_URL` instead
  of defaulting to production settings in `.env.prod`.
- Backend moved from Motia to Express 5, run with Bun in development. All
  API paths and response shapes are unchanged.
- Background work (emails, analytics, error logging) runs as plain functions
  after the response instead of Motia events. Saving a solution is now awaited
  so it cannot be lost.
- Package manager for the backend is now Bun (`bun.lock`).

### Fixed

- "Jump to answer" on a phone no longer pushes the whole app up and leaves
  half the screen blank (the app wrapper is `overflow-clip`, which the
  browser cannot scroll, instead of `overflow-hidden`).
- The answer's "Checked by ..." and warning lines use the full width of the
  answer box, so the Copy button no longer squeezes them.

- The answer box no longer shows the answer twice ("x = 2 x = 2"): the text
  line only appears next to the formula when it says something more, and the
  prompt asks for it only when the answer is in words.

- When code proves an AI answer wrong, the AI gets one more try with that
  answer marked wrong. If the second answer is wrong too, the student sees
  "This answer didn't pass our check. Please double-check it." instead of
  a normal-looking answer. Only our code may write the answer's check line;
  the AI's own "check" text is dropped.

- `verifyAnswer` no longer passes an equation answer with a root missing
  (for example only `x = -2` for `x^2 + 5x + 6 = 0`).

- The solver only answers math: text with no math in it gets a 422
  `NOT_MATH` without an AI call, and the AI can also reply "not math". A bare
  expression such as `(log x)^2/x` is solved with its likely task instead of
  being refused, and limits with "infinity" are no longer rejected (#54).

- When both AI models fail, the admin error log now records what each model
  said (for example a 503 or a 404), instead of only "All models failed".
  Students still see the same generic message.
- `*.log` files and Vite's `.vite/` cache are git-ignored.

- Error Logs store the actual Problem text (they stored "Unknown problem").
- Admin dashboard `totalSolutions` counts Solutions (it was always 0).

- "Clear History" in the app: the frontend called `DELETE /api/history`,
  which did not exist. Both that and `DELETE /api/clear-history` now work.

- Admin error filters (`GET /admin/errors?errorCode=...`) and
  `PATCH /admin/errors/:id/resolve` now read query and path params correctly.

### Security

- Sign-up abuse guards: disposable email domains are refused (CC0 list from
  `disposable-email-domains`), a Cloudflare Turnstile check runs on the
  sign-up form, sign-ups are limited to 20 per IP per hour (was 5, so a
  school lab can sign up a class) and solves to 100 per IP per hour (#55).

- Frontend Sentry no longer sends personal data (`sendDefaultPii: false`, so
  no IP addresses), records a screen replay only for visits that hit an error
  (text and images masked), and traces 10% of page loads instead of all.

- `POST /auth/register` no longer accepts `isAdmin`. Before, anyone could
  sign up as an Admin (present since 2025-12-17).
- Google sign-in requires Google to have verified the email, and never
  replaces an existing Google link on an account. Before, an unverified Google
  address could be linked to someone else's NeoMath account.
- `scripts/create-admin.ts` applies the same password rules as sign-up.
- User names are HTML-escaped in emails.
- Failed logins all return "Invalid email or password." and take about the
  same time, so login no longer reveals which emails are registered (#17).
- `GET /api/solution/:id` only returns your own Solutions. Before, any
  logged-in User could open anyone's Solution by id.
- Malformed user ids (in tokens or admin URLs) are rejected before any
  database query and return 401 or 404.
- Removed hardcoded JWT secret fallbacks. The server now refuses to start
  without `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- CORS now only allows the listed frontend origins. Motia's default left
  other origins on a wildcard.

### Removed

- MongoDB: the driver, the bson version pin, the throwaway mongod in the test run and the CI install step. All data lives in Postgres.
- The in-memory solve rate limiter (`backend/src/lib/rate-limit.ts`), which
  could not hold across serverless instances.
- The waitlist and invite system: `POST /api/waitlist`,
  `POST /auth/register-invite`, `POST /auth/refresh-invite`,
  `GET /admin/waitlist`, `POST /admin/invite-user` and
  `POST /admin/resend-confirmation` now return 404, along with the waitlist
  emails and `scripts/create-admin-invite.ts`. Anyone can sign up (ADR-0003).
- `waitlistCount` from `GET /api/public-stats`, which returns `userCount` only.
- Frontend waitlist form, invite-token handling on Register and Login, the
  login page's waitlist-only redirect, and the admin Waitlist tab and page.
- Motia packages, config, Workbench files and Motia-specific agent docs.
- Unused Python example project and Python runtime files.
