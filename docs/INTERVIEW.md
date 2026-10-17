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

A fixed window per key (`solve:user:<id>`, `login:ip:<ip>`,
`register:ip:<ip>`) stored in a Postgres `rate_limits` table, checked and
incremented in one atomic upsert. It started as an in-memory sliding window,
but on serverless every instance has its own memory, so a client could get
around it by hitting different instances. A shared table holds across all of
them. Over the limit: 429 with `code: "RATE_LIMITED"` and `retryAfter`.

### Intermediate: How do you get the real client IP behind a proxy, and why not just read X-Forwarded-For?

Clients can send any `X-Forwarded-For` they like. Vercel's proxy overwrites
that header with the address it actually saw, so behind Vercel the header is
trustworthy. Express's `trust proxy` set to 1 means "trust exactly one proxy
hop", and `req.ip` then returns the address from that hop. The catch: this is
only safe when a proxy really sits in front. If the server were reachable
directly, a client could send a new fake address with every request and never
hit a per-IP limit. So "always deploy behind the proxy" is part of the design,
and is written down next to the middleware.

### Intermediate: How do you test a backend safely?

The tests are black-box HTTP tests against the real Express app, started
in-process on a random port. They use a throwaway local Postgres database
(dropped and re-migrated on every run). Before anything connects, a guard
checks that the database URL points to localhost and the database name ends
in `_test`, and stops the run otherwise. Every secret is a dummy, and the
real `.env` is never loaded.

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

### Intermediate: Why store a 6-digit code as an HMAC instead of a plain hash or bcrypt?

There are only a million possible codes. With a plain SHA-256, anyone holding
a leaked table can try all of them in under a second and find each code.
bcrypt slows that down but does not stop it. An HMAC keyed with a server
secret (which is not in the database) makes the stored value useless on its
own, and binding it to the User id stops one User's hash from matching
another's. The comparison uses `timingSafeEqual`, so response time leaks
nothing.

### Advanced: How do you stop parallel guesses from going past "5 attempts"?

If the code is read, checked, and only then counted, 10 parallel requests can
all read `attempts = 0` and all get a guess. Instead each attempt is claimed
first with one statement, `UPDATE ... SET attempts = attempts + 1 WHERE
attempts < 5 RETURNING ...`. Postgres runs these one at a time on the row, so
only 5 ever succeed; the rest get no row back. A test fires 10 guesses at once
and then checks that even the right code is refused.

### Intermediate: How does a fixed-window rate limit work in one SQL statement?

`INSERT ... ON CONFLICT (key) DO UPDATE` either creates the counter or, in
the same statement, starts a new window if the old one has passed or adds 1.
`RETURNING count` tells you whether this request is over the limit. Because it
is one atomic statement in a shared database, it holds across every serverless
instance, which an in-memory counter cannot.

## Dependencies

### Advanced: The server crashed under Bun after a fresh install. What happened?

`^7.0.0` let the MongoDB driver's `bson` package update to a version that calls
a Node API Bun has not implemented. Pinning `bson` to the version from the old
lockfile fixed it. Lesson: caret ranges can pull in new behavior on a fresh
install, and lockfiles are what make installs reproducible.

## Frontend and design

### Intermediate: Why is the logo an SVG instead of text in the logo font?

The font (Honk) is a colour font: each letter is three layers filled with
gradients, stored in the COLRv1 table. Not every browser supports COLRv1, and a
text logo also waits for the font file to load. Copying the layers and
gradients into a plain SVG ("baking" it) gives the same look everywhere, with
no font download and no flash of a fallback font.

### Intermediate: How does one component make the logo responsive?

Every size in `Logo` is a multiple of one CSS length, the word's height. The
caller passes `height="var(--logo-h)"` and sets the variable per breakpoint
(`[--logo-h:24px] md:[--logo-h:30px]`). `calc()` then scales the word, places
the mascot on the `h` and reserves space above it, so nothing is re-measured
in JavaScript.

### Basic: Why does the dark theme use a pinker text colour than the light one?

Contrast. WCAG asks for at least 4.5:1 for normal text. The logo pink is about
3.2:1 on white, so light mode uses a darker pink (4.9:1), and dark mode uses a
lighter one (7.1:1 on near-black). The bright logo pink is kept for shapes,
where the rule does not apply.

## Operations

### Intermediate: Production failed every long solve, but the same code worked locally. Why?

Production was not running that code. A Vercel "Redeploy" rebuilds the commit
of the deployment you click, so redeploying an old one put code from before a
fix back live. The old code gave up after about 8 seconds, so any problem that
took the AI longer failed. Lesson: after any deploy, check which commit is
live (`vercel inspect <domain>`), and keep the real error reason in your logs,
not just a generic "all models failed".

### Intermediate: Why call `Sentry.flush()` after reporting an error on Vercel?

A serverless function can be paused as soon as the response is sent. Sentry
sends events in the background, so without waiting for `flush()` (inside
`waitUntil`) the alert might never leave the server.

### Advanced: What should an error tracker never collect in an app used by children?

Request bodies (passwords, the problems students type), headers (login tokens),
cookies and user details. Sentry collects several of these by default, so we
turn each one off and send only an opaque user id and an error code.

## Checking AI answers

### Intermediate: How do you check an AI's integral without solving it yourself?

Differentiate the AI's answer and compare it with the integrand. Antiderivatives
are hard to find but easy to check, and the "+ C" disappears when you
differentiate. We compare at 12 random points instead of proving the two are
equal symbolically, which is simpler and good enough: two different
expressions almost never agree at 12 random points.

### Advanced: The AI's answer is untrusted text. How do you run it as math safely?

Never `eval` it and never call `mathjs.evaluate` on the string. Parse it into a
tree first, then walk the tree and refuse it unless every node is on an
allowlist (numbers, the one variable, `pi`, `e`, `+ - * / ^`, and a short list
of functions like `sin` and `log`), it has at most 200 nodes and it is at most
30 deep. Only then compile it and run it with a scope that holds just the
variable. An allowlist is safer than a blocklist because anything new or
unexpected is refused by default.

### Intermediate: Why draw fresh random points on every check?

A fixed list of points can be gamed: an answer can be wrong everywhere except
at those points. Fresh points each time make that impossible to rely on.

### Intermediate: How do you share AI answers between users without spreading a wrong one?

Only share an answer after an independent check. First code: put the roots
back in, or differentiate an integral. If code cannot check it, ask a model
from a different company for just the final answer and share only if the two
agree. Two models from one company can make the same mistake. Until then the
answer stays private to the student who asked, and a report blocks it for good.

### Intermediate: Why does the second model answer in plain text instead of JSON?

LaTeX is full of backslashes, and models often forget to escape them in JSON.
`"\frac{1}{3}"` written with one backslash is still valid JSON, because `\f` is
the form-feed escape, so the answer silently turns into a control character
plus "rac{1}{3}". For a one-line answer, plain text avoids the problem completely.

### Basic: Why is a cache entry keyed on the prompt version?

When the prompt changes, solutions written under the old prompt may not follow
the new rules. Putting the version in the key means old entries are simply
never found again, with no clean-up job.

### Advanced: A library call froze the server on "(x+1)^5 = 32". Why, and how do you avoid it?

To know whether the AI listed every root, we needed the equation's degree,
and used mathjs `rationalize`. It expands polynomials in a way that grows
exponentially with the power: `(x+1)^4` took 0.2 s and `(x+1)^5` ran past
15 s. JavaScript runs one thing at a time, so a long synchronous call blocks
every other request on that server, not just this one. The fix was a small
function of our own: keep each polynomial as a list of coefficients, and
multiply lists directly, with a cap on the degree (12). The lesson: anything
that runs on user input needs a known upper bound on its work. Time it on
the worst inputs you can think of, not just the usual ones.

## Solving with AI

### Intermediate: Why try the backup model only after the primary fails, instead of racing both?

A race (`Promise.race` on two models) is faster when the primary is slow,
but it pays for two answers on every problem, and our first version had a
worse bug: a backup that failed fast rejected the race and threw away a
primary that was still working. Sequential failover runs the backup only
after the primary has failed or passed its time limit, so we pay for one
answer in the normal case and a broken backup can never hurt a working
primary. The cost is a slower answer on the rare failover.

### Intermediate: Why check the model's JSON with zod and retry once?

A model's reply is untrusted input, just like a request body. It can miss
fields, add the wrong types, or break the JSON with LaTeX backslashes. The
zod schema (`SolutionV2`) is the contract: the reply is parsed against it
before anything is saved or shown, and the cache checks it again on the way
out. A single retry fixes most bad replies, because they are random, not
systematic. A second failure becomes a friendly error with no Credit spent,
instead of a broken page or a retry loop that burns money.

### Basic: Why must a migration only add things before the code that uses it ships?

Production applies the migration first and the new code goes live a little
later. In between, the old code runs against the new schema. Adding a
nullable column or a new table is invisible to old code, so nothing breaks.
Renaming or dropping a column would crash the old code the moment the
migration runs. So: add first, ship the code, and remove the old thing in a
later release once no running code needs it. That is how this redesign's
four migrations went to production before the merge.

## Abuse guards

### Intermediate: Your robot check needs a secret. What happens if it is missing?

It depends on where. Locally and in tests we skip the check, so nobody needs
Cloudflare keys to work on the app. In production a missing secret refuses
every sign-up ("fail closed"). Letting everyone through would quietly switch
off the protection; refusing sign-ups is loud and gets fixed fast.

### Basic: Why limit by IP address as well as by account?

A per-account limit stops one account from overusing the AI, but one person
can make many accounts. A per-IP limit caps what one machine can do across all
its accounts. It has to be generous, because a whole school can share one IP.

### Intermediate: How do you block "a@x.mailinator.com" as well as "a@mailinator.com"?

Check the domain and every parent domain: x.mailinator.com, then
mailinator.com. Comparing with `endsWith` would be wrong, because
"schoolmailinator.com" ends with "mailinator.com" too.

### Intermediate: Why run the second-model check only on the second ask?

Sharing exists to save AI calls on repeated problems, but most problems are
asked once. Checking every unchecked answer straight away would nearly double
the cost of word problems and proofs for no benefit. Waiting for a second ask
means we only pay for the check when sharing can actually pay it back.


### Intermediate: How do you keep an input filter easy to grow without breaking real input?

The Problem Guard reads the text once into a small "shape" (numbers, words,
operators, the sides of `=`), then runs an ordered list of small rules. The
first rule that matches wins, so the order decides which reply a student
sees. It's the chain-of-responsibility idea, kept as a plain array: adding a
case means adding one rule file or one word, never touching the route.

### Intermediate: What is a table-driven test, and why use one for the guard?

All cases live in one table: "must block, with this reason" rows and "must
pass" rows. One test loops over the table. The must-pass rows are the
important half: real problems that look close to blocked ones ("a bomb of
mass 12 kg explodes", "a story book costs ₹120"). They caught several word
lists that were too broad while the guard was being built.

### Basic: Why not use a small AI model to decide "is this math?"

Each check would be an AI call, and saving AI calls is the reason the guard
exists. Cheap rules catch the obvious cases for free, and the solving AI is
still the backstop for anything subtle that gets past them.
