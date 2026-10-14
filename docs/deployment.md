# Deployment Guide

How NeoMath is deployed: two Vercel projects from this repo plus a Neon
Postgres database.

## Overview

```mermaid
flowchart LR
    U[Browser] --> F["Frontend<br/>Vercel project math-gpt<br/>root: frontend/"]
    F -->|"VITE_API_URL_PROD"| B["Backend<br/>Vercel project neomath-api<br/>root: backend/, Bun runtime, sin1"]
    B -->|"DATABASE_URL (pooled)"| N[("Neon Postgres<br/>Singapore")]
    B --> G[Gemini / OpenRouter]
    B --> R[Resend email]
```

| Component | Platform            | Notes                                         |
| --------- | ------------------- | --------------------------------------------- |
| Frontend  | Vercel (`math-gpt`) | Vite, root directory `frontend`               |
| Backend   | Vercel (`neomath-api`) | Express on the Bun runtime, region `sin1`  |
| Database  | Neon                | Postgres in Singapore, next to the functions  |

Both Vercel projects deploy `main` to production and every PR to a preview.

---

## Backend on Vercel

The backend is an Express app. Vercel serves `backend/src/app.ts`: it imports
`express` and default-exports the app, which is what Vercel's Express
detection needs. `src/server.ts` only listens, for local development.
`backend/vercel.json` selects the Bun runtime and the Singapore region.

### Project settings

- **Root Directory:** `backend`
- **Framework Preset:** Express (detected)
- Install and build commands: defaults (Bun is detected from `bun.lock`)

### Environment variables

| Variable               | Value                                                                 |
| ---------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`         | Neon **pooled** connection string (set by the Neon integration)       |
| `JWT_SECRET`           | Random, `openssl rand -base64 48`                                     |
| `JWT_REFRESH_SECRET`   | Random, different from `JWT_SECRET`                                   |
| `ACCESS_TOKEN_EXPIRY`  | `15m`                                                                 |
| `REFRESH_TOKEN_EXPIRY` | `7d`                                                                  |
| `GOOGLE_CLIENT_ID`     | Google OAuth client id (same as the frontend's)                       |
| `GEMINI_MATH_AI_API`   | Gemini API key                                                        |
| `OPEN_ROUTER_API_KEY`  | OpenRouter key (backup model when Gemini fails)                       |
| `USE_MULTI_MODEL`      | `false` or `true`                                                     |
| `SENTRY_DSN`           | Optional. DSN of the Sentry backend project, for error alerts          |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret. Required in production, or every sign-up is refused. Preview can use Cloudflare's test secret `1x0000000000000000000000000000000AA` |
| `RESEND_API`           | Resend API key                                                        |
| `FROM_EMAIL`           | Verified sender, e.g. `NeoMath <hello@your-domain>`                   |
| `APP_URL`              | Frontend URL used in email links                                      |
| `CORS_ORIGINS`         | Comma-separated frontend URLs allowed to call the API                 |
| `NODE_ENV`             | `production`                                                          |

Never set `EMAIL_TRANSPORT=console` here; the server refuses to start with it
in production.

### The AI models

- **Primary:** Gemini 2.5 Flash on the Gemini API (`GEMINI_MATH_AI_API`),
  with a 20 second limit.
- **Backup:** DeepSeek V4 Flash on OpenRouter (`OPEN_ROUTER_API_KEY`), also
  20 seconds. It runs **only** when `USE_MULTI_MODEL=true`, and only after
  Gemini has failed or timed out (sequential, never a race). With
  `USE_MULTI_MODEL=false` a Gemini failure is an error for the student.
  Production should run with `true`.
- **Backup hosts:** OpenRouter may only send students' problems to the hosts
  in `BACKUP_HOSTS` in `backend/src/services/ai/ai.service.ts` (US and EU
  hosts: deepinfra, relace, parasail, azure, cloudflare, digitalocean), with
  `data_collection: "deny"`, so no host keeps or trains on them. Read a host's
  privacy policy before adding it.
- **Second check:** when the code cannot check an answer and the same problem
  is asked again, a model from the other maker gives its final answer after
  the response. The answer is only shared through the cache if the two match.
  This uses the same two keys.

### Must sit behind a proxy

Per-IP Rate Limits (sign-up, login, Google sign-in) read the client address
from `X-Forwarded-For`, because the app trusts one proxy hop
(`app.set("trust proxy", 1)`). Vercel overwrites that header with the real
client address, so this is safe there. Never expose the API directly (a bare
VPS port, a container without a proxy): clients could then send a fake
address with each request and never hit a limit.

---

## Database on Neon

- One Neon project, region **AWS Asia Pacific (Singapore)**, to match the
  `sin1` functions.
- Connect it with Neon's **Vercel integration**. It sets `DATABASE_URL` on
  the backend project and gives each preview deployment its own database
  branch.
- Use the **pooled** connection string (host contains `-pooler`).

### Migrations

Schema changes are committed SQL files in `backend/drizzle/` (ADR-0002).
They are never applied automatically on deploy:

1. Read the new SQL files in the PR.
2. Run them against the target database on purpose (preview branch first,
   then production):

   ```bash
   cd backend
   DATABASE_URL="<neon connection string>" bun run db:migrate
   ```

3. Deploy the code that needs them.

**Safety net:** the backend's Vercel build step (`vercel-build` in
`backend/package.json`) runs `scripts/check-migrations.ts` against that
environment's `DATABASE_URL`. If the database is missing a migration, the
build fails with the list of missing files and the current deployment keeps
serving, so the live site never runs code ahead of its schema. Apply the
migration, then redeploy. Run the same check locally with
`DATABASE_URL=... bun run db:check`.

Write migrations **additive first**: add tables and columns before code uses
them, and drop old ones only in a later release, so old and new code both
work while a deploy rolls out.

**Migration history for the solver redesign** (all additive):

| File | Adds | Preview | Production |
|---|---|---|---|
| `0005_solution_content` | `solutions.content` (jsonb), `solutions.format_version` (default 1) | applied | applied 2026-10-14 |
| `0006_solution_cache` | `solution_cache` table, `solutions.cache_key` | applied | applied 2026-10-14 |
| `0007_solution_reports` | `solution_reports` table | applied | applied 2026-10-14 |
| `0008_keep_reports` | copies of the problem and answer on reports; a report survives the solution being deleted | applied | applied 2026-10-14 |

Because they only add, they were applied to production before the redesign
merged, while the old code was still live.

---

## Frontend on Vercel

- **Root Directory:** `frontend`, **Framework Preset:** Vite
- `VITE_API_URL_PROD`: the backend's production URL
- `VITE_GOOGLE_CLIENT_ID`: the Google OAuth client id
- `VITE_TURNSTILE_SITE_KEY`: the Cloudflare Turnstile site key, the pair of
  the backend's `TURNSTILE_SECRET_KEY`. Preview can use Cloudflare's test key
  `1x00000000000000000000AA` (it always passes and says "For testing only")
- `VITE_SENTRY_DSN` and `VITE_GA_MEASUREMENT_ID`: optional, error alerts and
  analytics

## Google OAuth

In Google Cloud Console, add every frontend URL (production and any custom
domain) to **Authorized JavaScript origins** for the OAuth client.

## Admins

Admins sign in normally. Create the first one with:

```bash
cd backend
DATABASE_URL="<neon connection string>" bun run scripts/create-admin.ts
```

Existing Admins grant admin rights to others from the dashboard.

---

## Deployment Checklist

- [ ] Neon project created and connected to the backend project
- [ ] Migrations reviewed and applied to Neon
- [ ] Backend environment variables set, including `USE_MULTI_MODEL=true`,
      `OPEN_ROUTER_API_KEY` and `TURNSTILE_SECRET_KEY`
- [ ] Frontend `VITE_TURNSTILE_SITE_KEY` set (the pair of the backend secret)
- [ ] Backend preview deployment passes the health check and a sign-up
- [ ] Frontend `VITE_API_URL_PROD` points at the backend
- [ ] Backend `CORS_ORIGINS` includes the frontend URL
- [ ] Google OAuth origins include the frontend URL
- [ ] First Admin created
- [ ] Sign up, verify email, solve, History, admin dashboard all work
- [ ] One real solve each of a quadratic, a long division and a proof

## Health Check

```bash
curl https://<backend-url>/health
```

Expected: `{"status":"healthy","timestamp":"..."}`

## Rollback

Both projects: Vercel dashboard, **Deployments**, pick the last good
deployment, **Instant Rollback**. Do not use **Redeploy** to roll back or to
pick up new env vars on an old deployment: it rebuilds that deployment's old
commit. Redeploy the deployment of the latest `main` commit instead, then
check `vercel inspect <backend-url>`. Database migrations are not rolled back
automatically; write a new migration to undo a schema change.
