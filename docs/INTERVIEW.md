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

The tests are black-box HTTP tests against the real Express app, started
in-process on a random port. They use a throwaway local Postgres database
(dropped and re-migrated on every run) and a throwaway `mongod` in a temp
folder. Before anything connects, a guard checks that both database URLs
point to localhost and stops the run otherwise. Every secret is a dummy, and
the real `.env` is never loaded.

### Intermediate: What do you fake in tests, and why only that?

Only the two services outside our control: the AI solver (Gemini) and the
email sender (Resend). They are slow, cost money, and are not deterministic.
The app receives them through `createApp({ solver, emailSender })`, so tests
pass fakes in: the fake solver returns a fixed Solution, the fake sender keeps
an outbox tests can read. This is dependency injection at the boundary.
Everything inside (routes, repositories, databases) stays real, so tests catch
bugs a mocked repository would hide.

### Intermediate: Why generated SQL migrations instead of `drizzle-kit push`?

`push` changes the database straight from the schema file, with nothing to
review and no history. Generated migrations are plain SQL files committed to
git, so a schema change is reviewed like code, applied the same way
everywhere, and can be read before it runs against production.

### Basic: What is a connection pool and why share one?

Opening a Postgres connection is slow (network handshake, auth). A pool keeps
a few connections open and lends them out per query. Sharing one pool for the
whole app (`src/db/client.ts`) caps how many connections we open, which
matters on Neon where connections are limited.

### Basic: What is a mass-assignment bug? Did this project have one?

It is when an API copies fields from the request body straight into a
database record, so a client can set fields it should never control. Our
sign-up schema accepted `isAdmin` and saved it, so anyone could create an
Admin account by adding `"isAdmin": true`. The fix is to list only the fields
a client may send (zod drops everything else) and set sensitive fields like
`isAdmin` on the server. A test now signs up with `isAdmin: true` and checks
the account cannot reach admin endpoints.

### Intermediate: Why is authentication Express middleware instead of a check in each route?

Before, every protected route copied the same "read header, verify token,
load user, return 401" block, and the error messages drifted apart. Now
`requireUser` runs before the route, loads the User once, and responds 401
itself; `requireAdmin` adds the 403 check. A route reads the User with
`getCurrentUser(req)`. Protection is visible in one place, the router
(`router.get("/admin/users", requireUser, requireAdmin, ...)`), so a missing
check is easy to spot.

### Intermediate: How does the middleware pass the User to the route without `any`?

It stores the User in a `WeakMap` keyed by the request object. A WeakMap does
not keep its keys alive, so the entry disappears when the request is garbage
collected. The alternative, adding a field to Express's global `Request`
type, makes `req.user` exist (as optional) on every route in the app, even
ones without the middleware.

### Intermediate: Two people sign up with the same email at the same moment. What happens?

Both requests can pass the "is this email taken?" check before either one
inserts. The database is the real guard: `email` has a unique constraint, so
the second insert fails with Postgres error `23505`. The repository turns
that into an `EmailTakenError`, and the API answers 409 instead of 500. The
early check stays only to avoid hashing a password for an obvious duplicate.

### Advanced: What can go wrong when "Sign in with Google" links to an existing account by email?

Account takeover. If an email-and-password account exists for `ada@x.com` and
someone signs in with a Google account claiming that address, linking them
hands over Ada's account. Google lets accounts carry addresses it has not
verified, so we only link (or create) when the ID token's `email_verified`
claim is true, and we never replace a Google account that is already linked.

### Intermediate: Why validate that an id is a UUID before querying?

Postgres rejects `WHERE id = 'abc'` on a `uuid` column with an error, which
would surface as a 500. Old tokens also carry 24-character MongoDB ids. The
repository checks the id with `z.uuid()` first and treats anything else as
"not found", so bad ids become a clean 401 or 404 and never reach the
database.

## Dependencies

### Advanced: The server crashed under Bun after a fresh install. What happened?

`^7.0.0` let the MongoDB driver's `bson` package update to a version that calls
a Node API Bun has not implemented. Pinning `bson` to the version from the old
lockfile fixed it. Lesson: caret ranges can pull in new behavior on a fresh
install, and lockfiles are what make installs reproducible.
