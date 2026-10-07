import jwt from "jsonwebtoken";
import { requireEnv } from "../lib/env";
import { userRepository } from "../repositories/user.repository";

// No fallback: a default secret in the source code would let anyone forge tokens
const JWT_SECRET = requireEnv("JWT_SECRET");

interface TokenPayload {
    userId: string;
}

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
export async function verifyAuthToken(authHeader: string | undefined): Promise<AuthenticatedUser | null> {
    if (!authHeader) {
        return null;
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
        const user = await userRepository.findById(decoded.userId);

        if (!user) {
            return null;
        }

        return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
        };
    } catch (error) {
        return null;
    }
}

/**
 * Extract user from request headers
 * Throws if user is not authenticated
 */
export async function requireAuth(headers: Record<string, string | string[] | undefined>): Promise<AuthenticatedUser> {
    const authHeader = headers?.authorization || headers?.Authorization;
    const headerValue = typeof authHeader === 'string' ? authHeader : undefined;
    
    const user = await verifyAuthToken(headerValue);
    
    if (!user) {
        throw new Error("Unauthorized");
    }
    
    return user;
}

/**
 * Check if user is admin
 */
export async function requireAdmin(headers: Record<string, string | string[] | undefined>): Promise<AuthenticatedUser> {
    const user = await requireAuth(headers);
    
    if (!user.isAdmin) {
        throw new Error("Forbidden: Admin access required");
    }
    
    return user;
}
