/**
 * POST /api/feedback - the current User tells us something about the app:
 * a bug, an idea or anything else. Mounted behind requireUser.
 */

import { z } from "zod";
import { routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";
import { getCurrentUser } from "../auth/auth.middleware";
import { solutionRepository } from "../solutions/solution.repository";
import { feedbackRepository } from "./feedback.repository";

const feedbackSchema = z.object({
  kind: z.enum(["bug", "idea", "other"]),
  message: z.string().trim().min(1, "Please write a message").max(1000, "Please keep it under 1000 characters"),
  // A path inside the app, like "/app", never a full URL or "//other.site"
  page: z.string().max(200).regex(/^\/(?!\/)/, "Page must be a path in the app").optional(),
  solutionId: z.string().optional(),
});

export const sendFeedbackRoute = routeWithBody(feedbackSchema, async (req, body) => {
  const user = getCurrentUser(req);

  // Only the User's own Solution is attached; anything else is quietly dropped
  const solution = body.solutionId ? await solutionRepository.findForUser(user.id, body.solutionId) : null;

  await feedbackRepository.create({
    userId: user.id,
    kind: body.kind,
    message: body.message,
    page: body.page,
    solutionId: solution?.id,
  });

  logger.info("Feedback sent", { userId: user.id, kind: body.kind });
  return { status: 201, body: { success: true } };
});
