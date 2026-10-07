import { route } from "../../lib/http";
import { getCurrentUser } from "../../modules/auth/auth.middleware";

// GET /auth/me: the current User. Mounted behind requireUser.
export const meRoute = route(async (req) => {
  const user = getCurrentUser(req);

  return {
    status: 200,
    body: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatarUrl ?? undefined,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
      },
    },
  };
});
