import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { inTransaction } from "../../db/transaction";
import { requireEnv } from "../../lib/env";
import {
  EmailTakenError,
  normalizeEmail,
  userRepository,
  type User,
} from "../users/user.repository";
import { EmailVerificationService } from "./email-verification.service";

// No fallbacks: a default secret in the source code would let anyone forge tokens
const JWT_SECRET = requireEnv("JWT_SECRET");
const JWT_REFRESH_SECRET = requireEnv("JWT_REFRESH_SECRET");
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
const GOOGLE_CLIENT_ID =
  process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// What we put inside every token. Tokens from before the Postgres move carry
// a MongoDB id instead of a UUID, so they fail this check and need a new login.
const tokenPayloadSchema = z.object({ userId: z.uuid() });

/** The User fields every auth response shares. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isAdmin: boolean;
  emailVerified: boolean;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatarUrl ?? undefined,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

function createTokens(userId: string) {
  // A unique jwtid makes every token different, even within the same second
  const accessToken = jwt.sign({ userId }, JWT_SECRET, {
    jwtid: randomUUID(),
    expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
  });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    jwtid: randomUUID(),
    expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
  });
  return { accessToken, refreshToken };
}

/** Returns the User id inside a valid token, or null for anything else. */
function readUserId(token: string, secret: string): string | null {
  try {
    const parsed = tokenPayloadSchema.safeParse(jwt.verify(token, secret));
    return parsed.success ? parsed.data.userId : null;
  } catch {
    return null;
  }
}

// One answer for every failed login, so it never reveals whether an email
// is registered or signs in with Google (#17)
const LOGIN_FAILED = "Invalid email or password.";

// Compared against when there is no real hash, so a missing account takes
// about as long to reject as a wrong password does
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password", 10);

export const AuthService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);

    // Users who only signed up with Google have no password hash
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!user || !user.passwordHash || !isPasswordValid) {
      return { success: false as const, error: LOGIN_FAILED };
    }

    return {
      success: true as const,
      user: toPublicUser(user),
      ...createTokens(user.id),
    };
  },

  async register(data: { email: string; password: string; name: string }) {
    const duplicateEmailError =
      "Registration failed. Please try again or use a different email.";

    // Cheap early check; the unique constraint below still catches races
    if (await userRepository.findByEmail(data.email)) {
      return { success: false as const, error: duplicateEmailError };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // The User and their first Verification Code are created together
    let created: { user: User; verificationCode: string };
    try {
      created = await inTransaction(async (tx) => {
        const user = await userRepository.create(
          { email: data.email, passwordHash, name: data.name, provider: "email" },
          tx
        );
        const verificationCode = await EmailVerificationService.issueCode(user.id, tx);
        return { user, verificationCode };
      });
    } catch (error) {
      if (error instanceof EmailTakenError) {
        return { success: false as const, error: duplicateEmailError };
      }
      throw error;
    }

    return {
      success: true as const,
      user: toPublicUser(created.user),
      verificationCode: created.verificationCode,
      ...createTokens(created.user.id),
    };
  },

  async googleLogin(idToken: string) {
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (error) {
      return {
        success: false as const,
        error:
          error instanceof Error ? error.message : "Google authentication failed",
      };
    }

    if (!payload) {
      return { success: false as const, error: "Invalid Google token" };
    }

    const { sub: googleId, email, name, picture } = payload;
    if (!email || !googleId) {
      return { success: false as const, error: "Google account missing email or ID" };
    }

    // Without this, someone could put another person's address on a Google
    // account and take over that person's NeoMath account by linking
    if (payload.email_verified !== true) {
      return { success: false as const, error: "Google has not verified this email address" };
    }

    const result = await findOrCreateGoogleUser({
      googleId,
      email: normalizeEmail(email),
      name: name || email.split("@")[0] || "there",
      avatarUrl: picture,
    });
    if (!result) {
      return {
        success: false as const,
        error: "This email is already linked to a different Google account",
      };
    }
    const { user, isNewUser } = result;

    return {
      success: true as const,
      user: toPublicUser(user),
      ...createTokens(user.id),
      isNewUser,
    };
  },

  async refreshToken(token: string) {
    const userId = readUserId(token, JWT_REFRESH_SECRET);
    if (!userId) {
      return { success: false as const, error: "Invalid or expired refresh token" };
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return { success: false as const, error: "User not found" };
    }

    return { success: true as const, ...createTokens(user.id) };
  },

  /** The User an access token belongs to, or null if the token is not valid. */
  async userFromAccessToken(token: string): Promise<User | null> {
    const userId = readUserId(token, JWT_SECRET);
    return userId ? userRepository.findById(userId) : null;
  },
};

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Returns null when the email belongs to a User already linked to a
 * different Google account; that link is never replaced.
 */
async function findOrCreateGoogleUser(
  profile: GoogleProfile
): Promise<{ user: User; isNewUser: boolean } | null> {
  const existing = await findExistingGoogleUser(profile);
  if (existing !== undefined) {
    return existing && { user: existing, isNewUser: false };
  }

  try {
    // Google has already confirmed this email, so the User starts verified
    const user = await userRepository.create({
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
      avatarUrl: profile.avatarUrl,
      provider: "google",
      emailVerifiedAt: new Date(),
    });
    return { user, isNewUser: true };
  } catch (error) {
    // Two first sign-ins raced and the other one created the User: use theirs
    if (error instanceof EmailTakenError) {
      const winner = await findExistingGoogleUser(profile);
      if (winner !== undefined) {
        return winner && { user: winner, isNewUser: false };
      }
    }
    throw error;
  }
}

/**
 * undefined: no User yet. null: the email is linked to another Google account.
 * Otherwise the User, linked to this Google account if they were not before.
 */
async function findExistingGoogleUser(
  profile: GoogleProfile
): Promise<User | null | undefined> {
  const byGoogleId = await userRepository.findByGoogleId(profile.googleId);
  if (byGoogleId) {
    return byGoogleId;
  }

  const byEmail = await userRepository.findByEmail(profile.email);
  if (!byEmail) {
    return undefined;
  }
  if (byEmail.googleId && byEmail.googleId !== profile.googleId) {
    return null;
  }

  // Same email signed up with a password before: link the Google account
  const linked = await userRepository.linkGoogleAccount(
    byEmail.id,
    profile.googleId,
    profile.avatarUrl
  );
  return linked ?? byEmail;
}
