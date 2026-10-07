/**
 * Every admin endpoint, mounted at /admin behind requireUser and requireAdmin.
 *
 * Admins sign in normally; there is no second passcode (#20). Admin rights
 * come only from an existing Admin or scripts/create-admin.ts.
 */

import { Router } from "express";
import { requireAdmin, requireUser } from "../auth/auth.middleware";
import { adminErrorsRoute } from "./admin-errors.route";
import { adminResolveErrorRoute } from "./admin-resolve-error.route";
import { adminAnalyticsRoute } from "./analytics.route";
import { adminDeleteUserRoute } from "./delete-user.route";
import { adminStatsRoute } from "./stats.route";
import { adminTokenStatsRoute } from "./token-stats.route";
import { adminUpdateRolePutRoute } from "./update-role.route";
import { adminUpdateUserRoleRoute } from "./update-user-role.route";
import { adminListUsersRoute } from "./users.route";

export function createAdminRouter(): Router {
  const admin = Router();

  // One check for the whole module: 401 without a login, 403 for non-Admins
  admin.use(requireUser, requireAdmin);

  admin.get("/stats", adminStatsRoute);
  admin.get("/token-stats", adminTokenStatsRoute);
  admin.get("/analytics", adminAnalyticsRoute);
  admin.get("/errors", adminErrorsRoute);
  admin.patch("/errors/:id/resolve", adminResolveErrorRoute);
  admin.get("/users", adminListUsersRoute);
  admin.put("/users/update-role", adminUpdateRolePutRoute);
  admin.patch("/users/:id/role", adminUpdateUserRoleRoute);
  admin.delete("/users/:id", adminDeleteUserRoute);

  return admin;
}
