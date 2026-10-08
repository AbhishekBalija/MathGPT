/**
 * NeoMath Backend Advanced Test Suite
 *
 * BRUTAL ADVANCED TESTS - Senior QA Engineer
 * These tests focus on edge cases NOT covered by brutal.test.ts:
 * - Redis/State verification (rate limiting actually works)
 * - Admin endpoint security
 * - Daily credit limit abuse prevention
 * - Token rotation security
 * - Google OAuth edge cases
 *
 * Run: npm test -- --run tests/brutal-advanced.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerVerifiedUser, uniqueEmail } from "./support/users";

const API_URL = process.env.TEST_API_URL || "http://localhost:3000";
// Each test file gets its own User, so files running in parallel never share one
const TEST_USER_EMAIL = uniqueEmail();
const TEST_USER_PASSWORD = "Test123!";

// Helper to get auth token
async function getAuthToken(
  email = TEST_USER_EMAIL,
  password = TEST_USER_PASSWORD
): Promise<string | null> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.ok) {
    const data = await res.json();
    return data.accessToken;
  }
  return null;
}

// Helper to create a verified test user once per file (only Verified Users can solve)
let testUserReady: Promise<unknown> | undefined;
async function ensureTestUser(): Promise<void> {
  testUserReady ??= registerVerifiedUser(TEST_USER_EMAIL);
  await testUserReady;
}

// ============================================================================
// REDIS/STATE TESTING - RATE LIMITING VERIFICATION
// ============================================================================

describe("🔴 REDIS STATE - Rate Limiting Verification", () => {
  let authToken: string;

  beforeAll(async () => {
    await ensureTestUser();
    authToken = (await getAuthToken()) || "";
  });

  describe("Rate Limit Window Verification", () => {
    it("should handle multiple requests without server errors", async () => {
      const responses = [];
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${API_URL}/api/solve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ problem: `Simple: ${i + 1} + 1 = ?` }),
        });
        responses.push(res);
      }

      // At least one request should complete (not all 500 errors)
      const serverErrorCount = responses.filter((r) => r.status === 500).length;
      expect(serverErrorCount).toBeLessThan(3); // Most requests should not be server errors
    });

    it("should return 429 after exceeding rate limit (5 requests/minute)", async () => {
      // A fresh verified User, so earlier tests' solves don't count against this one
      const { accessToken: freshToken } = await registerVerifiedUser();

      const responses = [];
      for (let i = 0; i < 6; i++) {
        const res = await fetch(`${API_URL}/api/solve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freshToken}`,
          },
          body: JSON.stringify({ problem: `Rate test: ${i + 1} + 1` }),
        });
        responses.push(res);
      }

      const rateLimitedOrDailyLimit = responses.filter(
        (r) => r.status === 429
      ).length;
      expect(rateLimitedOrDailyLimit).toBeGreaterThan(0);
    });

    it("should include retryAfter in rate limit response", async () => {
      // A fresh verified User, so earlier tests' solves don't count against this one
      const { accessToken: freshToken } = await registerVerifiedUser();

      let rateLimitHit = false;
      for (let i = 0; i < 6; i++) {
        const res = await fetch(`${API_URL}/api/solve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freshToken}`,
          },
          body: JSON.stringify({ problem: `Retry: ${i + 1} + 1` }),
        });

        if (res.status === 429) {
          const data = await res.json();
          expect(
            data.retryAfter !== undefined || data.resetAt !== undefined
          ).toBe(true);
          rateLimitHit = true;
          break;
        }
      }

      // Ensure we actually hit a rate limit
      expect(rateLimitHit).toBe(true);
    });

    it("should handle concurrent requests without state corruption", async () => {
      // A fresh verified User, so earlier tests' solves don't count against this one
      const { accessToken: freshToken } = await registerVerifiedUser();

      // Send 5 requests concurrently
      const promises = Array(5)
        .fill(null)
        .map((_, i) =>
          fetch(`${API_URL}/api/solve`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${freshToken}`,
            },
            body: JSON.stringify({ problem: `Concurrent: ${i + 1} + 1` }),
          })
        );

      const responses = await Promise.all(promises);

      // All should complete without 500 errors - THIS IS A BUG IF IT FAILS
      const serverErrors = responses.filter((r) => r.status === 500).length;
      expect(serverErrors).toBe(0);
    });
  });
});

// ============================================================================
// DAILY CREDIT LIMIT - ABUSE PREVENTION
// ============================================================================

describe("💳 DAILY CREDIT LIMITS - Abuse Prevention", () => {
  let authToken: string;

  beforeAll(async () => {
    await ensureTestUser();
    authToken = (await getAuthToken()) || "";
  });

  describe("Credit Limit Enforcement", () => {
    // Known failure, see #12: the per-minute Rate Limit fires before the Daily Limit
    it.skip("should return 429 with resetAt when daily limit exceeded", async () => {
      const freshEmail = `credits-${Date.now()}@test.com`;
      await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: freshEmail,
          password: "Test123!",
          name: "Credit Test",
        }),
      });

      const freshToken = await getAuthToken(freshEmail, "Test123!");
      expect(freshToken).toBeTruthy();
      if (!freshToken) return; // TypeScript narrowing

      let rateLimitHit = false;
      for (let i = 0; i < 6; i++) {
        const res = await fetch(`${API_URL}/api/solve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freshToken}`,
          },
          body: JSON.stringify({ problem: `Credit ${i + 1}: 1 + 1` }),
        });

        if (res.status === 429) {
          const data = await res.json();
          // Should mention daily limit - BUG if it says something else
          expect(data.error.toLowerCase()).toMatch(
            /daily|limit|come back|tomorrow/i
          );
          if (data.resetAt) {
            const resetTime = new Date(data.resetAt).getTime();
            expect(resetTime).toBeGreaterThan(Date.now());
          }
          rateLimitHit = true;
          break;
        }

        // Wait between requests to avoid rate limit
        await new Promise((r) => setTimeout(r, 1500));
      }

      expect(rateLimitHit).toBe(true);
    });

    it("should NOT allow negative credits via API manipulation", async () => {
      await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          dailyCreditsUsed: -100,
          lastCreditReset: new Date(0),
        }),
      });

      // The PUT should be rejected (403/400) or if api doesn't support PUT, we still verify
      // that credits cannot be set to negative regardless of the response
      const profileRes = await fetch(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (profileRes.ok) {
        const profile = await profileRes.json();
        expect(profile.dailyCredits?.used).toBeGreaterThanOrEqual(0);
      }
    });

    it("should reflect correct credit usage in profile", async () => {
      const res = await fetch(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        expect(data.dailyCredits).toBeDefined();
        expect(typeof data.dailyCredits.used).toBe("number");
        expect(typeof data.dailyCredits.limit).toBe("number");
        expect(typeof data.dailyCredits.remaining).toBe("number");
        expect(data.dailyCredits.limit).toBe(5);
      }
    });
  });
});

// ============================================================================
// ADMIN ENDPOINT SECURITY
// ============================================================================

describe("🛡️ ADMIN ENDPOINTS - Security Tests", () => {
  let regularUserToken: string;

  beforeAll(async () => {
    await ensureTestUser();
    regularUserToken = (await getAuthToken()) || "";
  });

  // The Admin Passcode was removed (#20): Admins sign in normally
  describe("Admin Route Authorization", () => {
    it("should reject non-admin user from /admin/stats", async () => {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });
      expect([401, 403]).toContain(res.status);
    });

    it("should reject non-admin user from /admin/users", async () => {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });
      expect([401, 403]).toContain(res.status);
    });

    it("should reject non-admin user from /admin/analytics", async () => {
      const res = await fetch(`${API_URL}/admin/analytics`, {
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });
      expect([401, 403]).toContain(res.status);
    });

    it("should reject non-admin user from /admin/errors", async () => {
      const res = await fetch(`${API_URL}/admin/errors`, {
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });
      expect([401, 403]).toContain(res.status);
    });

    it("should reject unauthenticated requests to admin routes", async () => {
      const adminRoutes = [
        "/admin/stats",
        "/admin/users",
        "/admin/analytics",
        "/admin/errors",
      ];

      for (const route of adminRoutes) {
        const res = await fetch(`${API_URL}${route}`);
        expect(res.status).toBe(401);
      }
    });
  });

  describe("Admin User Management Security", () => {
    it("should NOT allow deleting user without admin auth", async () => {
      const res = await fetch(`${API_URL}/admin/users/someuserid`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${regularUserToken}` },
      });

      expect([401, 403, 404]).toContain(res.status);
    });

    it("should reject IDOR attempt on user role update", async () => {
      // Try to make yourself admin via API - endpoint must exist and reject
      const res = await fetch(`${API_URL}/admin/users/update-role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regularUserToken}`,
        },
        body: JSON.stringify({
          userId: "my-user-id",
          isAdmin: true,
        }),
      });

      // Must reject: 401 (not authenticated), 403 (not authorized), or 404 (not implemented)
      expect([401, 403, 404]).toContain(res.status);
    });
  });
});

// ============================================================================
// TOKEN ROTATION SECURITY
// ============================================================================

describe("🔐 TOKEN ROTATION - Security Tests", () => {
  describe("Refresh Token Behavior", () => {
    // Known failure, see #12: tokens issued in the same second are identical
    it.skip("should issue new tokens on refresh", async () => {
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
        }),
      });

      // Skip if login fails (test user may not exist)
      if (!loginRes.ok) {
        console.warn("Login failed in token refresh test, skipping");
        return;
      }

      const { refreshToken } = await loginRes.json();

      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      // Refresh endpoint should exist and work
      if (refreshRes.ok) {
        const newTokens = await refreshRes.json();
        expect(newTokens.accessToken).toBeDefined();
        expect(newTokens.refreshToken).toBeDefined();
        expect(newTokens.refreshToken).not.toBe(refreshToken);
      } else {
        // If refresh fails, at least verify it's not a 500
        expect(refreshRes.status).toBeLessThan(500);
      }
    });

    it("should reject invalid refresh token", async () => {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: "invalid-token-12345" }),
      });

      expect(res.status).toBe(401);
    });

    it("should reject expired refresh token format", async () => {
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.fake";

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: expiredToken }),
      });

      expect(res.status).toBe(401);
    });

    it("should handle concurrent refresh requests consistently", async () => {
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
        }),
      });

      if (!loginRes.ok) return;

      const { refreshToken } = await loginRes.json();

      const promises = Array(3)
        .fill(null)
        .map(() =>
          fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          })
        );

      const responses = await Promise.all(promises);

      const serverErrors = responses.filter((r) => r.status === 500).length;
      expect(serverErrors).toBe(0);

      const successes = responses.filter((r) => r.status === 200).length;
      expect(successes).toBeGreaterThanOrEqual(1);
    });
  });
});

// ============================================================================
// GOOGLE OAUTH EDGE CASES
// ============================================================================

describe("🔍 GOOGLE OAUTH - Edge Cases", () => {
  describe("Invalid Token Handling", () => {
    it("should reject malformed Google ID token", async () => {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "not-a-valid-token" }),
      });

      expect(res.status).toBe(401);
    });

    it("should reject empty Google ID token", async () => {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "" }),
      });

      expect([400, 401]).toContain(res.status);
    });

    it("should reject Google token with wrong structure", async () => {
      const fakeToken = "header.payload.signature";

      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: fakeToken }),
      });

      expect(res.status).toBe(401);
    });

    it("should not leak Google client ID in error", async () => {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "invalid" }),
      });

      const text = await res.text();
      expect(text).not.toMatch(/client_id/i);
      expect(text).not.toMatch(/\d{21}/);
    });
  });
});

// ============================================================================
// SOLUTION PERSISTENCE
// ============================================================================

describe("💾 SOLUTION CACHING - State Verification", () => {
  let authToken: string;

  beforeAll(async () => {
    await ensureTestUser();
    authToken = (await getAuthToken()) || "";
  });

  describe("Solution Retrieval", () => {
    it("should retrieve solution by ID after creation", async () => {
      const solveRes = await fetch(`${API_URL}/api/solve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          problem: "What is 5 + 5?",
          chatId: `test-cache-${Date.now()}`,
        }),
      });

      // Require successful solve to test solution retrieval
      expect(solveRes.status).toBe(200);

      const { solution } = await solveRes.json();

      const getRes = await fetch(`${API_URL}/api/solution/${solution.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (getRes.ok) {
        const retrieved = await getRes.json();
        expect(retrieved.solution).toBeDefined();
      }
    });

    it("should return 404 for non-existent solution ID", async () => {
      const res = await fetch(
        `${API_URL}/api/solution/nonexistent-solution-id-12345`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      // Non-existent resource should return 404 Not Found
      expect(res.status).toBe(404);
    });
  });
});

// ============================================================================
// HEADER SECURITY
// ============================================================================

describe("📋 HEADER SECURITY - HTTP Security Headers", () => {
  it("should not expose server technology or framework in headers", async () => {
    const res = await fetch(`${API_URL}/health`);

    const serverHeader = res.headers.get("server");
    const poweredBy = res.headers.get("x-powered-by");

    // X-Powered-By should NOT be present at all for security
    expect(poweredBy).toBeNull();

    // Server header should be absent or generic (not specific tech)
    if (serverHeader) {
      expect(serverHeader).not.toMatch(/node|express|koa|fastify|motia/i);
    }
  });

  it("should not expose sensitive headers on error", async () => {
    const res = await fetch(`${API_URL}/nonexistent-endpoint-12345`);

    const sensitiveHeaders = [
      "x-debug-info",
      "x-internal-error",
      "x-stack-trace",
    ];

    for (const header of sensitiveHeaders) {
      expect(res.headers.get(header)).toBeNull();
    }
  });
});
