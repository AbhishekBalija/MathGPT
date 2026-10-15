import { count, desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { isUuid } from "../../lib/ids";
import { feedback, users, type FeedbackKind } from "../../db/schema";

export interface NewFeedback {
  userId: string;
  kind: FeedbackKind;
  message: string;
  page?: string;
  solutionId?: string;
}

export interface FeedbackForAdmin {
  id: string;
  kind: FeedbackKind;
  message: string;
  page: string | null;
  solutionId: string | null;
  userId: string;
  name: string;
  email: string;
  done: boolean;
  createdAt: Date;
}

export const feedbackRepository = {
  async create(item: NewFeedback): Promise<void> {
    await db.insert(feedback).values({ ...item, page: item.page ?? null, solutionId: item.solutionId ?? null });
  },

  /** Newest first, with the sender's email. Done items only when asked for. */
  async listForAdmin(options: { includeDone: boolean; limit: number }): Promise<FeedbackForAdmin[]> {
    return db
      .select({
        id: feedback.id,
        kind: feedback.kind,
        message: feedback.message,
        page: feedback.page,
        solutionId: feedback.solutionId,
        userId: users.id,
        name: users.name,
        email: users.email,
        done: feedback.done,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .innerJoin(users, eq(users.id, feedback.userId))
      .where(options.includeDone ? undefined : eq(feedback.done, false))
      .orderBy(desc(feedback.createdAt))
      .limit(options.limit);
  },

  /** Marks it handled. Returns false if there is no such Feedback. */
  async markDone(id: string, adminId: string): Promise<boolean> {
    if (!isUuid(id)) return false;
    const rows = await db
      .update(feedback)
      .set({ done: true, doneBy: adminId, doneAt: new Date() })
      .where(eq(feedback.id, id))
      .returning({ id: feedback.id });
    return rows.length > 0;
  },

  /** Feedback an Admin has not marked done yet. */
  async countOpen(): Promise<number> {
    const [row] = await db.select({ total: count() }).from(feedback).where(eq(feedback.done, false));
    return row?.total ?? 0;
  },
};
