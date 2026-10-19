/**
 * The Onboarding answer: which Class range the student is in, and their
 * Board or university (#39). Both routes are mounted behind requireUser.
 *
 * PUT  /api/profile/class       saves the answer
 * POST /api/profile/class/skip  notes that the student skipped
 */

import { route } from "../lib/http";
import { getCurrentUser } from "../modules/auth/auth.middleware";
import { toPublicUser } from "../modules/auth/auth.service";
import { classAnswerSchema } from "../modules/users/class-info";
import { userRepository } from "../modules/users/user.repository";

// Checked here, not with routeWithBody, so a bad answer gets the INVALID_CLASS code
export const saveClassRoute = route(async (req) => {
  const parsed = classAnswerSchema.safeParse(req.body);
  if (!parsed.success) {
    return {
      status: 400,
      body: { error: parsed.error.issues[0]?.message ?? "Invalid class", code: "INVALID_CLASS" },
    };
  }

  const user = await userRepository.setClass(getCurrentUser(req).id, parsed.data);
  if (!user) {
    return { status: 404, body: { error: "User not found" } };
  }
  return { status: 200, body: { user: toPublicUser(user) } };
});

export const skipClassRoute = route(async (req) => {
  const user = await userRepository.skipOnboarding(getCurrentUser(req).id);
  if (!user) {
    return { status: 404, body: { error: "User not found" } };
  }
  return { status: 200, body: { user: toPublicUser(user) } };
});
