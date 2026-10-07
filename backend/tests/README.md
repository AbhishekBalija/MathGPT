# Backend Test Suite Documentation

## Overview

The brutal test suite (`tests/brutal.test.ts`) is designed to test security vulnerabilities, edge cases, and stress test the NeoMath backend.

## Running Tests

The tests talk to a running API at `TEST_API_URL` (default `http://localhost:3000`).
They register users, call `/api/solve` and trigger emails, so run them against an
isolated server only:

```bash
# 1. Throwaway local MongoDB (data lives in a temp folder)
mkdir -p /tmp/neomath-test-db
mongod --dbpath /tmp/neomath-test-db --port 27018 --fork --logpath /tmp/neomath-test-db/mongod.log

# 2. API with test-only settings. --no-env-file stops Bun from loading your real .env
PORT=3100 NODE_ENV=test MONGODB_URI=mongodb://127.0.0.1:27018 \
JWT_SECRET=test-access JWT_REFRESH_SECRET=test-refresh \
RESEND_API=re_dummy FROM_EMAIL="Test <test@example.invalid>" \
GEMINI_MATH_AI_API=dummy ADMIN_PASSCODE=test-admin-passcode \
bun --no-env-file src/server.ts

# 3. In another terminal
TEST_API_URL=http://localhost:3100 ADMIN_PASSCODE=test-admin-passcode bun run test -- --run
```

With a dummy `GEMINI_MATH_AI_API`, tests that need a real AI answer fail with
500. Use a real key only when you need those tests, and expect some Gemini usage.

## Test Categories

### 🔐 Authentication Tests

- NoSQL injection protection
- SQL injection protection
- JWT token manipulation
- Rate limiting (skipped - infrastructure)
- Password complexity validation
- Email enumeration prevention

### 🧮 Solve API Tests

- Input validation (empty, null, Unicode)
- Concurrent request handling
- Unsolvable problem detection
- AI response timeouts

### 📜 History Tests

- IDOR prevention (user isolation)
- Deletion edge cases
- Clear history functionality

### 👤 Profile Tests

- Privilege escalation prevention
- Mass assignment protection

### 🚨 Error Handling Tests

- No stack trace leakage
- No database info leakage
- Consistent error format

## Test Configuration

Configured in `vitest.config.ts`:

| Setting       | Value   | Purpose                    |
| ------------- | ------- | -------------------------- |
| `testTimeout` | 60000ms | AI API calls can be slow   |
| `hookTimeout` | 30000ms | Network setup in beforeAll |

## Security Patterns Tested

1. **NoSQL Injection** - `{ email: { $gt: "" } }`
2. **SQL Injection** - `admin' OR '1'='1`
3. **XSS** - `<script>alert('xss')</script>`
4. **Prototype Pollution** - `{ __proto__: { isAdmin: true } }`
5. **JWT Manipulation** - Modified payloads, expired tokens

## Test User

Tests use a standard test user:

- Email: `test@test.com`
- Password: `Test123!`

The global `beforeAll` ensures this user exists before tests run.
