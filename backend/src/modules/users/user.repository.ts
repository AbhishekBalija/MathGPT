/**
 * All reads and writes of Users in Postgres.
 *
 * Only this file talks to the `users` table. IDs that are not valid UUIDs
 * are treated as "not found" here, so they never reach the database.
 */

import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import type { DbExecutor } from "../../db/transaction";
import { users, type AuthProvider, type UserRow } from "../../db/schema";

export type User = UserRow;

export interface NewUser {
  email: string;
  name: string;
  passwordHash?: string;
  provider: AuthProvider;
  // Only the create-admin script sets this; sign-up never does
  isAdmin?: boolean;
  googleId?: string;
  avatarUrl?: string;
  emailVerifiedAt?: Date;
}

/** Thrown by `create` when another User already has this email. */
export class EmailTakenError extends Error {
  constructor() {
    super("Email is already registered");
    this.name = "EmailTakenError";
  }
}

const userIdSchema = z.uuid();

function isUserId(id: string): boolean {
  return userIdSchema.safeParse(id).success;
}

/** Emails are stored lowercase, so lookups must use the same form. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Postgres reports a unique-constraint violation with code 23505.
// Drizzle wraps driver errors, so the code may sit on `cause`.
function isUniqueViolation(error: unknown, constraint: string): boolean {
  const candidates = [error, error instanceof Error ? error.cause : undefined];
  return candidates.some(
    (candidate) =>
      typeof candidate === "object" &&
      candidate !== null &&
      "code" in candidate &&
      candidate.code === "23505" &&
      "constraint" in candidate &&
      candidate.constraint === constraint
  );
}

// Escapes % and _ so a search for "50%" matches the text, not "50 then anything"
function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    if (!isUserId(id)) {
      return null;
    }
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizeEmail(email)));
    return user ?? null;
  },

  async findByGoogleId(googleId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId));
    return user ?? null;
  },

  /** Throws `EmailTakenError` if the email is already used. */
  async create(data: NewUser, executor: DbExecutor = db): Promise<User> {
    try {
      const [user] = await executor
        .insert(users)
        .values({ ...data, email: normalizeEmail(data.email) })
        .returning();
      if (!user) {
        throw new Error("Insert returned no row");
      }
      return user;
    } catch (error) {
      if (isUniqueViolation(error, "users_email_unique")) {
        throw new EmailTakenError();
      }
      throw error;
    }
  },

  /**
   * Connects a Google account to an existing User. Signing in with Google
   * proves they own the email, so it also marks them verified.
   */
  async linkGoogleAccount(
    id: string,
    googleId: string,
    avatarUrl: string | undefined
  ): Promise<User | null> {
    if (!isUserId(id)) {
      return null;
    }
    const [user] = await db
      .update(users)
      .set({
        googleId,
        avatarUrl: sql`coalesce(${users.avatarUrl}, ${avatarUrl ?? null})`,
        emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  },

  async setAdmin(id: string, isAdmin: boolean): Promise<User | null> {
    if (!isUserId(id)) {
      return null;
    }
    const [user] = await db
      .update(users)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  },

  /** Starts a new day: today's used Credits go back to 0. */
  async resetDailyCredits(id: string): Promise<void> {
    if (!isUserId(id)) {
      return;
    }
    await db
      .update(users)
      .set({ dailyCreditsUsed: 0, lastCreditReset: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  },

  /** Counts one Credit. A single UPDATE, so concurrent solves never lose a count. */
  async incrementCredits(id: string): Promise<void> {
    if (!isUserId(id)) {
      return;
    }
    await db
      .update(users)
      .set({
        dailyCreditsUsed: sql`${users.dailyCreditsUsed} + 1`,
        totalCreditsUsed: sql`${users.totalCreditsUsed} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  },

  async delete(id: string, executor: DbExecutor = db): Promise<boolean> {
    if (!isUserId(id)) {
      return false;
    }
    const deleted = await executor
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return deleted.length === 1;
  },

  /** Newest first, optionally filtered by a name or email search. */
  async list(options: {
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ users: User[]; total: number }> {
    const pattern = options.search
      ? `%${escapeLikePattern(options.search)}%`
      : undefined;
    const filter = pattern
      ? or(ilike(users.name, pattern), ilike(users.email, pattern))
      : undefined;

    const [rows, [totals]] = await Promise.all([
      db
        .select()
        .from(users)
        .where(filter)
        .orderBy(desc(users.createdAt))
        .limit(options.limit)
        .offset((options.page - 1) * options.limit),
      db.select({ total: count() }).from(users).where(filter),
    ]);

    return { users: rows, total: totals?.total ?? 0 };
  },

  async findRecent(limit: number): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
  },

  async count(): Promise<number> {
    const [totals] = await db.select({ total: count() }).from(users);
    return totals?.total ?? 0;
  },
};
