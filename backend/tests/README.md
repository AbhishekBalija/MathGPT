# Backend Test Suite Documentation

## Overview

The brutal test suite (`tests/brutal.test.ts`) is designed to test security vulnerabilities, edge cases, and stress test the MathGPT backend.

## Running Tests

```bash
# Run all tests
npm test

# Run brutal test suite only
npm test -- --run brutal.test.ts
```

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
