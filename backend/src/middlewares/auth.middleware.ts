/**
 * Older auth helpers that routes call themselves.
 *
 * Being replaced by the `requireUser` / `requireAdmin` middleware in
 * `modules/auth/auth.middleware.ts`. Routes still using these move over as
 * their feature is migrated (#7, #9). Both read Users from Postgres.
 */

import { AuthService } from "../modules/auth/auth.service";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isAdmin: boolean;
}

/**
 * Verify JWT token and return user info
 * @param authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns User info if valid, null if invalid
 */
export async function verifyAuthToken(
  authHeader: string | undefined
): Promise<AuthenticatedUser | null> {
  const token = authHeader?.replace("Bearer ", "");
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
    avatar: user.avatarUrl ?? undefined,
    isAdmin: user.isAdmin,
  };
}

/**
 * Extract user from request headers
 * Throws if user is not authenticated
 */
export async function requireAuth(
  headers: Record<string, string | string[] | undefined>
): Promise<AuthenticatedUser> {
  const authHeader = headers?.authorization || headers?.Authorization;
  const headerValue = typeof authHeader === "string" ? authHeader : undefined;

  const user = await verifyAuthToken(headerValue);

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Check if user is admin
 */
export async function requireAdmin(
  headers: Record<string, string | string[] | undefined>
): Promise<AuthenticatedUser> {
  const user = await requireAuth(headers);

  if (!user.isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}
