# Postgres on Neon with Drizzle and the pg driver

We moved from MongoDB to Postgres because the data is relational (Users own Solutions, Error Logs point at Users) and we want foreign keys, cascades and transactions. Neon hosts preview and production; local development and tests use a local Postgres. We use Drizzle as the ORM with the standard `pg` TCP driver rather than Neon's serverless HTTP driver, because the HTTP driver cannot talk to a local Postgres and does not support the interactive transactions sign-up needs.

## Consequences

- Schema changes go through generated SQL migration files that are committed and reviewed, never `drizzle-kit push`.
- `problem_type` is a `text` column, not a Postgres enum, so adding Problem Types when we change AI models needs no migration. The allowed values are enforced in TypeScript and zod.
- A Solution's primary key is the UUID the solver generates, so the ID returned by the solve endpoint is the same ID used to fetch or delete it.
