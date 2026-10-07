/**
 * Every API route in one place, so the full surface is easy to scan.
 * Paths are the same as the old Motia routes, so the frontend needs no changes.
 */

import { Router } from "express";

import { healthRoute } from "./health.route";

import { googleOAuthRoute } from "./auth/google-oauth.route";
import { loginRoute } from "./auth/login.route";
import { logoutRoute } from "./auth/logout.route";
import { meRoute } from "./auth/me.route";
import { refreshInviteRoute } from "./auth/refresh-invite.route";
import { refreshTokenRoute } from "./auth/refresh-token.route";
import { registerInviteRoute } from "./auth/register-invite.route";
import { registerRoute } from "./auth/register.route";

import { clearHistoryRoute } from "./clear-history.route";
import { deleteSolutionRoute } from "./delete-solution.route";
import { historyRoute } from "./history.route";
import { profileRoute } from "./profile.route";
import { publicStatsRoute } from "./public-stats.route";
import { getSolutionRoute } from "./solution.route";
import { solveRoute } from "./solve.route";
import { joinWaitlistRoute } from "./waitlist.route";

import { adminErrorsRoute } from "./admin/admin-errors.route";
import { adminResolveErrorRoute } from "./admin/admin-resolve-error.route";
import { adminAnalyticsRoute } from "./admin/analytics.route";
import { adminDeleteUserRoute } from "./admin/delete-user.route";
import { adminInviteUserRoute } from "./admin/invite-user.route";
import { adminListWaitlistRoute } from "./admin/list-waitlist.route";
import { adminResendConfirmationRoute } from "./admin/resend-confirmation.route";
import { adminStatsRoute } from "./admin/stats.route";
import { adminTokenStatsRoute } from "./admin/token-stats.route";
import { adminUpdateRolePutRoute } from "./admin/update-role.route";
import { adminUpdateUserRoleRoute } from "./admin/update-user-role.route";
import { adminListUsersRoute } from "./admin/users.route";
import { adminVerifyPasscodeRoute } from "./admin/verify-passcode.route";

export const router = Router();

router.get("/health", healthRoute);

// Auth
router.post("/auth/register", registerRoute);
router.post("/auth/register-invite", registerInviteRoute);
router.post("/auth/refresh-invite", refreshInviteRoute);
router.post("/auth/login", loginRoute);
router.post("/auth/google", googleOAuthRoute);
router.post("/auth/refresh", refreshTokenRoute);
router.post("/auth/logout", logoutRoute);
router.get("/auth/me", meRoute);

// Solving and history
router.post("/api/solve", solveRoute);
router.get("/api/history", historyRoute);
router.delete("/api/clear-history", clearHistoryRoute);
router.get("/api/solution/:id", getSolutionRoute);
router.delete("/api/solution/:id", deleteSolutionRoute);
router.get("/api/profile", profileRoute);

// Public
router.get("/api/public-stats", publicStatsRoute);
router.post("/api/waitlist", joinWaitlistRoute);

// Admin
router.post("/admin/verify-passcode", adminVerifyPasscodeRoute);
router.get("/admin/stats", adminStatsRoute);
router.get("/admin/analytics", adminAnalyticsRoute);
router.get("/admin/token-stats", adminTokenStatsRoute);
router.get("/admin/errors", adminErrorsRoute);
router.patch("/admin/errors/:id/resolve", adminResolveErrorRoute);
router.get("/admin/users", adminListUsersRoute);
router.put("/admin/users/update-role", adminUpdateRolePutRoute);
router.patch("/admin/users/:id/role", adminUpdateUserRoleRoute);
router.delete("/admin/users/:id", adminDeleteUserRoute);
router.get("/admin/waitlist", adminListWaitlistRoute);
router.post("/admin/invite-user", adminInviteUserRoute);
router.post("/admin/resend-confirmation", adminResendConfirmationRoute);
