# Interview Notes: How and Why NeoMath Was Built

Questions an interviewer might ask about this project, from basic to advanced,
with short answers grounded in the real code.

## Backend framework

### Basic: Why did you move from Motia to Express?

Motia was an early-stage framework (0.17 beta) and its future became
uncertain. Express is mature, widely known, and runs anywhere Node runs,
including Vercel. Our business logic (services, repositories) never imported
Motia, so only the thin HTTP layer had to change.

### Basic: What does `app.ts` vs `server.ts` separation buy you?

`app.ts` builds the Express app but never listens on a port. `server.ts`
listens for local development. Serverless platforms like Vercel import the app
and handle the networking themselves, so the same app works in both places.

### Intermediate: Why do routes return `{ status, body }` instead of calling `res.json()`?

It keeps route code as plain functions: easy to read and easy to test without a
fake `res` object. One adapter (`lib/http.ts`) converts the result into an
Express response. This is the adapter pattern: a small layer that translates
between our code's shape and a library's shape.

### Intermediate: How is request validation done?

With zod schemas. `routeWithBody(schema, handler)` validates the JSON body
before the handler runs and returns a 400 with the first error message. The
handler receives the parsed body already typed, so there is no `any`.

### Intermediate: How does the server avoid leaking internal errors?

A final Express error handler returns `{ error: "Internal server error" }` and
logs the real message server-side. Malformed JSON gets a clean 400. Unknown
paths get a JSON 404. Stack traces never reach the client.

## Background work

### Intermediate: How do emails and analytics run without slowing responses?

`runInBackground(name, task)` starts the task without awaiting it and logs any
failure. The response goes out immediately. Saving a solution is the exception:
it is awaited, because losing a user's solution is worse than a few
milliseconds of latency.

### Advanced: Why is fire-and-forget risky on serverless, and what is the fix?

On Vercel a function can be frozen as soon as it sends the response, which can
cut off unfinished background work. The fix is `waitUntil()` from
`@vercel/functions`, which tells the platform to keep the function alive until
the promise settles. That is planned for the deploy phase.

## Security

### Basic: Why does the server refuse to start without `JWT_SECRET`?

The old code fell back to a hardcoded secret that was visible in the public
repo. Anyone could have signed their own tokens, including admin ones. Failing
fast at startup (`lib/env.ts`) makes a missing secret impossible to miss.

### Intermediate: How is rate limiting implemented?

A sliding window: we keep timestamps of each user's recent solve requests and
reject the request if there are already 5 in the last 60 seconds, returning 429
with `retryAfter`. It lives in memory today; on serverless each instance has
its own memory, so it moves to Postgres in the database phase.

### Intermediate: How do you test a backend safely?

The tests are black-box HTTP tests. They run against a throwaway local MongoDB
with dummy email and AI keys, and Bun's automatic `.env` loading is turned off
(`--no-env-file`) so the real secrets and databases are never touched.

## Dependencies

### Advanced: The server crashed under Bun after a fresh install. What happened?

`^7.0.0` let the MongoDB driver's `bson` package update to a version that calls
a Node API Bun has not implemented. Pinning `bson` to the version from the old
lockfile fixed it. Lesson: caret ranges can pull in new behavior on a fresh
install, and lockfiles are what make installs reproducible.
