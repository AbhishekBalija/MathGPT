# MathGPT API Reference

Base URL: `https://your-backend-url.motia.cloud`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
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
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

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
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

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
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://..."
  },
  "isNewUser": false
}
```

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
    "isAdmin": false
  }
}
```

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

Solve a math problem. **Requires auth.**

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
| 404         | Not Found - Resource doesn't exist      |
| 500         | Server Error - Something went wrong     |
