/**
 * GET /admin/feedback - Feedback from Users, newest first, with the
 * sender's email. Query: includeDone=true, limit.
 * Mounted behind requireUser and requireAdmin.
 */

import { z } from "zod";
import { queryParam, route } from "../../lib/http";
import { feedbackRepository } from "../feedback/feedback.repository";

// Bad or missing values fall back to the default instead of reaching the database
const limitSchema = z.coerce.number().int().min(1).max(200).catch(50);

export const adminFeedbackRoute = route(async (req) => {
  const items = await feedbackRepository.listForAdmin({
    includeDone: queryParam(req, "includeDone") === "true",
    limit: limitSchema.parse(queryParam(req, "limit") ?? 50),
  });

  return {
    status: 200,
    body: {
      feedback: items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    },
  };
});
