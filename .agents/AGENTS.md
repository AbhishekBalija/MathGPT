# AGENTS.md

NeoMath: an AI math solver that returns step-by-step, verified solutions in a
chat-style UI.

## Repo layout

One git repo, two packages:

- `frontend/`: React + Vite + Tailwind, deployed on Vercel
- `backend/`: Express API on Bun (being migrated off Motia, see below)
- `docs/`: architecture, API reference, deployment, agent config (`docs/agents/`)

## Stack

- Runtime and package manager: Bun (never npm)
- Backend: Express 5, zod for validation, JWT auth, Gemini for solving,
  Resend for email
- Database: MongoDB today, moving to Postgres on Neon with Drizzle
- Hosting: Vercel (frontend and backend as two projects from this repo) + Neon
- Tests: Vitest (backend tests hit the HTTP API via `TEST_API_URL`)

## Migration in progress

1. Motia to Express (still MongoDB), verified against the existing HTTP tests
2. MongoDB to Postgres with Drizzle on Neon (fresh tables, no data copy)
3. Deploy backend to Vercel, retire Motia Cloud

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `AbhishekBalija/MathGPT`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root plus `docs/adr/`. See `docs/agents/domain.md`.
