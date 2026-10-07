/**
 * Every Postgres table, defined with Drizzle.
 *
 * Tables arrive here as features move off MongoDB.
 * After changing this file, run `bun run db:generate` to create a migration.
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export type AuthProvider = "email" | "google";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Always stored lowercase, so the unique index is case-insensitive in practice
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    // Null for Users who only sign in with Google
    passwordHash: text("password_hash"),
    isAdmin: boolean("is_admin").notNull().default(false),
    provider: text("provider").$type<AuthProvider>().notNull().default("email"),
    googleId: text("google_id").unique(),
    avatarUrl: text("avatar_url"),
    // Null means the User has not confirmed their email yet
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    dailyCreditsUsed: integer("daily_credits_used").notNull().default(0),
    lastCreditReset: timestamp("last_credit_reset", { withTimezone: true })
      .notNull()
      .defaultNow(),
    totalCreditsUsed: integer("total_credits_used").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("users_email_lowercase", sql`${table.email} = lower(${table.email})`),
    check("users_provider_valid", sql`${table.provider} in ('email', 'google')`),
  ]
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
