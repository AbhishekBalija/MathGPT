import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { AuthService } from "../../services/auth/auth.service";

// Step 1: Define the route config
export const config: ApiRouteConfig = {
    name: "GetCurrentUser",
    type: "api",
    path: "/auth/me",
    method: "GET",
    description: "Get current authenticated user information",
    emits: [],
    flows: ["auth-flow"],
    responseSchema: {
        200: z.object({
            user: z.object({
                id: z.string(),
                email: z.string().email(),
                name: z.string(),
                avatar: z.string().optional(),
                isAdmin: z.boolean(),
            }),
        }),
        401: z.object({
            error: z.string(),
        }),
    },
};

// Step 2: Define the handlers
export const handler: Handlers["GetCurrentUser"] = async (req, { logger }) => {
    // Extract token from Authorization header
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = typeof authHeader === 'string' ? authHeader.replace("Bearer ", "") : "";

    if (!token) {
        logger.warn("No authorization token provided");
        return {
            status: 401,
            body: {
                error: "No authorization token provided",
            },
        };
    }

    logger.info("Getting current user");

    // Step 3: Verify token and get user
    const result = await AuthService.verifyToken(token);

    if (!result.success) {
        logger.warn("Token verification failed", { reason: result.error });
        return {
            status: 401,
            body: {
                error: result.error ?? "Invalid token",
            },
        };
    }

    logger.info("Current user retrieved", { email: result.user?.email });

    // Step 4: Return the response
    return {
        status: 200,
        body: {
            user: {
                id: result.user!.id.toString(),
                email: result.user!.email,
                name: result.user!.name,
                avatar: result.user!.avatar,
                isAdmin: result.user!.isAdmin,
            },
        },
    };
};
