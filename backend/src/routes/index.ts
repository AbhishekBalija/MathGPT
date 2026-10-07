/**
 * Every API route in one place, so the full surface is easy to scan.
 * Paths are the same as the old Motia routes, so the frontend needs no changes.
 */

import { Router } from "express";
import type { AppServices } from "../app";
import {
  requireAdmin,
  requireUser,
  requireVerifiedEmail,
} from "../modules/auth/auth.middleware";
import { limitByIp } from "../modules/rate-limits/rate-limit.middleware";

import { healthRoute } from "./health.route";

import { createGoogleOAuthRoute } from "./auth/google-oauth.route";
import { loginRoute } from "./auth/login.route";
import { logoutRoute } from "./auth/logout.route";
import { meRoute } from "./auth/me.route";
import { refreshTokenRoute } from "./auth/refresh-token.route";
import { createRegisterRoute } from "./auth/register.route";
import { createResendVerificationRoute } from "./auth/resend-verification.route";
import { createVerifyEmailRoute } from "./auth/verify-email.route";

import { clearHistoryRoute } from "./clear-history.route";
import { deleteSolutionRoute } from "./delete-solution.route";
import { historyRoute } from "./history.route";
import { profileRoute } from "./profile.route";
import { publicStatsRoute } from "./public-stats.route";
import { getSolutionRoute } from "./solution.route";
import { createSolveRoute } from "./solve.route";

import { adminErrorsRoute } from "./admin/admin-errors.route";
import { adminResolveErrorRoute } from "./admin/admin-resolve-error.route";
import { adminAnalyticsRoute } from "./admin/analytics.route";
import { adminDeleteUserRoute } from "./admin/delete-user.route";
import { adminStatsRoute } from "./admin/stats.route";
import { adminTokenStatsRoute } from "./admin/token-stats.route";
import { adminUpdateRolePutRoute } from "./admin/update-role.route";
import { adminUpdateUserRoleRoute } from "./admin/update-user-role.route";
import { adminListUsersRoute } from "./admin/users.route";
import { adminVerifyPasscodeRoute } from "./admin/verify-passcode.route";

export function createRouter(services: AppServices) {
  const router = Router();

  router.get("/health", healthRoute);

  // Auth
  // Per-IP limits stop one client from farming accounts or guessing passwords (ADR-0003)
  router.post(
    "/auth/register",
    limitByIp("register", 5, 60 * 60),
    createRegisterRoute(services.emailSender)
  );
  router.post("/auth/login", limitByIp("login", 10, 15 * 60), loginRoute);
  // Google sign-in can also create accounts, so it shares the login budget
  router.post(
    "/auth/google",
    limitByIp("login", 10, 15 * 60),
    createGoogleOAuthRoute(services.emailSender)
  );
  router.post("/auth/refresh", refreshTokenRoute);
  router.post("/auth/logout", logoutRoute);
  router.get("/auth/me", requireUser, meRoute);
  router.post("/auth/verify-email", requireUser, createVerifyEmailRoute(services.emailSender));
  router.post(
    "/auth/resend-verification",
    requireUser,
    createResendVerificationRoute(services.emailSender)
  );

  // Solving and history
  router.post("/api/solve", requireUser, requireVerifiedEmail, createSolveRoute(services.solver));
  router.get("/api/history", requireUser, historyRoute);
  // The frontend calls DELETE /api/history; /api/clear-history is the older path
  router.delete("/api/history", requireUser, clearHistoryRoute);
  router.delete("/api/clear-history", requireUser, clearHistoryRoute);
  router.get("/api/solution/:id", requireUser, getSolutionRoute);
  router.delete("/api/solution/:id", requireUser, deleteSolutionRoute);
  router.get("/api/profile", requireUser, profileRoute);

  // Public
  router.get("/api/public-stats", publicStatsRoute);

  // Admin
  router.post("/admin/verify-passcode", adminVerifyPasscodeRoute);
  router.get("/admin/stats", requireUser, requireAdmin, adminStatsRoute);
  router.get("/admin/analytics", adminAnalyticsRoute);
  router.get("/admin/token-stats", adminTokenStatsRoute);
  router.get("/admin/errors", adminErrorsRoute);
  router.patch("/admin/errors/:id/resolve", adminResolveErrorRoute);
  router.get("/admin/users", requireUser, requireAdmin, adminListUsersRoute);
  router.put("/admin/users/update-role", requireUser, requireAdmin, adminUpdateRolePutRoute);
  router.patch("/admin/users/:id/role", requireUser, requireAdmin, adminUpdateUserRoleRoute);
  router.delete("/admin/users/:id", requireUser, requireAdmin, adminDeleteUserRoute);

  return router;
}
