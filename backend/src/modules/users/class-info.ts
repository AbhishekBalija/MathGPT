/**
 * The Role, Class ranges and Board a student gives at Onboarding (#39), how
 * an answer is checked, and how it reads back. See CONTEXT.md for the terms.
 */

import { z } from "zod";
import type { Board, ClassRange, Role } from "../../db/schema";
import type { User } from "./user.repository";

export type { Board, ClassRange, Role };

export const ROLES = ["student", "parent", "teacher"] as const satisfies readonly Role[];
export const CLASS_RANGES = ["class_1_5", "class_6_8", "class_9_10", "class_11_12", "college"] as const satisfies readonly ClassRange[];
export const BOARDS = ["cbse", "icse", "state", "ib", "cambridge", "other"] as const satisfies readonly Board[];

const MAX_STATE = 40;
const MAX_INSTITUTION = 120;

/**
 * One answer from the onboarding steps. Only the role is required: Skip on
 * the class step sends the role alone, and Skip on the board step sends the
 * role and classes without a board.
 */
export const classAnswerSchema = z
  .object({
    role: z.enum(ROLES),
    ranges: z.array(z.enum(CLASS_RANGES)).max(CLASS_RANGES.length).default([]),
    board: z.enum(BOARDS).optional(),
    state: z.string().trim().min(1).max(MAX_STATE).optional(),
    // Empty or only spaces means "not given"
    institution: z
      .string()
      .max(MAX_INSTITUTION)
      .transform((text) => text.trim() || null)
      .optional(),
  })
  .superRefine((answer, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const hasSchool = answer.ranges.some((range) => range !== "college");
    const hasCollege = answer.ranges.includes("college");

    if (new Set(answer.ranges).size !== answer.ranges.length) fail("ranges", "Each class can be picked once");
    // A student or parent answers for one class; a teacher can teach several
    if (answer.role !== "teacher" && answer.ranges.length > 1) fail("ranges", "Pick one class");
    if (answer.board && !hasSchool) fail("board", "A board needs a school class");
    if (answer.institution && !hasCollege) fail("institution", "A university needs College & above");
    if (answer.board === "state" && !answer.state) fail("state", "A state board needs a state");
    if (answer.board !== "state" && answer.state) fail("state", "A state is only for a state board");
  });

export type ClassAnswer = z.infer<typeof classAnswerSchema>;

export interface ClassInfo {
  role: Role;
  ranges: ClassRange[];
  board: Board | null;
  state: string | null;
  institution: string | null;
}

/** The saved answer, or null when the student has not given a role. */
export function toClassInfo(user: User): ClassInfo | null {
  if (!user.role) return null;
  return {
    role: user.role,
    ranges: user.classRanges,
    board: user.board ?? null,
    state: user.boardState ?? null,
    institution: user.institution ?? null,
  };
}

/** True until the student gives a role or skips. */
export function needsOnboarding(user: User): boolean {
  return user.role === null && user.onboardingSkippedAt === null;
}
