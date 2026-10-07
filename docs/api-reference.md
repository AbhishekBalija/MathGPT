# NeoMath API Reference

Base URL: `http://localhost:3000` locally. Production URL will be the Vercel backend project (Phase 3).

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Health Endpoint

### GET /health

Check if the API is running.

**Response (200):**

```json
{
  "status": "healthy",
  "timestamp": "2025-12-22T00:00:00.000Z"
}
```

---

## Auth Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "8f14e45f-ceea-4e7a-9b1c-2f6c1d0e5a11",
    "email": "user@example.com",
    "emailVerified": false
  }
}
```

Emails are stored lowercase, so `User@Example.com` and `user@example.com`
are the same account. Signing up with an email that is already registered
returns **409**. Any `isAdmin` field in the body is ignored.

Limited to **5 sign-ups per hour per IP**. Over the limit: **429**
`{ "error": "...", "code": "RATE_LIMITED", "retryAfter": <seconds> }`.

---

### POST /auth/login

Login with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "8f14e45f-ceea-4e7a-9b1c-2f6c1d0e5a11",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "isAdmin": false,
    "emailVerified": false
  }
}
```

The email is matched in any letter case. Limited to **10 attempts per 15
minutes per IP** (429 `RATE_LIMITED` with `retryAfter`).

---

### POST /auth/google

Login with Google OAuth.

**Request Body:**

```json
{
  "idToken": "google_id_token"
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "8f14e45f-ceea-4e7a-9b1c-2f6c1d0e5a11",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "isAdmin": false,
    "emailVerified": true
  }
}
```

Google Users are verified from the start. If the email already belongs to an
email-and-password User, the Google account is linked to it and the User
becomes verified.

---

### GET /auth/me

Get current authenticated user. **Requires auth.**

**Response (200):**

```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "isAdmin": false,
    "emailVerified": false
  }
}
```

Returns **401** `{ "error": "Authentication required" }` when the token is
missing, invalid, expired, or belongs to a User that no longer exists.

---

### POST /auth/verify-email

Confirm the email with the 6-digit Verification Code sent at sign-up.
**Requires auth.** Only Verified Users can solve.

**Request Body:**

```json
{ "code": "123456" }
```

**Response (200):** `{ "emailVerified": true }`. Also returned if the User
is already verified. The welcome email is sent after the first success.

**Errors (400):** a code that is not 6 digits, a wrong code, an expired code
(codes last 15 minutes), no active code, or 5 wrong attempts already used
(a new code is then required).

---

### POST /auth/resend-verification

Email a new Verification Code, replacing the old one. **Requires auth.**

**Response (200):** `{ "message": "A new code is on its way." }`

**Errors:**

| Status | When                                                              |
| ------ | ----------------------------------------------------------------- |
| 400    | The email is already verified                                     |
| 429    | More than 1 request per minute or 5 per hour. Body includes `code: "RATE_LIMITED"` and `retryAfter` (seconds) |

---

### POST /auth/refresh

Refresh access token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**

```json
{
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

---

### POST /auth/logout

Logout user. **Requires auth.**

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

---

## Solve Endpoints

### POST /api/solve

Solve a math problem. **Requires auth and a verified email.** Limited to 5
per minute per User (429 `RATE_LIMITED` with `retryAfter`), separate from the
Daily Limit of 5 per day. An unverified
User gets **403** `{ "error": "...", "code": "EMAIL_NOT_VERIFIED" }`.

**Request Body:**

```json
{
  "problem": "Solve x² + 5x + 6 = 0",
  "mode": "step_by_step",
  "chatId": "optional_chat_id"
}
```

**Response (200):**

```json
{
  "success": true,
  "solution": {
    "id": "solution_id",
    "problem": "Solve x² + 5x + 6 = 0",
    "problemType": "quadratic_equation",
    "steps": [
      {
        "stepNumber": 1,
        "expression": "x^2 + 5x + 6 = 0",
        "justification": "Given equation",
        "explanation": "We start with the quadratic equation...",
        "status": "VERIFIED"
      }
    ],
    "finalAnswer": "x = -2 or x = -3",
    "summary": "Solved using factoring method",
    "processingTimeMs": 1234,
    "createdAt": "2025-12-21T00:00:00.000Z"
  }
}
```

---

## History Endpoints

### GET /api/history

Get user's solution history. **Requires auth.**

**Response (200):**

```json
{
  "success": true,
  "history": [
    {
      "solutionId": "solution_id",
      "problem": "Solve x² + 5x + 6 = 0",
      "problemType": "quadratic_equation",
      "finalAnswer": "x = -2 or x = -3",
      "createdAt": "2025-12-21T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### GET /api/solution/:id

Get a specific solution. **Requires auth.**

**Response (200):**

```json
{
  "success": true,
  "solution": {
    /* full solution object */
  }
}
```

---

### DELETE /api/delete-solution

Delete a solution. **Requires auth.**

**Request Body:**

```json
{
  "solutionId": "solution_id"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Solution deleted successfully"
}
```

---

### DELETE /api/clear-history

Clear all user's solutions. **Requires auth.**

**Response (200):**

```json
{
  "success": true,
  "message": "History cleared",
  "deletedCount": 5
}
```

---

## Profile Endpoint

### GET /api/profile

Get user profile and usage statistics. **Requires auth.**

**Response (200):**

```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "provider": "email",
    "createdAt": "2025-12-01T00:00:00.000Z"
  },
  "stats": {
    "totalSolutions": 25,
    "problemTypes": {
      "quadratic_equation": 10,
      "linear_equation": 8,
      "calculus": 7
    },
    "lastSolvedAt": "2025-12-22T00:00:00.000Z"
  }
}
```

---

## Admin Endpoints

> **Note**: All admin endpoints require authentication with an admin account (`isAdmin: true`).

### POST /admin/verify-passcode

Verify admin passcode for secondary authentication.

**Request Body:**

```json
{
  "passcode": "admin_passcode"
}
```

**Response (200):**

```json
{
  "success": true
}
```

| Status | Error                                    |
| ------ | ---------------------------------------- |
| 401    | Authentication required                  |
| 403    | Admin access required / Invalid passcode |

---

### GET /admin/stats

Get dashboard statistics. **Requires admin.**

**Response (200):**

```json
{
  "totalUsers": 150,
  "totalSolutions": 1250,
  "solutionsByType": {
    "quadratic_equation": 400,
    "linear_equation": 350,
    "calculus": 500
  },
  "recentUsers": [
    {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2025-12-22T00:00:00.000Z"
    }
  ]
}
```

---

### GET /admin/analytics

Get analytics data for admin dashboard. **Requires admin.**

**Response (200):**

```json
{
  "eventsByType": [
    { "eventName": "solution_saved", "count": 500 },
    { "eventName": "user_login", "count": 250 }
  ],
  "recentEvents": [
    {
      "id": "event_id",
      "eventName": "solution_saved",
      "properties": { "problemType": "calculus" },
      "userId": "user_id",
      "createdAt": "2025-12-22T00:00:00.000Z"
    }
  ],
  "totalEvents": 750
}
```

---

### GET /admin/users

List users with pagination and search. **Requires admin.**

**Query Parameters:**

| Param    | Type   | Default | Description             |
| -------- | ------ | ------- | ----------------------- |
| `page`   | number | 1       | Page number             |
| `limit`  | number | 20      | Users per page          |
| `search` | string | -       | Search by name or email |

**Response (200):**

```json
{
  "users": [
    {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "isAdmin": false,
      "provider": "email",
      "createdAt": "2025-12-01T00:00:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

### PATCH /admin/users/:id/role

Update user admin role. **Requires admin.**

**Request Body:**

```json
{
  "isAdmin": true
}
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "isAdmin": true
  }
}
```

| Status | Error                               |
| ------ | ----------------------------------- |
| 403    | Cannot remove your own admin status |
| 404    | User not found                      |

---

### DELETE /admin/users/:id

Delete a user and their solutions. **Requires admin.**

**Response (200):**

```json
{
  "success": true,
  "deletedSolutions": 15
}
```

| Status | Error                          |
| ------ | ------------------------------ |
| 403    | Cannot delete your own account |
| 404    | User not found                 |

---

### GET /admin/errors

Get error logs for admin dashboard. **Requires admin.**

**Query Parameters:**

| Param             | Type    | Default | Description             |
| ----------------- | ------- | ------- | ----------------------- |
| `limit`           | number  | 50      | Max errors to return    |
| `errorCode`       | string  | -       | Filter by error code    |
| `userId`          | string  | -       | Filter by user ID       |
| `includeResolved` | boolean | false   | Include resolved errors |

**Response (200):**

```json
{
  "stats": {
    "total": 50,
    "unresolved": 12,
    "last24Hours": 5,
    "byCode": [
      { "errorCode": "AI_PARSE_ERROR", "count": 8 },
      { "errorCode": "TIMEOUT", "count": 4 }
    ]
  },
  "errors": [
    {
      "id": "error_id",
      "errorCode": "AI_PARSE_ERROR",
      "errorMessage": "Failed to parse AI response",
      "problemText": "Solve x^2 + 1 = 0",
      "userId": "user_id",
      "resolved": false,
      "createdAt": "2025-12-22T00:00:00.000Z"
    }
  ]
}
```

---

### PATCH /admin/errors/:id/resolve

Mark an error as resolved. **Requires admin.**

**Response (200):**

```json
{
  "message": "Error marked as resolved",
  "error": {
    "id": "error_id",
    "resolved": true,
    "resolvedBy": "admin_user_id",
    "resolvedAt": "2025-12-22T00:00:00.000Z"
  }
}
```

| Status | Error             |
| ------ | ----------------- |
| 400    | Error ID required |
| 404    | Error not found   |

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

| Status Code | Description                             |
| ----------- | --------------------------------------- |
| 400         | Bad Request - Invalid input             |
| 401         | Unauthorized - Invalid or missing token |
| 403         | Forbidden - Insufficient permissions    |
| 404         | Not Found - Resource doesn't exist      |
| 500         | Server Error - Something went wrong     |

---

_Last updated: December 22, 2025_
