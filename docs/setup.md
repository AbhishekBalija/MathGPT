# NeoMath Development Setup

## Prerequisites

- **Node.js** 18+ or **Bun** 1.0+
- **MongoDB** (local or Atlas)
- **Google Cloud Console** account (for OAuth)
- **Gemini AI API key**
- **VS Code** (recommended editor)

---

## Recommended VS Code Extensions

Install these extensions for the best development experience:

| Extension                     | ID                          | Purpose                    |
| ----------------------------- | --------------------------- | -------------------------- |
| **Markdown Preview Mermaid**  | `bierner.markdown-mermaid`  | View architecture diagrams |
| **ESLint**                    | `dbaeumer.vscode-eslint`    | Linting                    |
| **Prettier**                  | `esbenp.prettier-vscode`    | Code formatting            |
| **Tailwind CSS IntelliSense** | `bradlc.vscode-tailwindcss` | CSS autocomplete           |

**Quick install via command line:**

```bash
code --install-extension bierner.markdown-mermaid
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
```

> **Note**: After installing `markdown-mermaid`, open `docs/architecture.md` and press `Cmd+Shift+V` to see the diagrams.

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-repo/math-solver.git
cd math-solver
```

### 2. Frontend Setup

```bash
cd frontend
bun install

# Create .env.local
cp .env.example .env.local
```

**frontend/.env.local:**

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Backend Setup

```bash
cd backend
bun install

# Create .env from the template, then fill in the values
cp .env.example .env
```

The backend refuses to start without `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`RESEND_API` and `FROM_EMAIL`. Generate each JWT secret with:

```bash
openssl rand -base64 48
```

See `backend/.env.example` for every variable and what it does.

### 4. Start Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
bun run dev
# Express API on http://localhost:3000, restarts on file changes
```

**Terminal 2 - Frontend:**

```bash
cd frontend
bun run dev
# Runs on http://localhost:5173
```

---

## Environment Variables

### Frontend

| Variable                | Description            | Required |
| ----------------------- | ---------------------- | -------- |
| `VITE_API_URL`          | Backend API URL        | Yes      |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes      |

### Backend

| Variable               | Description                             | Required |
| ---------------------- | --------------------------------------- | -------- |
| `MONGODB_URI`          | MongoDB connection string               | Yes      |
| `JWT_SECRET`           | Secret for signing access tokens        | Yes      |
| `JWT_REFRESH_SECRET`   | Secret for signing refresh tokens       | Yes      |
| `GEMINI_MATH_AI_API`   | Gemini AI API key                       | Yes      |
| `GOOGLE_CLIENT_ID`     | Google OAuth Client ID                  | Yes      |
| `RESEND_API_KEY`       | Resend email API key                    | No       |
| `ADMIN_PASSCODE`       | Admin secondary authentication passcode | No       |
| `ACCESS_TOKEN_EXPIRY`  | JWT access token expiry (default: 15m)  | No       |
| `REFRESH_TOKEN_EXPIRY` | JWT refresh token expiry (default: 7d)  | No       |

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client IDs**
5. Set **Application type** to "Web application"
6. Add authorized origins:
   - `http://localhost:5173` (dev)
   - `https://your-domain.com` (prod)
7. Copy the **Client ID** to your env files

---

## MongoDB Setup

### Option A: Local MongoDB

```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Connection string
MONGODB_URI=mongodb://localhost:27017/mathgpt
```

### Option B: MongoDB Atlas (Recommended)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get connection string from **Connect > Drivers**
4. Add to backend `.env`

---

## Gemini AI Setup

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create an API key
3. Add to backend `.env`:
   ```
   GEMINI_MATH_AI_API=your_api_key
   ```

---

## Admin Setup

To enable admin features:

1. Set `isAdmin: true` for a user in MongoDB
2. Optionally set `ADMIN_PASSCODE` env variable for secondary authentication
3. Admin users can access `/admin` dashboard after login

---

## Running Tests

```bash
# Frontend tests
cd frontend
bun run test
```

Backend tests call a running API over HTTP, and they create users and send
requests that trigger emails and AI calls. **Never point them at a server
connected to a real database.** See `backend/tests/README.md` for the safe
setup (local MongoDB, dummy email and AI keys).

---

## Troubleshooting

### CORS Errors

Ensure `VITE_API_URL` matches exactly what backend serves.

### MongoDB Connection Failed

Check MongoDB is running and URI is correct.

### Google OAuth Issues

Verify Client ID matches in both frontend and backend env files.

### "AI service not configured"

Add `GEMINI_MATH_AI_API` to backend env.

### Admin Access Denied

Ensure the user has `isAdmin: true` in the database.

---

_Last updated: December 22, 2025_
