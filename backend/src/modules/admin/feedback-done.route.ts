/**
 * PATCH /admin/feedback/:id/done - an Admin has read and handled this Feedback.
 * Mounted behind requireUser and requireAdmin.
 */

import { pathParam, route } from "../../lib/http";
import { logger } from "../../lib/logger";
import { getCurrentUser } from "../auth/auth.middleware";
import { feedbackRepository } from "../feedback/feedback.repository";

export const adminFeedbackDoneRoute = route(async (req) => {
  const admin = getCurrentUser(req);
  const feedbackId = pathParam(req, "id");

  if (!(await feedbackRepository.markDone(feedbackId, admin.id))) {
    return { status: 404, body: { error: "Feedback not found" } };
  }

  logger.info("Feedback marked done", { feedbackId, adminId: admin.id });
  return { status: 200, body: { done: true } };
});
