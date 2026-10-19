/**
 * The Class range and Board a student gives at Onboarding (#39), how an
 * answer is checked, and how it reads back. See CONTEXT.md for the terms.
 */

import { z } from "zod";
import type { Board, ClassRange } from "../../db/schema";
import type { User } from "./user.repository";

export type { Board, ClassRange };

export const CLASS_RANGES = ["class_1_5", "class_6_8", "class_9_10", "class_11_12", "college"] as const satisfies readonly ClassRange[];
export const BOARDS = ["cbse", "icse", "state", "ib", "cambridge", "other"] as const satisfies readonly Board[];

// Every range except college is a school range, which has a Board, not a university
export const SCHOOL_RANGES: ClassRange[] = CLASS_RANGES.filter((range) => range !== "college");

const MAX_STATE = 40;
const MAX_INSTITUTION = 120;

/**
 * One answer from the class and board steps. The board is optional, so a
 * young child who skips the Board step still keeps their class.
 */
export const classAnswerSchema = z
  .object({
    range: z.enum(CLASS_RANGES),
    helping: z.boolean(),
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
    const isSchool = answer.range !== "college";
    if (!isSchool && answer.board) {
      ctx.addIssue({ code: "custom", path: ["board"], message: "College has a university, not a board" });
    }
    if (isSchool && answer.institution) {
      ctx.addIssue({ code: "custom", path: ["institution"], message: "A university is only for college" });
    }
    if (answer.board === "state" && !answer.state) {
      ctx.addIssue({ code: "custom", path: ["state"], message: "A state board needs a state" });
    }
    if (answer.board !== "state" && answer.state) {
      ctx.addIssue({ code: "custom", path: ["state"], message: "A state is only for a state board" });
    }
  });

export type ClassAnswer = z.infer<typeof classAnswerSchema>;

export interface ClassInfo {
  range: ClassRange;
  helping: boolean;
  board: Board | null;
  state: string | null;
  institution: string | null;
}

/** The saved answer, or null when the student has not given a class. */
export function toClassInfo(user: User): ClassInfo | null {
  if (!user.classRange) return null;
  return {
    range: user.classRange,
    helping: user.helping,
    board: user.board ?? null,
    state: user.boardState ?? null,
    institution: user.institution ?? null,
  };
}

/** True until the student answers or skips. */
export function needsOnboarding(user: User): boolean {
  return user.classRange === null && user.onboardingSkippedAt === null;
}
