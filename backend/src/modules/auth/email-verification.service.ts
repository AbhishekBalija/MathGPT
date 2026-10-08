/**
 * Confirming a User owns their email (ADR-0003). Only Verified Users can
 * solve. Codes are issued on email sign-up and on request.
 */

import type { DbExecutor } from "../../db/transaction";
import { rateLimitRepository } from "../rate-limits/rate-limit.repository";
import { emailVerificationRepository } from "./email-verification.repository";
import {
  CODE_LIFETIME_MS,
  codeMatches,
  generateCode,
  hashCode,
} from "./verification-code";

// A User may ask for a new code at most once a minute and 5 times an hour
const RESEND_LIMITS = [
  { name: "minute", limit: 1, windowSeconds: 60 },
  { name: "hour", limit: 5, windowSeconds: 60 * 60 },
] as const;

export type VerifyResult =
  // newlyVerified is false when a parallel request verified the User first
  | { ok: true; newlyVerified: boolean }
  | { ok: false; error: string };

export type ResendResult =
  | { ok: true; code: string }
  | { ok: false; retryAfterSeconds: number };

export const EmailVerificationService = {
  /** Creates a fresh code (replacing any old one) and returns it for emailing. */
  async issueCode(userId: string, executor?: DbExecutor): Promise<string> {
    const code = generateCode();
    await emailVerificationRepository.replaceCode(
      userId,
      hashCode(userId, code),
      new Date(Date.now() + CODE_LIFETIME_MS),
      executor
    );
    return code;
  },

  async verify(userId: string, code: string): Promise<VerifyResult> {
    // Counts this attempt before checking, so the 6th try fails even if correct
    const pending = await emailVerificationRepository.claimAttempt(userId);

    if (!pending) {
      const hasCode = await emailVerificationRepository.hasCode(userId);
      return {
        ok: false,
        error: hasCode
          ? "Too many wrong attempts. Please request a new code."
          : "No active verification code. Please request a new one.",
      };
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      return { ok: false, error: "This code has expired. Please request a new one." };
    }

    if (!codeMatches(userId, code, pending.codeHash)) {
      return { ok: false, error: "That code is not correct." };
    }

    const newlyVerified = await emailVerificationRepository.markVerified(userId);
    return { ok: true, newlyVerified };
  },

  async resend(userId: string): Promise<ResendResult> {
    for (const { name, limit, windowSeconds } of RESEND_LIMITS) {
      const result = await rateLimitRepository.hit(
        `resend-verification:${name}:${userId}`,
        limit,
        windowSeconds
      );
      if (!result.allowed) {
        return { ok: false, retryAfterSeconds: result.retryAfterSeconds };
      }
    }

    return { ok: true, code: await this.issueCode(userId) };
  },
};
