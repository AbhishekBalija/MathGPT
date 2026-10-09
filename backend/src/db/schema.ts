/**
 * Every Postgres table, defined with Drizzle.
 *
 * All data lives in Postgres.
 * After changing this file, run `bun run db:generate` to create a migration.
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ProblemType, SolutionStep } from "../types/solve.types";
import type { SolutionV2Content } from "../modules/solutions/solution-v2.schema";

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

// One active Verification Code per User; issuing a new code replaces the old one
export const emailVerifications = pgTable("email_verifications", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // HMAC of the code, never the code itself
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Fixed-window counters shared by every server instance, e.g. key
// "resend-verification:minute:<userId>". See modules/rate-limits.
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

export const solutions = pgTable(
  "solutions",
  {
    // The id the solver generated, so the id returned by solving is the one
    // used to fetch and delete the Solution (ADR-0002)
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: text("chat_id"),
    problem: text("problem").notNull(),
    // Text, not an enum, so new Problem Types need no migration (ADR-0002)
    problemType: text("problem_type").$type<ProblemType>().notNull(),
    steps: jsonb("steps").$type<SolutionStep[]>().notNull(),
    finalAnswer: text("final_answer").notNull(),
    summary: text("summary").notNull(),
    // New format (null on old rows); format_version says which one a row uses
    content: jsonb("content").$type<SolutionV2Content>(),
    formatVersion: integer("format_version").notNull().default(1),
    processingTimeMs: integer("processing_time_ms").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // History: one User's Solutions, newest first
    index("solutions_user_id_created_at_idx").on(table.userId, table.createdAt.desc()),
    index("solutions_problem_type_idx").on(table.problemType),
  ]
);

export type SolutionRow = typeof solutions.$inferSelect;

// Something that happened, e.g. "solution_saved", for admin statistics
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventName: text("event_name").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("analytics_events_event_name_created_at_idx").on(
      table.eventName,
      table.createdAt.desc()
    ),
    // Deleting a User nulls these out, and Admins filter by User
    index("analytics_events_user_id_idx").on(table.userId),
  ]
);

// A failed solve, kept so an Admin can review it and mark it resolved
export const errorLogs = pgTable(
  "error_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    errorCode: text("error_code").notNull(),
    errorMessage: text("error_message").notNull(),
    problemText: text("problem_text").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    processingTimeMs: integer("processing_time_ms"),
    resolved: boolean("resolved").notNull().default(false),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("error_logs_resolved_created_at_idx").on(table.resolved, table.createdAt.desc()),
    index("error_logs_error_code_idx").on(table.errorCode),
    index("error_logs_user_id_idx").on(table.userId),
    index("error_logs_resolved_by_idx").on(table.resolvedBy),
  ]
);
