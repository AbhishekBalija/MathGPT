# NeoMath API Reference

Base URL: `http://localhost:3000` locally. Production URL will be the Vercel backend project (Phase 3).

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Health Endpoint

### GET /health

Checks that the API runs and the database answers (`select 1`, 3 second limit). The outside uptime check calls it every 15 minutes.

**Response (200):**

```json
{
  "status": "healthy",
  "timestamp": "2025-12-22T00:00:00.000Z"
}
```

**Response (503):** `{ "status": "unhealthy", "timestamp": "..." }`, with no error details, since this endpoint is public.

---

## Auth Endpoints

### POST /auth/register

Register a new user account. While an admin has paused sign-ups in Settings it answers 403 `{ "error": "New sign-ups are paused for now. If you already have an account, log in.", "code": "SIGNUPS_PAUSED" }`.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "8f14e45f-ceea-4e7a-9b1c-2f6c1d0e5a11",
    "email": "user@example.com",
    "emailVerified": false
  }
}
```

Emails are stored lowercase, so `User@Example.com` and `user@example.com`
are the same account. Signing up with an email that is already registered
returns **409**. Any `isAdmin` field in the body is ignored.

Limited to **5 sign-ups per hour per IP**. Over the limit: **429**
`{ "error": "...", "code": "RATE_LIMITED", "retryAfter": <seconds> }`.

---

### POST /auth/login

Login with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "8f14e45f-ceea-4e7a-9b1c-2f6c1d0e5a11",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "isAdmin": false,
    "emailVerified": false
  }
}
```

The email is matched in any letter case. Every failed login (unknown email,
wrong password, or an account that only uses Google) returns the same
**401** `{ "error": "Invalid email or password." }`, so the response never
reveals whether an email is registered. Limited to **10 attempts per 15
minutes per IP** (429 `RATE_LIMITED` with `retryAfter`).

---

### POST /auth/google

Login with Google OAuth. While sign-ups are paused, a Google account with no NeoMath account yet gets 403 `SIGNUPS_PAUSED`; existing students still sign in.

**Request Body:**

```json
{
  "idToken": "google_id_token"
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "8f14e45f-ceea-4e7a-9b1c-2f6c1d0e5a11",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "isAdmin": false,
    "emailVerified": true
  }
}
```

Google Users are verified from the start. If the email already belongs to an
email-and-password User, the Google account is linked to it and the User
becomes verified.

---

### GET /auth/me

Get current authenticated user. **Requires auth.**

**Response (200):**

```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "isAdmin": false,
    "isTeam": false,
    "emailVerified": false,
    "onboarding": "needed",
    "classInfo": null
  }
}
```

`onboarding` is `"needed"` until the student answers or skips the Onboarding
questions, then `"done"`. `classInfo` is their answer, or `null`:
`{ "range": "class_6_8", "helping": false, "board": "cbse", "state": null, "institution": null }`.
Login, sign-up and Google sign-in send the same two fields.

Returns **401** `{ "error": "Authentication required" }` when the token is
missing, invalid, expired, or belongs to a User that no longer exists.

---

### POST /auth/verify-email

Confirm the email with the 6-digit Verification Code sent at sign-up.
**Requires auth.** Only Verified Users can solve.

**Request Body:**

```json
{ "code": "123456" }
```

**Response (200):** `{ "emailVerified": true }`. Also returned if the User
is already verified. The welcome email is sent after the first success.

**Errors (400):** a code that is not 6 digits, a wrong code, an expired code
(codes last 15 minutes), no active code, or 5 wrong attempts already used
(a new code is then required).

---

### POST /auth/resend-verification

Email a new Verification Code, replacing the old one. **Requires auth.**

**Response (200):** `{ "message": "A new code is on its way." }`

**Errors:**

| Status | When                                                              |
| ------ | ----------------------------------------------------------------- |
| 400    | The email is already verified                                     |
| 429    | More than 1 request per minute or 5 per hour. Body includes `code: "RATE_LIMITED"` and `retryAfter` (seconds) |

---

### POST /auth/refresh

Refresh access token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**

```json
{
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

---

### POST /auth/logout

Logout user. **Requires auth.**

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

---

## Reports

### POST /api/solutions/:id/report

The current User says one of their Solutions looks wrong. **Requires auth.**
Body (optional): `{ "reason": "..." }`, at most 500 characters (longer gets
**400**). The report is saved for the admin, with a copy of the
problem and answer, and it is kept even if the student later deletes the
Solution or clears their History (deleting the account removes it). If the Solution came from or went
into the shared cache, that entry is blocked: no other student gets it again.
Someone else's Solution, or an id that is not a Solution, gets **404**
`{ "error": "Solution not found" }`. Limited to 10 reports an hour per
account (**429** `RATE_LIMITED` with a `Retry-After` header), because a
report blocks a shared answer for everyone.

**Response (200):** `{ "success": true }`

---

### POST /api/feedback

Feedback about the app itself (not about one Solution, that is a Report).
**Requires login.** 5 per hour per User; the 6th gets 429 `RATE_LIMITED`.

**Body:**

```json
{
  "kind": "idea",
  "message": "Add a graph of the answer",
  "page": "/app",
  "solutionId": "solution_id"
}
```

- `kind`: `bug`, `idea` or `other`
- `message`: 1 to 1000 characters
- `page` (optional): a path in the app, never a full URL
- `solutionId` (optional): kept only if it is the User's own Solution

**Response (201):** `{ "success": true }`

| Status | Error                          |
| ------ | ------------------------------ |
| 400    | The first problem with the body, e.g. "Please write a message" |
| 401    | Not logged in                  |
| 429    | Too many attempts              |

---

## Solve Endpoints

### POST /api/solve

In maintenance mode it answers 503 `{ "error": "<message>", "message": "<message>", "code": "MAINTENANCE" }` for everyone but admins (team accounts too); admins still solve. The daily limit comes from Settings (default 5); admins have none.

Solve a math problem. **Requires auth and a verified email.** Limited to 5
per minute per User (429 `RATE_LIMITED` with `retryAfter`), separate from the
Daily Limit of 5 per day. An unverified
User gets **403** `{ "error": "...", "code": "EMAIL_NOT_VERIFIED" }`.
Text that is not a math problem gets **422**
`{ "error": "That doesn't look like a math problem. ...", "code": "NOT_MATH" }`.
If the text has no math in it at all, the AI is never called and no Credit is
spent; if the AI decides it is not math, the Credit is spent.

The response has `source`: `"instant"` (plain arithmetic, no AI), `"cache"` (a
solution another student already got, whose answer passed a check; no AI call
and no Credit) or `"ai"`. `solution.content.answer.check` is set only when code
confirmed the answer ("Checked by putting the answer back in." or "Checked by
recomputing."). When code proves the answer wrong, the AI gets one more try
(no extra Credit); if that is wrong too, `solution.content.answer.warning` is
"This answer didn't pass our check. Please double-check it." Both fields are
only ever set by the server, never by the AI.

Also limited to 100 an hour per IP address, sized for a classroom on one
school network. The order of the checks is drawn in
[architecture.md](architecture.md#solve-flow).

**Request Body:**

```json
{
  "problem": "Solve x² + 5x + 6 = 0",
  "method": "quadratic-formula",
  "chatId": "optional_chat_id"
}
```

- `problem`: 1 to 2000 characters.
- `method`: optional. A method id from `header.method.alternatives` of an
  earlier solution, to solve again that way. Letters, digits and dashes.
- `mode`: still accepted for old clients, but ignored. Every solution
  includes a `hint`.

**Response (200):**

```json
{
  "success": true,
  "source": "ai",
  "solution": {
    "id": "8f14e45f-ceea-4e7a-9b1c-2f6c1d0e5a11",
    "createdAt": "2026-10-14T10:00:00.000Z",
    "formatVersion": 2,
    "content": { "formatVersion": 2, "header": { }, "problem": { }, "steps": [ ], "answer": { } }
  }
}
```

`content` is a `SolutionV2`, described with an example for every block type
in [solution-format.md](solution-format.md).

**Errors:**

| Status | Body | When |
|---|---|---|
| 400 | `{ "error": "..." }` | Invalid body |
| 400 | `{ "error": "...", "code": "UNSOLVABLE" }` | A literal division by zero |
| 403 | `{ "error": "...", "code": "EMAIL_NOT_VERIFIED" }` | Email not confirmed yet |
| 422 | `{ "error": "...", "code": "NOT_MATH" }` | Not a math problem |
| 429 | `{ "error": "...", "code": "RATE_LIMITED", "retryAfter": 42 }` | Per-minute or per-IP limit |
| 429 | `{ "error": "...", "resetAt": "...", "dailyLimit": 5 }` | Daily Limit used up |
| 502 | `{ "success": false, "error": "...", "code": "INVALID_OUTPUT" }` | The AI answered twice in a broken format. No Credit spent |
| 500 | `{ "success": false, "error": "..." }` | Both models failed, or saving failed. No Credit spent |

---

## History Endpoints

### GET /api/history

Get user's solution history. **Requires auth.**

**Response (200):**

```json
{
  "success": true,
  "history": [
    {
      "id": "8f14e45f-ceea-4e7a-9b1c-2f6c1d0e5a11",
      "problem": "Solve x² + 5x + 6 = 0",
      "problemType": "algebra",
      "finalAnswer": "x = -2 \\text{ or } x = -3",
      "formatVersion": 2,
      "createdAt": "2025-12-21T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### GET /api/solution/:id

Get one of your Solutions in full. **Requires auth.** The `id` is the one
`POST /api/solve` returned.

**Response (200):**

```json
{
  "success": true,
  "solution": {
    "id": "8f14e45f-ceea-4e7a-9b1c-2f6c1d0e5a11",
    "problem": "2x = 4",
    "problemType": "algebra",
    "steps": [ /* Steps, format 1 only */ ],
    "finalAnswer": "x = 2",
    "summary": "...",
    "formatVersion": 2,
    "content": { /* SolutionV2, or null for format 1 */ },
    "processingTimeMs": 1200,
    "createdAt": "2026-10-07T10:00:00.000Z"
  }
}
```

New solutions have `formatVersion: 2` and their steps in `content`
([solution-format.md](solution-format.md)). Old ones have
`formatVersion: 1`, `content: null` and the old `steps`.

**404** for an id that is not a UUID, does not exist, or belongs to another
User (the response never confirms someone else's id exists).

---

### DELETE /api/solution/:id

Delete one of your Solutions. **Requires auth.**

**Response (200):**

```json
{
  "success": true,
  "message": "Solution deleted successfully"
}
```

**404** in the same cases as `GET /api/solution/:id`.

---

### DELETE /api/history

Clear all your Solutions. **Requires auth.** `DELETE /api/clear-history` is
an older path for the same thing.

**Response (200):**

```json
{
  "success": true,
  "message": "Deleted 5 solution(s)",
  "deletedCount": 5
}
```

---

## Profile Endpoint

### GET /api/profile

Get user profile and usage statistics. **Requires auth.**

**Response (200):**

```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "provider": "email",
    "createdAt": "2025-12-01T00:00:00.000Z"
  },
  "stats": {
    "totalSolutions": 25,
    "problemTypes": {
      "quadratic_equation": 10,
      "linear_equation": 8,
      "calculus": 7
    },
    "lastSolvedAt": "2025-12-22T00:00:00.000Z"
  },
  "dailyCredits": {
    "used": 2,
    "limit": 5,
    "remaining": 3,
    "resetsAt": "2025-12-23T00:00:00.000Z"
  }
}
```

`dailyCredits` drives the "3 of 5 free problems left today" line. Instant
answers and cache hits do not use a Credit. The limit is the Settings value;
for admins `limit` and `remaining` are `null` (no limit). `resetsAt` is the
next midnight India time.

---

### PUT /api/profile/class

Saves the student's Onboarding answer: their Class range and Board, or their
university. **Requires auth.** Every field is written, so switching between
school and college clears what no longer applies.

**Request Body:**

```json
{ "range": "class_9_10", "helping": false, "board": "state", "state": "Karnataka" }
```

- `range`: `class_1_5`, `class_6_8`, `class_9_10`, `class_11_12` or `college`
- `helping`: `true` for a parent or teacher
- `board` (school ranges only, optional): `cbse`, `icse`, `state`, `ib`, `cambridge` or `other`
- `state`: required when `board` is `state`, otherwise not allowed (at most 40 characters)
- `institution` (college only, optional): at most 120 characters, trimmed; empty becomes `null`

**Response (200):** `{ "user": { ... } }`, the same user as `GET /auth/me`.

| Status | Error |
| ------ | ----- |
| 400    | `{ "error": "...", "code": "INVALID_CLASS" }` |
| 401    | Authentication required |

### POST /api/profile/class/skip

Notes that the student skipped Onboarding, so they aren't asked again.
**Requires auth.** A second skip keeps the first time, and an answer already
saved stays. **Response (200):** `{ "user": { ... } }`.

---

### GET /api/app-status

Public, no login. Whether solving is paused and whether new sign-ups are open, from admin Settings. The student app reads it on load.

**Response (200):**

```json
{
  "maintenance": { "on": false, "message": "Neo is taking a short break to get better. Please try again in a little while." },
  "signupsOpen": true
}
```

---

## Internal Endpoints

### GET or POST /internal/daily-summary

Emails every Admin what came in over the last 24 hours: open failed problems with a try in that time, new reports and new feedback. Nothing is sent when nothing came in. Vercel's cron calls it daily at 03:30 UTC (09:00 India time).

**Headers:** `Authorization: Bearer <CRON_SECRET>`. Without `CRON_SECRET` set on the server, it always answers 401.

**Response (200):** `{ "sentTo": 2 }`

| Status | Error       |
| ------ | ----------- |
| 401    | Not allowed |

### GET /internal/monitor

The Monitor Snapshot: how the app is doing right now, as numbers only, so Claude can watch the app without an Admin login. Read-only. Never contains names, emails, problem text or feedback text.

**Headers:** `Authorization: Bearer <MONITOR_SECRET>` (its own secret, not `CRON_SECRET`). Without `MONITOR_SECRET` set on the server, it always answers 401. Limited to 30 calls a minute per IP.

**Response (200):**

```json
{
  "status": { "state": "fine", "failingSince": null },
  "app": { "version": "1.7.0", "commit": "2de4de1" },
  "today": { "solves": 42, "aiUsage": [{ "source": "ai", "model": "gemini-2.5-flash", "count": 30 }] },
  "last24h": {
    "tries": 51,
    "failed": 3,
    "failures": [{ "errorCode": "TIMEOUT", "model": "gemini-2.5-flash", "count": 3 }],
    "guardRejections": { "number": 4, "greeting": 2 }
  },
  "students": { "real": 120, "activeThisWeek": 35 },
  "waiting": { "failedProblems": 2, "blockedReports": 0, "unreadFeedback": 1 },
  "services": [{ "id": "database", "status": "up", "ms": 12, "detail": null }],
  "uptimeCheck": { "lastRunAt": "2026-10-18T06:00:00.000Z", "lastResult": "success", "enabled": true },
  "pendingMigrations": [],
  "settings": { "dailyLimit": 5, "signupsOpen": true, "maintenance": { "on": false, "message": "..." } },
  "speed": { "avgMs": 6200, "p90Ms": 11000 }
}
```

`state` follows the admin Overview: `down` while solving is failing, `attention` while something waits for an Admin, otherwise `fine`.

| Status | Error             |
| ------ | ----------------- |
| 401    | Not allowed       |
| 429    | Too many requests |

---

## Admin Endpoints

> **Note**: All admin endpoints require a normal login with an Admin account (`isAdmin: true`): 401 without a login, 403 for non-Admins. There is no separate admin passcode.

### GET /admin/stats

Get dashboard statistics. **Requires admin.**

**Response (200):**

```json
{
  "totalUsers": 150,
  "totalSolutions": 1250,
  "solutionsByType": {
    "quadratic_equation": 400,
    "linear_equation": 350,
    "calculus": 500
  },
  "recentUsers": [
    {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2025-12-22T00:00:00.000Z"
    }
  ]
}
```

---

### GET /admin/analytics

Event counts by type and the newest 50 events. **Requires admin.**

Query: `event=<name>` (for example `solution_saved`) for one kind only. Without it, or with a name that isn't letters and underscores, every kind is listed.

**Response (200):**

```json
{
  "eventsByType": [
    { "eventName": "solution_saved", "count": 500 },
    { "eventName": "user_login", "count": 250 }
  ],
  "recentEvents": [
    {
      "id": "event_id",
      "eventName": "solution_saved",
      "properties": { "problemType": "calculus" },
      "userId": "user_id",
      "createdAt": "2025-12-22T00:00:00.000Z"
    }
  ],
  "totalEvents": 750
}
```

---

### GET /admin/settings

Current settings and the newest 20 changes. **Requires admin.** Each server copy reads settings at most every 15 seconds, so a change applies everywhere within 15 seconds.

**Response (200):**

```json
{
  "settings": {
    "dailyLimit": 5,
    "signupsOpen": true,
    "maintenance": { "on": false, "message": "Neo is taking a short break to get better. Please try again in a little while." }
  },
  "changes": [
    { "id": "change_id", "key": "dailyLimit", "oldValue": 5, "newValue": 6, "changedAt": "2026-10-15T11:10:00.000Z", "by": { "id": "user_id", "name": "Abhishek" } }
  ]
}
```

`by` is `null` once that admin's account is deleted.

---

### PATCH /admin/settings

Change any of `dailyLimit` (whole number, 1 to 50), `signupsOpen` (boolean) and `maintenance` (`{ "on": boolean, "message": 1 to 300 characters }`). Only values that really change are saved and logged. **Requires admin.**

**Response (200):** the same shape as `GET /admin/settings`.

| Status | Error                             |
| ------ | --------------------------------- |
| 400    | A value is out of range or unknown |

---

### GET /admin/business

Real students, how many come back, what they ask and what it costs. Days and weeks are India time; weeks start on Monday. **Requires admin.**

Query: `includeTeam=true` to count team accounts too (default: left out).

**Response (200):**

```json
{
  "numbers": { "students": 12, "activeThisWeek": 5, "activeRate": 42, "solvesPerActive": 3.4, "limitHits": 2 },
  "newPerDay": [{ "day": "2026-10-15", "count": 1 }],
  "funnel": { "signedUp": 12, "verified": 10, "solved": 8, "cameBack": 4 },
  "cohorts": [{ "weekStart": "2026-10-12", "students": 3, "weeks": [100] }],
  "cost": { "tokensToday": 28680, "avgTokensPerSolve": 2868 },
  "topics": [{ "problemType": "calculus_integral", "count": 9 }],
  "hiddenTeam": 2
}
```

- `newPerDay`: the last 7 days, oldest first
- `activeThisWeek` and `solvesPerActive` cover this India week, Monday to now
- `limitHits`: student-days with 5 or more AI answers, the ones that use the daily free limit (cache and instant answers are free)
- `cohorts`: the last 6 signup weeks, newest first. `weeks[0]` is the signup week and always 100; `weeks[n]` is the percent of that week's students who solved something n weeks later, up to this week. A week with no sign-ups has `weeks: []`
- `cost` counts every solve, team accounts too, since we pay for them all
- `hiddenTeam`: how many team accounts exist

---

### GET /admin/users

List users with pagination and search. **Requires admin.**

**Query Parameters:**

| Param    | Type   | Default | Description             |
| -------- | ------ | ------- | ----------------------- |
| `page`   | number | 1       | Page number             |
| `limit`  | number | 20      | Users per page          |
| `search` | string | -       | Search by name or email |

**Response (200):**

```json
{
  "users": [
    {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "isAdmin": false,
      "isTeam": false,
      "solves": 4,
      "lastSolvedAt": "2026-10-14T17:19:00.000Z",
      "provider": "email",
      "createdAt": "2025-12-01T00:00:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

### PATCH /admin/users/:id/role

Update user admin role. **Requires admin.**

**Request Body:**

```json
{
  "isAdmin": true
}
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "isAdmin": true
  }
}
```

| Status | Error                               |
| ------ | ----------------------------------- |
| 403    | Cannot remove your own admin status |
| 404    | User not found                      |

---

### DELETE /admin/users/:id

Delete a user and their solutions. **Requires admin.**

**Response (200):**

```json
{
  "success": true,
  "deletedSolutions": 15
}
```

| Status | Error                          |
| ------ | ------------------------------ |
| 403    | Cannot delete your own account |
| 404    | User not found                 |

---

### GET /admin/errors

Query: `errorCode`, `userId`, `includeResolved=true`, `limit` (1 to 200,
default 50). Filters combine. Resolved Error Logs are left out unless
`includeResolved=true`, also when filtering by code or User.

Get error logs for admin dashboard. **Requires admin.**

**Query Parameters:**

| Param             | Type    | Default | Description             |
| ----------------- | ------- | ------- | ----------------------- |
| `limit`           | number  | 50      | Max errors to return    |
| `errorCode`       | string  | -       | Filter by error code    |
| `userId`          | string  | -       | Filter by user ID       |
| `includeResolved` | boolean | false   | Include resolved errors |

**Response (200):**

```json
{
  "stats": {
    "total": 50,
    "unresolved": 12,
    "last24Hours": 5,
    "byCode": [
      { "errorCode": "AI_PARSE_ERROR", "count": 8 },
      { "errorCode": "TIMEOUT", "count": 4 }
    ]
  },
  "errors": [
    {
      "id": "error_id",
      "errorCode": "AI_TIMEOUT",
      "errorMessage": "All models failed: gemini-2.5-flash: timed out after 30000ms | backup: timed out after 30000ms",
      "problemText": "Solve x^2 + 1 = 0",
      "userId": "user_id",
      "resolved": false,
      "details": {
        "attempts": [
          { "model": "gemini-2.5-flash", "error": "timed out after 30000ms" },
          { "model": "backup", "error": "timed out after 30000ms" }
        ],
        "promptVersion": "2026-10-15.2",
        "fullMessage": "All models failed: gemini-2.5-flash: timed out after 30000ms | backup: timed out after 30000ms"
      },
      "createdAt": "2025-12-22T00:00:00.000Z"
    }
  ]
}
```

- `problemText` is the whole problem, up to 2,000 characters.
- `errorCode` for a failed solve is one of `AI_RATE_LIMITED`, `AI_TIMEOUT`,
  `AI_UNREACHABLE`, `ALL_MODELS_FAILED` or `UNKNOWN_ERROR`. Other codes such as
  `INVALID_OUTPUT` and `ANSWER_CHECK_FAILED` come from earlier checks. Records
  from before 2026-10-15 may say `Error`.
- `details` is `null` for older records and for failures that never reached
  the AI.

---

### PATCH /admin/errors/:id/resolve

Resolving an already resolved Error Log changes nothing and returns it as it
is, so the record keeps who resolved it first and when.

Mark an error as resolved. **Requires admin.**

**Response (200):**

```json
{
  "message": "Error marked as resolved",
  "error": {
    "id": "error_id",
    "resolved": true,
    "resolvedBy": "admin_user_id",
    "resolvedAt": "2025-12-22T00:00:00.000Z"
  }
}
```

| Status | Error             |
| ------ | ----------------- |
| 400    | Error ID required |
| 404    | Error not found   |

---

### GET /admin/counts

The numbers next to Failed solves, Reports and Feedback in the admin nav.
**Requires admin.**

```json
{ "failedOpen": 5, "reportsBlocked": 1, "feedbackOpen": 0 }
```

`failedOpen` counts problems, not tries: the same problem retried by the same
student (ignoring spacing) counts once.

---

### GET /admin/health

Every service checked live, solving over the last week, speed, and what is
deployed. **Requires admin.** Always 200: a service that is down is reported,
not thrown.

```json
{
  "checkedAt": "2026-10-14T17:20:00.000Z",
  "services": [
    { "id": "database", "status": "up", "ms": 38, "detail": null },
    { "id": "gemini", "status": "down", "ms": null, "detail": "gemini timed out after 3000ms" },
    { "id": "sentry", "status": "key_set", "ms": null, "detail": null }
  ],
  "solving": { "tries24h": 9, "failed24h": 2, "days": [{ "day": "2026-10-14", "tries": 6, "failed": 2 }], "byCode": [{ "errorCode": "AI_TIMEOUT", "count": 2 }] },
  "speed": { "avgMs": 8724, "p90Ms": 14298 },
  "live": {
    "backendCommit": "c43d379",
    "migrations": { "applied": 11, "latest": "0010_admin_redesign", "pending": [] },
    "env": [{ "name": "JWT_SECRET", "set": true }],
    "uptimeCheck": { "lastRunAt": "2026-10-15T09:20:00Z", "lastResult": "success", "enabled": true }
  }
}
```

- `services` are `api`, `database` (runs `select 1`), `gemini` (lists models,
  which uses no daily solves) and `email` (reads the Resend domains), each
  with a 3 second limit. `backup`, `turnstile` and `sentry` only check that
  their key is set (`key_set` or `key_missing`).
- The live checks run at most once a minute; other requests in that minute
  get the same result.
- `env` lists names only, never values.
- `uptimeCheck` is the GitHub Actions "Uptime check" workflow's last scheduled run, read from GitHub's API at most every 10 minutes (every minute after GitHub could not be asked). The `uptime` service is `down` when the workflow is switched off, its last run is over an hour old, or that run failed, and `unknown` when GitHub could not be asked or it has not run yet.

---

### GET /admin/overview

Everything on the admin Overview. **Requires admin.** Days are India days.
Student and business numbers leave out team accounts (admins, and users marked
as team).

```json
{
  "status": { "state": "attention", "failingSince": null },
  "numbers": { "solves": 12, "solvesToday": 7, "realStudents": 1, "teamStudents": 2, "activeThisWeek": 1, "failedTries": 8, "failedTries24h": 2, "tries24h": 9 },
  "solvesPerDay": [{ "day": "2026-10-14", "count": 4 }],
  "aiUsage": { "ai": 7, "backup": 0, "cache": 0, "instant": 0, "tokensToday": 23084, "avgTokensPerSolve": 2868, "limit": null, "resetsAt": "2026-10-15T07:00:00.000Z" },
  "needsYou": [{ "kind": "failed", "id": "error_log_id", "title": "(logx)^2/x", "subtitle": "UNKNOWN_ERROR · 3 tries", "at": "2026-10-10T16:43:00.000Z" }],
  "funnel": { "signedUp": 1, "verified": 1, "solved": 1, "cameBack": 1 },
  "topTopics": [{ "problemType": "calculus_integral", "count": 2 }]
}
```

- `status.state` is `down` while solving alerts are failing, `attention` when
  `needsYou` has items, otherwise `fine`.
- `solvesPerDay` is the last 7 days, oldest first, with zeros.
- `aiUsage.backup` counts AI answers from any model other than the one that
  wrote most of today's. `limit` comes from `AI_DAILY_LIMIT`, or `null`.
  `resetsAt` is the next midnight in California, when Gemini's free tier
  resets.
- `needsYou` is the newest 8 open failed problems, blocked reports and open
  feedback.

---

### PATCH /admin/users/:id/team

Mark an account as team (yours or a tester's), so business numbers leave it
out. **Requires admin.** Admins always stay team.

**Body:** `{ "isTeam": true }`

**Response (200):** `{ "id": "user_id", "isTeam": true }`

| Status | Error          |
| ------ | -------------- |
| 400    | Body is invalid |
| 404    | User not found |

---

### GET /admin/reports

"Something looks wrong" reports from students, newest first. **Requires admin.**

Query: `limit` (1 to 200, default 50).

`cacheStatus` is the shared-cache entry the report blocked: `blocked` (not served
to anyone), `shared` or `unchecked` (an Admin unblocked it), or `null` (an
instant answer, which is never cached).

**Response (200):**

```json
{
  "reports": [
    {
      "id": "report_id",
      "problemText": "If y = log(sec x + tan x), then dy/dx is equal to:",
      "answerText": "\\sec x",
      "reason": null,
      "cacheStatus": "blocked",
      "createdAt": "2026-10-14T16:34:39.709Z"
    }
  ]
}
```

---

### POST /admin/reports/:id/unblock

The report was a mistake, so the answer it blocked goes back to how it was:
`shared` if it passed a check, `unchecked` if it never did (unchecked answers
are still not served). This applies to every report on the same answer.
**Requires admin.**

**Response (200):**

```json
{ "cacheStatus": "shared" }
```

| Status | Error                                         |
| ------ | --------------------------------------------- |
| 404    | Report not found                              |
| 409    | This report has no blocked answer to unblock |

---

### GET /admin/feedback

Feedback from Users, newest first, with the sender's name, id and email. **Requires admin.**

Query: `includeDone=true` to include done items, `limit` (1 to 200, default 50).

**Response (200):**

```json
{
  "feedback": [
    {
      "id": "feedback_id",
      "kind": "idea",
      "message": "Add a graph of the answer",
      "page": "/app",
      "solutionId": null,
      "userId": "user_id",
      "name": "Asha",
      "email": "student@example.com",
      "done": false,
      "createdAt": "2026-10-14T17:00:00.000Z"
    }
  ]
}
```

---

### PATCH /admin/feedback/:id/done

Mark Feedback as read and handled. **Requires admin.**

**Response (200):** `{ "done": true }`

| Status | Error              |
| ------ | ------------------ |
| 404    | Feedback not found |

---

### GET /admin/failed

Failed problems: one row per student and problem, newest first. Retries of the same problem are one row with several tries. **Requires admin.**

Query: `status=open|resolved|all` (default `open`). At most 200 rows; `problems` and `tries` count all of them.

**Response (200):**

```json
{
  "groups": [
    {
      "id": "newest_error_log_id",
      "problem": "(logx)^2/x",
      "tries": 3,
      "firstAt": "2026-10-10T16:37:00.000Z",
      "lastAt": "2026-10-10T16:43:00.000Z",
      "errorCode": "AI_TIMEOUT",
      "ms": 8400,
      "student": { "id": "user_id", "name": "Shashi" },
      "workedLater": false,
      "resolved": false
    }
  ],
  "problems": 5,
  "tries": 7
}
```

`student` is `null` once the student deleted their account. `workedLater` is true when they solved the same problem after the last failed try.

---

### GET /admin/failed/:id

One failed problem, by any of its error log ids, with every try oldest first. **Requires admin.**

**Response (200):** the group above plus

```json
{
  "attempts": [
    {
      "at": "2026-10-10T16:37:00.000Z",
      "ms": 8400,
      "errorCode": "AI_TIMEOUT",
      "details": {
        "attempts": [{ "model": "gemini-2.5-flash", "error": "timed out after 25000ms" }],
        "promptVersion": "v2026-10-09",
        "fullMessage": "All models failed: gemini-2.5-flash: timed out after 25000ms"
      }
    }
  ]
}
```

`details` is `null` for failures saved before details were kept.

| Status | Error                 |
| ------ | --------------------- |
| 404    | Failed solve not found |

---

### POST /admin/failed/:id/resolve

Resolves every open try of the failed problem. **Requires admin.**

**Response (200):** `{ "resolved": 3 }`

| Status | Error                 |
| ------ | --------------------- |
| 404    | Failed solve not found |

---

### GET /admin/reports/:id

One report, with the full solution, who sent it and whether code checked the answer. **Requires admin.**

**Response (200):**

```json
{
  "id": "report_id",
  "problemText": "If y = log(sec x + tan x), find dy/dx",
  "answerText": "\\sec x",
  "reason": "Step 2 is wrong",
  "cacheStatus": "blocked",
  "checkedByCode": false,
  "solution": { "formatVersion": 2, "steps": [], "answer": { "latex": "\\sec x" } },
  "solvedAt": "2026-10-14T16:33:00.000Z",
  "student": { "id": "user_id", "name": "Abhi" },
  "createdAt": "2026-10-14T16:34:00.000Z"
}
```

`solution` and `solvedAt` are `null` once the student deleted the solution.

| Status | Error            |
| ------ | ---------------- |
| 404    | Report not found |

---

### GET /admin/students/:id

One student: who they are, what they did and today's free limit. **Requires admin.**

**Response (200):**

```json
{
  "id": "user_id",
  "name": "Shashi",
  "email": "shashi@example.com",
  "provider": "google",
  "joinedAt": "2026-10-10T10:00:00.000Z",
  "isAdmin": false,
  "isTeam": false,
  "solves": 4,
  "failed": 5,
  "reports": 0,
  "usedToday": 1,
  "dailyLimit": 5,
  "history": [{ "kind": "solved", "title": "Integrate x^2 dx", "at": "2026-10-14T17:19:00.000Z" }]
}
```

`history` is the newest 20 of `solved`, `failed`, `reported` and `joined`.

| Status | Error             |
| ------ | ----------------- |
| 404    | Student not found |

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

| Status Code | Description                             |
| ----------- | --------------------------------------- |
| 400         | Bad Request - Invalid input             |
| 401         | Unauthorized - Invalid or missing token |
| 403         | Forbidden - Insufficient permissions    |
| 404         | Not Found - Resource doesn't exist      |
| 500         | Server Error - Something went wrong     |

---

_Last updated: December 22, 2025_
