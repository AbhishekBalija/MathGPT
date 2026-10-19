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
// The three Roles, five Class ranges and six Boards a student picks from (see CONTEXT.md)
export type Role = "student" | "parent" | "teacher";
export type ClassRange = "class_1_5" | "class_6_8" | "class_9_10" | "class_11_12" | "college";
export type Board = "cbse" | "icse" | "state" | "ib" | "cambridge" | "other";

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
    // Our own accounts (owner, testers), left out of business numbers. Admins count as team too.
    isTeam: boolean("is_team").notNull().default(false),
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
    // Onboarding: the Role, Class ranges and Board asked once after sign-up (#39).
    // All empty until the student answers; a skip only sets onboarding_skipped_at.
    role: text("role").$type<Role>(),
    // One range for a student or parent, one or more for a teacher
    classRanges: text("class_ranges").array().$type<ClassRange[]>().notNull().default(sql`'{}'::text[]`),
    // Only with a school range
    board: text("board").$type<Board>(),
    // Only when board is "state"
    boardState: text("board_state"),
    // Only with College & above: the university or college, as typed
    institution: text("institution"),
    classSetAt: timestamp("class_set_at", { withTimezone: true }),
    onboardingSkippedAt: timestamp("onboarding_skipped_at", { withTimezone: true }),
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
    check("users_role_valid", sql`${table.role} is null or ${table.role} in ('student', 'parent', 'teacher')`),
    check(
      "users_class_ranges_valid",
      sql`${table.classRanges} <@ array['class_1_5', 'class_6_8', 'class_9_10', 'class_11_12', 'college']::text[]`
    ),
    check(
      "users_board_valid",
      sql`${table.board} is null or ${table.board} in ('cbse', 'icse', 'state', 'ib', 'cambridge', 'other')`
    ),
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
    // The shared-cache entry this Solution was served from or put into, so a
    // report can find and block it. Null for instant answers and old rows.
    cacheKey: text("cache_key"),
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

/**
 * Solutions shared between students, so the same problem is not paid for
 * twice. An entry is only served once its answer passed an independent check
 * (status "shared"). Nothing about the student is stored here.
 */
export const solutionCache = pgTable(
  "solution_cache",
  {
    // sha256 of the prompt version, the tidied problem, the level and the method
    key: text("key").primaryKey(),
    content: jsonb("content").$type<SolutionV2Content>().notNull(),
    problemType: text("problem_type").$type<ProblemType>().notNull(),
    hits: integer("hits").notNull().default(0),
    status: text("status").$type<CacheStatus>().notNull().default("unchecked"),
    // How the answer was confirmed: by code, or by a second model
    checkMethod: text("check_method").$type<CheckMethod>(),
    // The model ids used, e.g. { "primary": "gemini-2.5-flash", "second": "deepseek/..." }
    checkedBy: jsonb("checked_by").$type<{ primary?: string; second?: string }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("solution_cache_status_valid", sql`${table.status} in ('unchecked', 'shared', 'blocked')`),
    check(
      "solution_cache_check_method_valid",
      sql`${table.checkMethod} is null or ${table.checkMethod} in ('code', 'second-model')`
    ),
  ]
);

// A student saying a Solution looks wrong. Blocks its shared-cache entry.
// Kept when the student deletes the Solution (the link just goes null), so
// the problem and answer are copied in. Deleting the account removes it.
export const solutionReports = pgTable(
  "solution_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    solutionId: uuid("solution_id").references(() => solutions.id, { onDelete: "set null" }),
    problemText: text("problem_text"),
    answerText: text("answer_text"),
    cacheKey: text("cache_key"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("solution_reports_solution_id_idx").on(table.solutionId),
    index("solution_reports_user_id_idx").on(table.userId),
  ]
);

export type FeedbackKind = "bug" | "idea" | "other";

// A User's message about the app itself, not about one Solution (that is a
// Report). Deleting the account removes it.
export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<FeedbackKind>().notNull(),
    message: text("message").notNull(),
    // Where the User was, e.g. "/app", and the Solution they had open
    page: text("page"),
    solutionId: uuid("solution_id").references(() => solutions.id, { onDelete: "set null" }),
    done: boolean("done").notNull().default(false),
    doneBy: uuid("done_by").references(() => users.id, { onDelete: "set null" }),
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("feedback_kind_valid", sql`${table.kind} in ('bug', 'idea', 'other')`),
    index("feedback_done_created_at_idx").on(table.done, table.createdAt.desc()),
    index("feedback_user_id_idx").on(table.userId),
    index("feedback_solution_id_idx").on(table.solutionId),
    index("feedback_done_by_idx").on(table.doneBy),
  ]
);

export type CacheStatus = "unchecked" | "shared" | "blocked";
export type CheckMethod = "code" | "second-model";

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

export interface ErrorDetails {
  attempts: Array<{ model: string; error: string }>;
  promptVersion: string;
  fullMessage: string;
}

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
    // What each model said, the full message and the prompt version. Null for older records.
    details: jsonb("details").$type<ErrorDetails>(),
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

export type AlertStatus = "ok" | "failing";

// One row per kind of alert (e.g. "solving"), so an email goes out once
// when something starts failing and once when it recovers
export const alertState = pgTable(
  "alert_state",
  {
    kind: text("kind").primaryKey(),
    status: text("status").$type<AlertStatus>().notNull().default("ok"),
    // Times (ms) of recent failures, for "3 within 10 minutes"
    recent: jsonb("recent").$type<number[]>().notNull().default([]),
    consecutive: integer("consecutive").notNull().default(0),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  },
  (table) => [check("alert_state_status_valid", sql`${table.status} in ('ok', 'failing')`)]
);

// One row per admin setting (e.g. "dailyLimit"). A missing row means the
// default in modules/settings/settings.ts, so a new setting needs no migration.
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

// Every change to a setting: who, when, and the value before and after. Kept forever.
export const settingChanges = pgTable(
  "setting_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    oldValue: jsonb("old_value").$type<unknown>().notNull(),
    newValue: jsonb("new_value").$type<unknown>().notNull(),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("setting_changes_changed_at_idx").on(table.changedAt.desc()),
    index("setting_changes_changed_by_idx").on(table.changedBy),
  ]
);
