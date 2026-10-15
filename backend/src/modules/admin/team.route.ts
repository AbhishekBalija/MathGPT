/**
 * PATCH /admin/users/:id/team - mark an account as one of ours (owner,
 * testers), so it is left out of business numbers. Admins always count
 * as team. Mounted behind requireUser and requireAdmin.
 */

import { z } from "zod";
import { pathParam, routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";
import { getCurrentUser } from "../auth/auth.middleware";
import { userRepository } from "../users/user.repository";

const teamSchema = z.object({ isTeam: z.boolean() });

export const adminTeamRoute = routeWithBody(teamSchema, async (req, body) => {
  const admin = getCurrentUser(req);
  const userId = pathParam(req, "id");

  const user = await userRepository.setTeam(userId, body.isTeam);
  if (!user) {
    return { status: 404, body: { error: "User not found" } };
  }

  logger.info("Team flag changed", { userId, isTeam: user.isTeam, adminId: admin.id });
  return { status: 200, body: { id: user.id, isTeam: user.isTeam } };
});
