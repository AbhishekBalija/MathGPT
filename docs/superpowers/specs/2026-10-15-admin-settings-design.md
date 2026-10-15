# Admin Settings

The owner changes the daily free limit, pauses new sign-ups, and turns on
maintenance mode from the admin panel, with no deploy. Every change is logged.
Agreed with the owner on 15 Oct 2026 (two grilling rounds). Look: the Settings
screen in `admin-business-health-settings-v4.html`.

## The settings

| Setting | Values | Default | Confirm? |
| --- | --- | --- | --- |
| Free problems per day | 1 to 50 | 5 | No: − / +, then Save; Undo puts the old number back before saving |
| New sign-ups | open / paused | open | Pausing asks first; opening again does not |
| Maintenance mode | off / on, plus a message (1 to 300 characters) | off, "Neo is taking a short break to get better. Please try again in a little while." | Turning on asks first; turning off does not |

`AI_DAILY_LIMIT` (the Gemini quota shown on the Overview) stays an env var.

## How each one behaves

**Free problems per day**
- Applies at once. What a student already used today still counts: lowering it
  can block them now, raising it gives more now.
- The day is the India day (midnight IST, #106).
- Admins have no limit. Their profile says "No daily limit (admin)" and the API
  sends `limit: null`. The Students page says the same for admins.
- Team accounts that are not admins keep the limit.

**New sign-ups paused**
- Email sign-up and Google sign-in both refuse to make a new account, with
  `403 { code: "SIGNUPS_PAUSED" }`.
- Existing students, Google ones too, log in as usual.
- The sign-up page shows "New sign-ups are paused for now. If you already have
  an account, log in." and the button is disabled.

**Maintenance mode**
- Only solving pauses: `503 { code: "MAINTENANCE", message }`.
- Students can still log in and open saved solutions. The composer shows the
  message in place of the Solve button.
- Admins and team accounts can still solve, so the owner can test a fix.
- A solve already running finishes.
- No auto-off. While it is on, the Overview's Neo line says "Maintenance mode
  is on: students can't solve" (amber) and the nav shows a "Paused" tag.

## Applying changes

- Each server copy reads settings at most every 15 seconds (cache), so a change
  applies everywhere within 15 seconds. The page says so.
- A change by this server copy clears its own cache at once.
- `GET /api/app-status` (public, no login) gives
  `{ maintenance: { on, message }, signupsOpen }`. The student app reads it on
  load, and again when a solve or sign-up is refused.

## Change log

- Every change: who, when, which setting, old value, new value. Kept forever.
- The page shows the newest 20, e.g. "You changed free problems per day from
  5 to 6 · 15 Oct, 16:40" ("You" for the viewer, otherwise the admin's name).
- The Health report for Claude includes the newest 5 (setting names and values
  only, never a name or email).
- No email on a change while there is one admin.

## Data

Migration `0011_settings` (owner applies it to Neon preview and production
before the backend PR merges):

- `app_settings`: one row per setting. `key` text primary key, `value` jsonb,
  `updated_at`, `updated_by` (user id, set null on delete). A missing row means
  the default.
- `setting_changes`: `id`, `key`, `old_value` jsonb, `new_value` jsonb,
  `changed_by` (set null on delete), `changed_at`; index on `changed_at desc`.

## Endpoints

- `GET /admin/settings` gives the current values and the newest 20 changes.
- `PATCH /admin/settings` with any of `{ dailyLimit, signupsOpen, maintenance:
  { on, message } }`, validated with zod. It saves only what changed, logs
  each change, and gives the same shape as GET.
- `GET /api/app-status`, public, as above.

## Not in this round

- Emailing other admins about changes
- Auto-off for maintenance mode
- Moving `AI_DAILY_LIMIT` into Settings
- Per-student limits
