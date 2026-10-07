/**
 * Authentication as Express middleware.
 *
 *   router.get("/auth/me", requireUser, meRoute);
 *   router.get("/admin/users", requireUser, requireAdmin, listUsersRoute);
 *   router.post("/api/solve", requireUser, requireVerifiedEmail, solveRoute);
 *
 * `requireUser` checks the access token, loads the User from Postgres and
 * remembers them for this request. Routes then call `getCurrentUser(req)`.
 */

import type { Request, RequestHandler } from "express";
import { AuthService } from "./auth.service";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
}

// One entry per request in flight; entries disappear with the request object
const currentUsers = new WeakMap<Request, CurrentUser>();

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
}

/** Loads the User behind the request's access token, or null. */
export async function authenticate(req: Request): Promise<CurrentUser | null> {
  const token = bearerToken(req);
  if (!token) {
    return null;
  }

  const user = await AuthService.userFromAccessToken(token);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

/** Responds 401 unless the request carries a valid access token. */
export const requireUser: RequestHandler = async (req, res, next) => {
  const user = await authenticate(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  currentUsers.set(req, user);
  next();
};

/** Responds 403 unless the current User is an Admin. Use after `requireUser`. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!currentUsers.get(req)?.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
};

/** Responds 403 with `EMAIL_NOT_VERIFIED` until the User confirms their email. Use after `requireUser`. */
export const requireVerifiedEmail: RequestHandler = (req, res, next) => {
  if (!currentUsers.get(req)?.emailVerified) {
    res.status(403).json({
      error: "Please verify your email before solving problems.",
      code: "EMAIL_NOT_VERIFIED",
    });
    return;
  }

  next();
};

/** The User attached by `requireUser`. Throws if the route forgot the middleware. */
export function getCurrentUser(req: Request): CurrentUser {
  const user = currentUsers.get(req);
  if (!user) {
    throw new Error("getCurrentUser called on a route without requireUser");
  }
  return user;
}
