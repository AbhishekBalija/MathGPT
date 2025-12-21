# MathGPT Architecture

> A comprehensive overview of the MathGPT system architecture

---

## System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        USER["👤 User"]
        BROWSER["🌐 Browser"]
    end

    subgraph "Frontend - Vercel"
        REACT["⚛️ React App"]
        ROUTER["React Router"]
        ZUSTAND["Zustand Store"]
        AXIOS["Axios Client"]
    end

    subgraph "Backend - Motia Cloud"
        API["🔌 API Gateway"]
        AUTH["🔐 Auth Service"]
        AI["🤖 AI Service"]
        SOLUTION["📝 Solution Service"]
        EMAIL["📧 Email Service"]
    end

    subgraph "External Services"
        MONGODB[("🍃 MongoDB Atlas")]
        GEMINI["✨ Gemini AI"]
        RESEND["📬 Resend"]
        GOOGLE["🔑 Google OAuth"]
    end

    USER --> BROWSER
    BROWSER --> REACT
    REACT --> ROUTER
    REACT --> ZUSTAND
    REACT --> AXIOS
    AXIOS -->|HTTPS| API

    API --> AUTH
    API --> AI
    API --> SOLUTION
    API --> EMAIL

    AUTH --> MONGODB
    AUTH --> GOOGLE
    SOLUTION --> MONGODB
    AI --> GEMINI
    EMAIL --> RESEND

    style REACT fill:#61dafb,color:#000
    style MONGODB fill:#00684a,color:#fff
    style GEMINI fill:#8e44ad,color:#fff
    style API fill:#ff6b6b,color:#fff
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
    end

    subgraph "Components"
        SIDEBAR["📜 Sidebar"]
        CHAT["💬 ChatWindow"]
        ANSWER["✅ AnswerPanel"]
        STEP["📋 StepCard"]
    end

    subgraph "State"
        AUTH_STORE["authStore"]
        CHAT_STORE["chatStore"]
    end

    subgraph "Services"
        AUTH_SVC["auth.service"]
        SOLVE_SVC["solve.service"]
        HISTORY_SVC["history.service"]
    end

    APP --> SIDEBAR
    APP --> CHAT
    APP --> ANSWER
    ANSWER --> STEP

    SIDEBAR --> CHAT_STORE
    CHAT --> CHAT_STORE
    ANSWER --> CHAT_STORE

    AUTH_SVC --> AUTH_STORE
    SOLVE_SVC --> CHAT_STORE
    HISTORY_SVC --> CHAT_STORE

    style APP fill:#61dafb,color:#000
    style CHAT_STORE fill:#764abc,color:#fff
    style AUTH_STORE fill:#764abc,color:#fff
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

    subgraph "Middleware"
        AUTH_MW["🔐 Auth Middleware"]
        CORS_MW["🌐 CORS Handler"]
    end

    subgraph "Services"
        AUTH_SVC["AuthService"]
        AI_SVC["AIService"]
        SOL_SVC["SolutionService"]
        EMAIL_SVC["EmailService"]
    end

    subgraph "Repositories"
        USER_REPO["UserRepository"]
        SOL_REPO["SolutionRepository"]
    end

    subgraph "Database"
        USERS[("👥 Users")]
        SOLUTIONS[("📝 Solutions")]
    end

    SOLVE --> AUTH_MW
    HISTORY --> AUTH_MW
    PROFILE --> AUTH_MW

    AUTH_MW --> AI_SVC
    AUTH_MW --> SOL_SVC

    LOGIN --> AUTH_SVC
    REGISTER --> AUTH_SVC
    OAUTH --> AUTH_SVC

    AUTH_SVC --> USER_REPO
    SOL_SVC --> SOL_REPO

    USER_REPO --> USERS
    SOL_REPO --> SOLUTIONS

    style AUTH_MW fill:#e74c3c,color:#fff
    style AI_SVC fill:#9b59b6,color:#fff
    style AUTH_SVC fill:#3498db,color:#fff
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
| ![Motia](https://img.shields.io/badge/Motia-0.17-orange)                                | Orchestration  |
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

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string email UK
        string name
        string password
        string avatar
        string googleId
        boolean isAdmin
        string provider
        Date createdAt
    }

    SOLUTION {
        ObjectId _id PK
        ObjectId userId FK
        string problem
        string problemType
        array steps
        string finalAnswer
        string summary
        number processingTimeMs
        Date createdAt
    }

    USER ||--o{ SOLUTION : "has many"
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
    end

    subgraph "Protection"
        ACCESS["15m Access Token"]
        REFRESH["7d Refresh Token"]
        BCRYPT["🔒 bcrypt Hash"]
    end

    TOKEN --> VERIFY
    VERIFY --> DECODE
    DECODE --> CHECK

    ACCESS -.->|Short-lived| TOKEN
    REFRESH -.->|Long-lived| TOKEN
    BCRYPT -.->|Passwords| CHECK

    style TOKEN fill:#f39c12,color:#000
    style BCRYPT fill:#27ae60,color:#fff
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

    subgraph "Motia Cloud"
        LB["⚖️ Load Balancer"]
        APP1["🔧 App Instance 1"]
        APP2["🔧 App Instance 2"]
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

_Last updated: December 21, 2025_
