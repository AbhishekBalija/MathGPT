/**
 * Verification Codes: 6 random digits, stored only as an HMAC.
 *
 * A plain SHA-256 of a 6-digit code can be reversed by trying all million
 * codes in well under a second, so a leaked table would verify anyone.
 * Keying the hash with a server secret (never stored in the database) and
 * binding it to the User id makes the stored value useless on its own.
 */

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { requireEnv } from "../../lib/env";

// Reuses the JWT secret with its own label, so no extra env var is needed
const SECRET = requireEnv("JWT_SECRET");

export const CODE_LIFETIME_MS = 15 * 60 * 1000;
export const MAX_WRONG_ATTEMPTS = 5;

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashCode(userId: string, code: string): string {
  return createHmac("sha256", SECRET)
    .update(`verification-code:${userId}:${code}`)
    .digest("hex");
}

/** Constant-time comparison, so response timing never hints at the right code. */
export function codeMatches(userId: string, code: string, storedHash: string): boolean {
  const given = Buffer.from(hashCode(userId, code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return given.length === stored.length && timingSafeEqual(given, stored);
}
