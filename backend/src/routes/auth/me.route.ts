import { route } from "../../lib/http";
import { getCurrentUser } from "../../modules/auth/auth.middleware";
import { toPublicUser } from "../../modules/auth/auth.service";
import { userRepository } from "../../modules/users/user.repository";

// GET /auth/me: the current User, in the same shape as login and sign-up,
// so the Onboarding fields can't drift between them. Mounted behind requireUser.
export const meRoute = route(async (req) => {
  const user = await userRepository.findById(getCurrentUser(req).id);
  if (!user) {
    return { status: 404, body: { error: "User not found" } };
  }
  return { status: 200, body: { user: toPublicUser(user) } };
});
