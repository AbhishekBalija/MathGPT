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
        MONGODB[("🍃 MongoDB Atlas")]
        GEMINI["✨ Gemini AI"]
        RESEND["📬 Resend"]
        GOOGLE["🔑 Google OAuth"]
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

    AUTH --> MONGODB
    AUTH --> GOOGLE
    SOLUTION --> MONGODB
    AI --> GEMINI
    EMAIL --> RESEND
    ANALYTICS --> MONGODB

    style REACT fill:#61dafb,color:#000
    style MONGODB fill:#00684a,color:#fff
    style GEMINI fill:#8e44ad,color:#fff
    style API fill:#ff6b6b,color:#fff
    style ANALYTICS fill:#f39c12,color:#fff
```

---

## Request Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant F as ⚛️ Frontend
    participant A as 🔌 API
    participant M as 🔐 Auth
    participant AI as 🤖 Gemini AI
    participant DB as 🍃 MongoDB

    U->>F: Enter math problem
    F->>A: POST /api/solve
    A->>M: Validate JWT
    M-->>A: ✅ User authenticated
    A->>AI: Send problem
    AI-->>A: Step-by-step solution
    A->>DB: Save solution
    DB-->>A: ✅ Saved
    A-->>F: Return solution
    F-->>U: Display verified steps
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant F as ⚛️ Frontend
    participant A as 🔌 API
    participant G as 🔑 Google
    participant DB as 🍃 MongoDB

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

```mermaid
graph LR
    subgraph "Pages"
        LANDING["🏠 Landing"]
        LOGIN["🔐 Login"]
        REGISTER["📝 Register"]
        APP["💻 AppLayout"]
        ADMIN_DASH["⚙️ Admin Dashboard"]
    end

    subgraph "Components"
        SIDEBAR["📜 Sidebar"]
        CHAT["💬 ChatWindow"]
        ANSWER["✅ AnswerPanel"]
        STEP["📋 StepCard"]
        ADMIN_STATS["📊 AdminStats"]
        ADMIN_USERS["👥 UserManagement"]
    end

    subgraph "State"
        AUTH_STORE["authStore"]
        CHAT_STORE["chatStore"]
        ADMIN_STORE["adminStore"]
    end

    subgraph "Services"
        AUTH_SVC["auth.service"]
        SOLVE_SVC["solve.service"]
        HISTORY_SVC["history.service"]
        ADMIN_SVC["admin.service"]
    end

    APP --> SIDEBAR
    APP --> CHAT
    APP --> ANSWER
    ANSWER --> STEP

    ADMIN_DASH --> ADMIN_STATS
    ADMIN_DASH --> ADMIN_USERS

    SIDEBAR --> CHAT_STORE
    CHAT --> CHAT_STORE
    ANSWER --> CHAT_STORE

    AUTH_SVC --> AUTH_STORE
    SOLVE_SVC --> CHAT_STORE
    HISTORY_SVC --> CHAT_STORE
    ADMIN_SVC --> ADMIN_STORE

    style APP fill:#61dafb,color:#000
    style ADMIN_DASH fill:#e74c3c,color:#fff
    style CHAT_STORE fill:#764abc,color:#fff
    style AUTH_STORE fill:#764abc,color:#fff
    style ADMIN_STORE fill:#764abc,color:#fff
```

---

## Backend Architecture

```mermaid
graph TB
    subgraph "API Layer"
        SOLVE["/api/solve"]
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
    end

    subgraph "Middleware"
        AUTH_MW["🔐 Auth Middleware"]
        ADMIN_MW["👑 Admin Middleware"]
        CORS_MW["🌐 CORS Handler"]
    end

    subgraph "Services"
        AUTH_SVC["AuthService"]
        AI_SVC["AIService"]
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
        EVENTS[("📊 Analytics Events")]
        ERRORS[("❌ Error Logs")]
    end

    SOLVE --> AUTH_MW
    HISTORY --> AUTH_MW
    PROFILE --> AUTH_MW

    ADMIN_STATS --> ADMIN_MW
    ADMIN_USERS --> ADMIN_MW
    ADMIN_ANALYTICS --> ADMIN_MW
    ADMIN_ERRORS --> ADMIN_MW

    AUTH_MW --> AI_SVC
    AUTH_MW --> SOL_SVC
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
| ![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)  | Database       |
| ![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white) | Authentication |

### External

| Technology                                                                                  | Purpose             |
| ------------------------------------------------------------------------------------------- | ------------------- |
| ![Gemini](https://img.shields.io/badge/Gemini_AI-Math_Solving-8E44AD)                       | AI Processing       |
| ![Google](https://img.shields.io/badge/Google_OAuth-SSO-4285F4?logo=google&logoColor=white) | Social Login        |
| ![Resend](https://img.shields.io/badge/Resend-Email-000000)                                 | Transactional Email |

---

## Data Models

Users live in Postgres. Solutions, Analytics Events and Error Logs are still
in MongoDB and move in #7 and #9; until then they point at Users by id only,
without a database-enforced foreign key.

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
        ObjectId _id PK
        string userId FK "a Postgres User id"
        string problem
        string problemType
        array steps
        string finalAnswer
        string summary
        number processingTimeMs
        Date createdAt
    }

    ANALYTICS_EVENT {
        ObjectId _id PK
        string eventName
        object properties
        string userId FK
        Date createdAt
    }

    ERROR_LOG {
        ObjectId _id PK
        string errorCode
        string errorMessage
        string problemText
        string userId FK
        boolean resolved
        string resolvedBy FK
        Date resolvedAt
        Date createdAt
    }

    USER ||--o{ SOLUTION : "has many"
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
        PASSCODE["🔐 Admin Passcode"]
    end

    TOKEN --> VERIFY
    VERIFY --> DECODE
    DECODE --> CHECK
    CHECK --> ADMIN_CHECK

    ACCESS -.->|Short-lived| TOKEN
    REFRESH -.->|Long-lived| TOKEN
    BCRYPT -.->|Passwords| CHECK
    PASSCODE -.->|Admin Verify| ADMIN_CHECK

    style TOKEN fill:#f39c12,color:#000
    style BCRYPT fill:#27ae60,color:#fff
    style ADMIN_CHECK fill:#e74c3c,color:#fff
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "DNS"
        DOMAIN["🌐 math-gpt-beta.vercel.app"]
    end

    subgraph "Vercel Edge"
        CDN["⚡ CDN"]
        SSR["📦 Static Files"]
    end

    subgraph "Vercel Functions (planned, Phase 3)"
        LB["⚖️ Vercel Routing"]
        APP1["🔧 Express Function"]
        APP2["🔧 Express Function"]
    end

    subgraph "Data Layer"
        ATLAS["🍃 MongoDB Atlas"]
    end

    DOMAIN --> CDN
    CDN --> SSR
    SSR -->|API Calls| LB
    LB --> APP1
    LB --> APP2
    APP1 --> ATLAS
    APP2 --> ATLAS

    style CDN fill:#000,color:#fff
    style ATLAS fill:#00684a,color:#fff
```

---

_Last updated: October 7, 2026 (Motia replaced with Express)_
