# NeoMath Architecture

> A comprehensive overview of the NeoMath system architecture

---

## System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        USER["👤 User"]
        ADMIN["👤 Admin"]
        BROWSER["🌐 Browser"]
    end

    subgraph "Frontend - Vercel"
        REACT["⚛️ React App"]
        ROUTER["React Router"]
        ZUSTAND["Zustand Store"]
        AXIOS["Axios Client"]
    end

    subgraph "Backend - Express API"
        API["🔌 Express Router"]
        AUTH["🔐 Auth Service"]
        AI["🤖 AI Service"]
        SOLUTION["📝 Solution Service"]
        EMAIL["📧 Email Service"]
        ANALYTICS["📊 Analytics Service"]
    end

    subgraph "External Services"
        POSTGRES[("🐘 Postgres")]
        GEMINI["✨ Gemini AI"]
        DEEPSEEK["🛟 DeepSeek via OpenRouter (backup)"]
        RESEND["📬 Resend"]
        GOOGLE["🔑 Google OAuth"]
        TURNSTILE["🤖 Cloudflare Turnstile"]
        SENTRY["🚨 Sentry"]
    end

    USER --> BROWSER
    ADMIN --> BROWSER
    BROWSER --> REACT
    REACT --> ROUTER
    REACT --> ZUSTAND
    REACT --> AXIOS
    AXIOS -->|HTTPS| API

    API --> AUTH
    API --> AI
    API --> SOLUTION
    API --> EMAIL
    API --> ANALYTICS

    AUTH --> POSTGRES
    AUTH --> GOOGLE
    SOLUTION --> POSTGRES
    AI --> GEMINI
    AI -.->|only if Gemini fails| DEEPSEEK
    AUTH --> TURNSTILE
    API -.->|errors| SENTRY
    EMAIL --> RESEND
    ANALYTICS --> POSTGRES

    style REACT fill:#61dafb,color:#000
    style POSTGRES fill:#336791,color:#fff
    style GEMINI fill:#8e44ad,color:#fff
    style API fill:#ff6b6b,color:#fff
    style ANALYTICS fill:#f39c12,color:#fff
```

---

## Solve Flow

What `POST /api/solve` does, in order. Each early exit costs no AI call; only
an AI solve spends one of the 5 daily Credits.

```mermaid
flowchart TD
    REQ["POST /api/solve"] --> IP{"Per-IP limit<br/>100 an hour"}
    IP -->|over| R429A["429 RATE_LIMITED"]
    IP --> AUTH{"Logged in and<br/>email verified?"}
    AUTH -->|no| R401["401 / 403"]
    AUTH --> VALID{"zod: problem 1-2000 chars,<br/>method id"}
    VALID -->|bad| R400["400"]
    VALID --> MIN{"Per-User limit<br/>5 a minute"}
    MIN -->|over| R429B["429 RATE_LIMITED + retryAfter"]
    MIN --> MATH{"Looks like math?"}
    MATH -->|no| R422["422 NOT_MATH, no Credit"]
    MATH --> INSTANT{"Plain arithmetic?"}
    INSTANT -->|yes| SAVE1["Solve in code, save<br/>source: instant, no Credit"]
    INSTANT --> CACHE{"Shared cache hit?<br/>only checked answers"}
    CACHE -->|yes| SAVE2["Save for this student<br/>source: cache, no Credit"]
    CACHE --> DAILY{"Daily Credits left?"}
    DAILY -->|no| R429C["429 daily limit"]
    DAILY --> GEMINI["Gemini 2.5 Flash<br/>20 s limit"]
    GEMINI -->|fails or too slow| DEEPSEEK["DeepSeek V4 Flash<br/>via OpenRouter, 20 s"]
    GEMINI --> FORMAT{"Valid SolutionV2?<br/>(zod)"}
    DEEPSEEK --> FORMAT
    FORMAT -->|no, first time| GEMINI
    FORMAT -->|no, again| R502["502 INVALID_OUTPUT, no Credit"]
    FORMAT --> CHECK{"Code check<br/>verifyAnswer"}
    CHECK -->|proved wrong, first time| RETRY["Solve once more,<br/>told the wrong answer"]
    RETRY --> CHECK
    CHECK -->|passed| LABEL["Add 'Checked by ...'"]
    CHECK -->|wrong again| WARN["Add the warning"]
    CHECK -->|cannot check| PLAIN["No label"]
    LABEL --> SAVE3
    WARN --> SAVE3
    PLAIN --> SAVE3["Save, spend 1 Credit,<br/>source: ai"]
    SAVE3 --> SHARE["Cache: passed = shared,<br/>unchecked = private, wrong = never stored"]
    SHARE -.->|unchecked and asked again| SECOND["After the response:<br/>a model from another maker<br/>gives its answer; share if they match"]
```

- **Failover is sequential**, not a race (`services/ai/failover.ts`): the
  backup only starts once Gemini has failed or timed out, so we never pay
  for two answers and a failing backup can never cancel a working primary.
  It is on only when `USE_MULTI_MODEL=true`.
- **The format check** (`services/ai/generate-solution.ts`) parses the
  model's JSON with the `SolutionV2` zod schema, repairs LaTeX written with
  single backslashes, and asks once more if it is still invalid.
- **The code check** (`modules/solver/verify/verify-answer.ts`) substitutes
  roots back, recomputes arithmetic, and compares derivatives and integrals
  at random points. It parses with mathjs and runs only an allowlisted tree,
  never `eval`. Only this code may write `answer.check` or `answer.warning`.
- **The shared cache** (`modules/solver/cache/`) is keyed on the prompt
  version, the tidied problem and the method. A report blocks an entry for
  good (`POST /api/solutions/:id/report`, 10 an hour per account).

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant F as ⚛️ Frontend
    participant A as 🔌 API
    participant G as 🔑 Google
    participant DB as 🐘 Postgres

    rect rgb(240, 248, 255)
        Note over U,DB: Email/Password Login
        U->>F: Enter credentials
        F->>A: POST /auth/login
        A->>DB: Verify password
        DB-->>A: User found
        A-->>F: Access + Refresh tokens
    end

    rect rgb(255, 248, 240)
        Note over U,DB: Google OAuth
        U->>F: Click Google Sign-In
        F->>G: OAuth popup
        G-->>F: ID Token
        F->>A: POST /auth/google
        A->>G: Verify token
        G-->>A: User info
        A->>DB: Find/Create user
        A-->>F: Access + Refresh tokens
    end
```

---

## Frontend Architecture

The app is one page (`/app`), `features/solver/`. A solution is a list of
steps, and each step draws one typed block (see
[solution-format.md](solution-format.md)).

```mermaid
graph LR
    subgraph "Pages"
        LANDING["🏠 Landing"]
        AUTHP["🔐 Login / Register / VerifyEmail"]
        APP["💻 AppLayout"]
        ADMIN_DASH["⚙️ Admin"]
    end

    subgraph "features/solver"
        PAGE["SolverPage"]
        HISTORY["history/ HistorySidebar, PrevNext, Undo"]
        COMPOSER["composer/ Composer, Keypad, ReadAs"]
        STATES["states/ Empty, Thinking, Error, Hint"]
        VIEW["SolutionView, ProblemHeader, StepItem, AnswerStep"]
        BLOCKS["blocks/ equation, text, longDivision,<br/>columnArithmetic, statementReason, table"]
        MODEL["model/ adapter (old rows), resolve"]
    end

    subgraph "State"
        AUTH_STORE["authStore"]
        CHAT_STORE["chatStore"]
        DATA_STORE["appDataStore (profile, history)"]
        ADMIN_STORE["adminStore"]
    end

    subgraph "Services"
        SOLVE_SVC["solve.service"]
        HISTORY_SVC["history.service (incl. report)"]
        PROFILE_SVC["profile.service"]
        AUTH_SVC["auth.service"]
    end

    APP --> PAGE
    PAGE --> HISTORY
    PAGE --> COMPOSER
    PAGE --> STATES
    PAGE --> VIEW
    VIEW --> BLOCKS
    PAGE --> MODEL

    PAGE --> CHAT_STORE
    PAGE --> DATA_STORE
    SOLVE_SVC --> CHAT_STORE
    HISTORY_SVC --> DATA_STORE
    PROFILE_SVC --> DATA_STORE
    AUTH_SVC --> AUTH_STORE
    ADMIN_DASH --> ADMIN_STORE

    style PAGE fill:#61dafb,color:#000
    style CHAT_STORE fill:#764abc,color:#fff
    style DATA_STORE fill:#764abc,color:#fff
    style AUTH_STORE fill:#764abc,color:#fff
    style ADMIN_STORE fill:#764abc,color:#fff
```

- The profile is fetched once per load and shared (`appDataStore`), and
  refreshed after each solve for the "N of 5 free problems left" line.
- Old solutions (format 1) are drawn through `model/adapter.ts`, which turns
  each old step into an `equation` block. Nothing in the database is
  rewritten.
- AI text is never rendered as raw HTML: math goes through KaTeX with
  `trust` off, everything else is plain React text.

---

## Backend Architecture

```mermaid
graph TB
    subgraph "API Layer"
        SOLVE["/api/solve"]
        REPORT["/api/solutions/:id/report"]
        HISTORY["/api/history"]
        PROFILE["/api/profile"]
        LOGIN["/auth/login"]
        REGISTER["/auth/register"]
        OAUTH["/auth/google"]
    end

    subgraph "Admin API Layer"
        ADMIN_STATS["/admin/stats"]
        ADMIN_USERS["/admin/users"]
        ADMIN_ANALYTICS["/admin/analytics"]
        ADMIN_ERRORS["/admin/errors"]
        ADMIN_REPORTS["/admin/reports"]
        ADMIN_FEEDBACK["/admin/feedback"]
    end

    subgraph "Middleware"
        AUTH_MW["🔐 Auth Middleware"]
        ADMIN_MW["👑 Admin Middleware"]
        CORS_MW["🌐 CORS Handler"]
    end

    subgraph "Solver modules"
        GUARD["guard/ looksLikeMath"]
        INSTANT["instant/ arithmetic"]
        CACHE["cache/ solution-cache, share-checked"]
        VERIFY["verify/ verifyAnswer"]
    end

    subgraph "Services"
        AUTH_SVC["AuthService"]
        AI_SVC["AIService (Gemini, then DeepSeek)"]
        SOL_SVC["SolutionService"]
        EMAIL_SVC["EmailService"]
        ANALYTICS_SVC["AnalyticsService"]
    end

    subgraph "Repositories"
        USER_REPO["UserRepository"]
        SOL_REPO["SolutionRepository"]
        ANALYTICS_REPO["AnalyticsRepository"]
    end

    subgraph "Database"
        USERS[("👥 Users")]
        SOLUTIONS[("📝 Solutions")]
        CACHE_T[("🗂️ Solution Cache")]
        REPORTS[("🚩 Solution Reports")]
        LIMITS[("⏱️ Rate Limits")]
        EVENTS[("📊 Analytics Events")]
        ERRORS[("❌ Error Logs")]
    end

    SOLVE --> AUTH_MW
    REPORT --> AUTH_MW
    HISTORY --> AUTH_MW
    PROFILE --> AUTH_MW

    ADMIN_STATS --> ADMIN_MW
    ADMIN_USERS --> ADMIN_MW
    ADMIN_ANALYTICS --> ADMIN_MW
    ADMIN_ERRORS --> ADMIN_MW
    ADMIN_REPORTS --> ADMIN_MW
    ADMIN_FEEDBACK --> ADMIN_MW

    AUTH_MW --> GUARD
    GUARD --> INSTANT
    INSTANT --> CACHE
    CACHE --> AI_SVC
    AI_SVC --> VERIFY
    VERIFY --> SOL_SVC
    CACHE --> CACHE_T
    REPORT --> REPORTS
    REPORT --> CACHE_T
    AUTH_MW --> LIMITS
    ADMIN_MW --> ANALYTICS_SVC

    LOGIN --> AUTH_SVC
    REGISTER --> AUTH_SVC
    OAUTH --> AUTH_SVC

    AUTH_SVC --> USER_REPO
    SOL_SVC --> SOL_REPO
    ANALYTICS_SVC --> ANALYTICS_REPO

    USER_REPO --> USERS
    SOL_REPO --> SOLUTIONS
    ANALYTICS_REPO --> EVENTS
    ANALYTICS_REPO --> ERRORS

    style AUTH_MW fill:#e74c3c,color:#fff
    style ADMIN_MW fill:#9b59b6,color:#fff
    style AI_SVC fill:#9b59b6,color:#fff
    style AUTH_SVC fill:#3498db,color:#fff
    style ANALYTICS_SVC fill:#f39c12,color:#fff
```

---

## Tech Stack

### Frontend

| Technology                                                                                        | Purpose          |
| ------------------------------------------------------------------------------------------------- | ---------------- |
| ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)                 | UI Framework     |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white) | Type Safety      |
| ![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)                     | Build Tool       |
| ![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)      | Styling          |
| ![Zustand](https://img.shields.io/badge/Zustand-5-brown)                                          | State Management |

### Backend

| Technology                                                                              | Purpose        |
| --------------------------------------------------------------------------------------- | -------------- |
| ![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)  | HTTP API       |
| ![Bun](https://img.shields.io/badge/Bun-1.3-000000?logo=bun&logoColor=white)            | Runtime (dev)  |
| ![Postgres](https://img.shields.io/badge/Postgres-17-336791?logo=postgresql&logoColor=white) | Database       |
| ![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black) | ORM            |
| ![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white) | Authentication |

### External

| Technology                                                                                  | Purpose             |
| ------------------------------------------------------------------------------------------- | ------------------- |
| ![Gemini](https://img.shields.io/badge/Gemini_AI-Math_Solving-8E44AD)                       | AI Processing       |
| ![Google](https://img.shields.io/badge/Google_OAuth-SSO-4285F4?logo=google&logoColor=white) | Social Login        |
| ![Resend](https://img.shields.io/badge/Resend-Email-000000)                                 | Transactional Email |

---

## Data Models

All data lives in Postgres. The solution cache stores nothing about the
student; `solutions.cache_key` links a student's copy to its cache entry so a
report can block it. Rate limits live in a small `rate_limits` table (one row
per key and window).

```mermaid
erDiagram
    USER {
        uuid id PK "Postgres"
        text email UK "always lowercase"
        text name
        text password_hash "null for Google-only Users"
        boolean is_admin
        text provider "email or google"
        text google_id UK
        text avatar_url
        timestamptz email_verified_at "null = not verified"
        int daily_credits_used
        timestamptz last_credit_reset
        int total_credits_used
        timestamptz created_at
        timestamptz updated_at
    }

    SOLUTION {
        uuid id PK "the solver's id"
        uuid user_id FK "cascade delete"
        text chat_id
        text problem
        text problem_type "text, not an enum"
        jsonb steps "format 1 only"
        jsonb content "SolutionV2, format 2"
        int format_version "1 or 2"
        text cache_key "nullable"
        text final_answer
        text summary
        int processing_time_ms
        int input_tokens
        int output_tokens
        int total_tokens
        timestamptz created_at
    }

    ANALYTICS_EVENT {
        uuid id PK
        text event_name
        uuid user_id FK "set null on delete"
        jsonb properties
        timestamptz created_at
    }

    ERROR_LOG {
        uuid id PK
        text error_code
        text error_message
        text problem_text
        uuid user_id FK "set null on delete"
        int processing_time_ms "nullable"
        boolean resolved
        uuid resolved_by FK "set null on delete"
        timestamptz resolved_at "nullable"
        timestamptz created_at
    }

    SOLUTION_CACHE {
        text key PK "sha256 of prompt version, problem, level, method"
        jsonb content "SolutionV2"
        text problem_type
        int hits
        text status "unchecked, shared or blocked"
        text check_method "code or second-model"
        jsonb checked_by "which models"
        timestamptz created_at
    }

    SOLUTION_REPORT {
        uuid id PK
        uuid solution_id FK "set null on delete"
        uuid user_id FK "cascade delete"
        text reason "nullable"
        text problem_text "copy, kept after delete"
        text answer_text "copy"
        text cache_key "the entry it blocked"
        timestamptz created_at
    }

    USER ||--o{ SOLUTION : "has many"
    USER ||--o{ SOLUTION_REPORT : "files"
    SOLUTION |o--o{ SOLUTION_REPORT : "reported in"
    USER ||--o{ ANALYTICS_EVENT : "generates"
    USER ||--o{ ERROR_LOG : "may cause"
```

---

## Security Architecture

```mermaid
graph LR
    subgraph "Client"
        TOKEN["🎫 JWT Token"]
    end

    subgraph "Auth Flow"
        VERIFY["✅ Verify Token"]
        DECODE["📖 Decode Payload"]
        CHECK["🔍 Check Expiry"]
        ADMIN_CHECK["👑 Check isAdmin"]
    end

    subgraph "Protection"
        ACCESS["15m Access Token"]
        REFRESH["7d Refresh Token"]
        BCRYPT["🔒 bcrypt Hash"]
    end

    TOKEN --> VERIFY
    VERIFY --> DECODE
    DECODE --> CHECK
    CHECK --> ADMIN_CHECK

    ACCESS -.->|Short-lived| TOKEN
    REFRESH -.->|Long-lived| TOKEN
    BCRYPT -.->|Passwords| CHECK

    style TOKEN fill:#f39c12,color:#000
    style BCRYPT fill:#27ae60,color:#fff
    style ADMIN_CHECK fill:#e74c3c,color:#fff
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "DNS"
        DOMAIN["🌐 neomath.vercel.app / neomath-api.vercel.app"]
    end

    subgraph "Vercel Edge"
        CDN["⚡ CDN"]
        SSR["📦 Static Files"]
    end

    subgraph "Vercel Functions (sin1, Bun)"
        LB["⚖️ Vercel Routing"]
        APP1["🔧 Express Function"]
        APP2["🔧 Express Function"]
    end

    subgraph "Data Layer"
        POSTGRES_DB["🐘 Postgres (Neon in preview and production)"]
    end

    DOMAIN --> CDN
    CDN --> SSR
    SSR -->|API Calls| LB
    LB --> APP1
    LB --> APP2
    APP1 --> POSTGRES_DB
    APP2 --> POSTGRES_DB

    style CDN fill:#000,color:#fff
    style POSTGRES_DB fill:#336791,color:#fff
```

---

_Last updated: October 14, 2026 (solver redesign: solve flow, cache, reports)_
