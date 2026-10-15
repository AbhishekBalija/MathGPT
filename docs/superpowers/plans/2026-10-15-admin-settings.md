# Admin Settings: plan

Spec: `docs/superpowers/specs/2026-10-15-admin-settings-design.md`.
Two PRs. TDD for every task: write the failing test, watch it fail, implement,
watch it pass. A fresh reviewer per PR. Version 1.4.0 lands with PR B.

## PR A: Settings backend (`feat/settings-backend`), with a migration

The owner applies `0011_settings` to Neon preview and production before merge.

### Task 1: Tables and the settings store
- Schema: `appSettings`, `settingChanges` (see spec). `bun run db:generate --name settings`.
- `backend/src/modules/settings/settings.ts`:
  - `type Settings = { dailyLimit: number; signupsOpen: boolean; maintenance: { on: boolean; message: string } }` and `DEFAULT_SETTINGS`
  - `getSettings(): Promise<Settings>`, cached 15 s per server copy; `resetSettingsCache()` for tests
  - `updateSettings(change: Partial<Settings>, adminId): Promise<Settings>`: one transaction, writes only keys whose value changed, adds one `setting_changes` row per key, clears this copy's cache
  - `recentChanges(limit)`: newest first, with the admin's name (null once deleted)
- Tests (`tests/settings.test.ts`): defaults with no rows; an update logs old and new; saving the same value logs nothing; a bad value is refused by the route (Task 2).

### Task 2: Admin endpoints
- `GET /admin/settings`, `PATCH /admin/settings` (zod: dailyLimit int 1 to 50, message trimmed 1 to 300).
- Tests: 400 for 0, 51 and an empty message; 403 for a non-admin; PATCH gives the new values and the change.

### Task 3: The rules use the settings
- `daily-limit.ts` takes the limit from settings; admins get no limit (`limitFor(user, settings)` returns `null` for admins).
- Solve route: maintenance on and the user is neither admin nor team gives 503 `MAINTENANCE` with the message, before the cache and the AI. Daily limit uses the setting.
- Register route and `AuthService.googleLogin`: with sign-ups paused, a new account gives 403 `SIGNUPS_PAUSED`; an existing Google user still logs in.
- Profile: `dailyCredits.limit` and `remaining` are `null` for admins.
- Student detail: `dailyLimit` from settings, `null` for admins.
- Business `limitHits` uses the current limit.
- Tests: each rule, including "a team account can solve during maintenance" and "a solve after raising the limit to 6 works for a student who used 5".

### Task 4: `GET /api/app-status`
- Public. `{ maintenance: { on, message }, signupsOpen }`.
- Test: no login needed; follows a PATCH.

### Task 5: Health report and docs
- Health report gets the newest 5 changes.
- `docs/api-reference.md`, `CONTEXT.md` (Setting, Maintenance mode, Sign-ups paused).

## PR B: Settings page and the student app (`feat/settings-page`)

### Task 6: Settings page
- `/admin/settings` under a new "Control" nav group; the mockup's layout.
- Limit: − / +, Save, Undo before saving. Sign-ups and maintenance: confirm before pausing, none to undo.
- Change log: newest 20, "You" for the viewer.
- Tests: Save sends `{ dailyLimit: 6 }`; turning maintenance on asks first and sends nothing until confirmed; turning it off sends at once; the log says "You changed …".

### Task 7: The student app
- `appStatus` service and a small store, loaded on app start and after a 503 `MAINTENANCE` or 403 `SIGNUPS_PAUSED`.
- Composer: the message in place of Solve while maintenance is on (unless the user is admin or team).
- Register page and Google button: the paused notice; the button disabled.
- Profile: "No daily limit (admin)" when `limit` is null.
- Tests for each.

### Task 8: Overview and nav
- Neo line: amber "Maintenance mode is on: students can't solve" while on.
- Nav: "Paused" tag next to Settings while maintenance is on or sign-ups are paused.
- Screenshots (laptop and phone, light and dark), CHANGELOG 1.4.0, PR.
