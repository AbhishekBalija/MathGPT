/**
 * Verification Codes waiting to be entered. One row per User at most.
 */

import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { emailVerifications, users } from "../../db/schema";
import type { DbExecutor } from "../../db/transaction";
import { MAX_WRONG_ATTEMPTS } from "./verification-code";

export type PendingCode = typeof emailVerifications.$inferSelect;

export const emailVerificationRepository = {
  /** Stores a new code, replacing any older one and resetting its attempts. */
  async replaceCode(
    userId: string,
    codeHash: string,
    expiresAt: Date,
    executor: DbExecutor = db
  ): Promise<void> {
    await executor
      .insert(emailVerifications)
      .values({ userId, codeHash, expiresAt, attempts: 0 })
      .onConflictDoUpdate({
        target: emailVerifications.userId,
        set: { codeHash, expiresAt, attempts: 0, createdAt: new Date() },
      });
  },

  /**
   * Uses up one attempt and returns the code to check against, in a single
   * UPDATE. Parallel guesses therefore can never go past the limit.
   * Returns null when there is no code or its attempts are used up.
   */
  async claimAttempt(userId: string): Promise<PendingCode | null> {
    const [row] = await db
      .update(emailVerifications)
      .set({ attempts: sql`${emailVerifications.attempts} + 1` })
      .where(
        and(
          eq(emailVerifications.userId, userId),
          lt(emailVerifications.attempts, MAX_WRONG_ATTEMPTS)
        )
      )
      .returning();
    return row ?? null;
  },

  async hasCode(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ userId: emailVerifications.userId })
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, userId));
    return row !== undefined;
  },

  /** Marks the User verified and removes their code, together. */
  async markVerified(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      await tx.delete(emailVerifications).where(eq(emailVerifications.userId, userId));
    });
  },
};
