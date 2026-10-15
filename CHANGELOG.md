# Changelog

What changed in NeoMath, newest first. Versions follow [SemVer](https://semver.org):
a new feature bumps the minor number (1.**2**.0), a fix bumps the patch number
(1.2.**1**), and a change that breaks how people use the app bumps the major
number (**2**.0.0). The frontend and backend share one version.

## [1.4.0] - 2026-10-15

### Added
- Admin **Settings** page (under Control): free problems per day (1 to 50), new sign-ups on or off, and maintenance mode with a message. Changes apply within 15 seconds with no deploy, and every change is logged with who made it (#119)
- In maintenance mode students see the admin's message in place of the Solve button; admins and team accounts can still solve. The Overview and the nav show when something is paused
- While sign-ups are paused the sign-up page says so, and new email or Google accounts are refused; existing students still log in
- Admins have no daily limit ("No daily limit (admin)")

### Changed
- The free-problems line and the daily-limit message use the real limit from Settings, not a fixed 5

## [1.3.2] - 2026-10-15

### Fixed
- The daily free limit now resets at midnight India time, not at 05:30 IST (midnight on the server's UTC clock), and the reset time students are told is right too (#106)

## [1.3.1] - 2026-10-15

### Fixed
- Health showed Email as down with a send-only Resend key, which can send but can't list domains. It now shows as up

## [1.3.0] - 2026-10-15

The last step of the admin redesign.

### Added
- Alert emails to every admin: "solving is failing" after 3 AI-provider failures in a row or in 10 minutes, and "solving is back" when it works again. Off until `ALERT_EMAILS_ENABLED=true`
- A daily summary email at 09:00 India time with what came in over the last 24 hours
- An outside uptime check (GitHub Actions, every 15 minutes) that emails the owner when the site stops answering, with its last run shown on Health

### Changed
- `GET /health` now checks the database and answers 503 when it can't reach it

## [1.2.0] - 2026-10-15

### Added
- Business page: real students, who is active, solves per active student, daily-limit hits, new students per day, the funnel, weekly cohorts (do students come back?), token cost and top topics. Team accounts are left out unless you tick "Include team accounts"

## [1.1.0] - 2026-10-15

The admin panel redesign, steps 1 to 5 of 7.

### Added
- New admin layout: nav grouped into Watch, Handle and People, with counts, and a link for every item (#109)
- Overview: Neo says if anything is wrong, today's numbers, solves per day, AI usage, what needs you, and the sign-up funnel (#110)
- Team accounts: our own accounts are left out of student and business numbers (#110)
- Health: every service checked live, solving over the week, speed, and what is deployed, with a health report for Claude (#111)
- Failed solves grouped by student and problem, with tries and "worked on the next try" (#112)
- Reports, Feedback, Students and Events pages with details beside the list (#112)
- Copy for Claude on failed solves, reports and feedback, never with a name or email (#112)
- Undo for small admin actions, and a confirm step for big ones (#112)

### Changed
- Every failed solve now keeps a real error code, what each model said and the prompt version; every solve records its source and model (#108)

## [1.0.0] - 2026-10-14

The first version with all the basics: students sign up, solve, and get
checked step-by-step answers, and the owner can run it from an admin panel.

### Added
- Express 5 backend on Bun, on Postgres (Neon) with Drizzle, deployed on Vercel (#2, #18, #23, #24, #26, #28, #30)
- Open sign-up with email verification, Google sign-in, and per-IP limits and abuse guards (#19, #21, #22, #76)
- The redesigned solver: typed solution blocks, answers that fit the student's level, and the history list (#48, #50, #92)
- AI failover to a backup model, and answers checked by code before they are trusted (#49, #71, #74)
- A shared cache of confirmed answers, so one problem is not paid for twice (#72, #77)
- Students can report a wrong answer, which stops it being shared, and send feedback about the app (#73, #95, #98)
- The NeoMath brand with π-Neo, and new sign-in and sign-up pages (#37, #42)
- Sentry alerts for the backend and frontend (#67)
- CI runs lint, typecheck and tests on every PR, and deploys stop when a migration is missing (#15, #31)

### Fixed
- Sign-up could grant admin rights, and login could reveal which emails are registered (#16, #25)
- Many solver fixes: long Gemini answers, powers of brackets in the answer check, word problems, LaTeX in history (#83, #87, #91, #93)
