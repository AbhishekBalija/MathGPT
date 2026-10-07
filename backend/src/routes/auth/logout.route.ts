import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

// Step 1: Define the route config
export const config: ApiRouteConfig = {
    name: "LogoutUser",
    type: "api",
    path: "/auth/logout",
    method: "POST",
    description: "Logout user and invalidate tokens",
    emits: [],
    flows: ["auth-flow"],
    responseSchema: {
        200: z.object({
            message: z.string(),
        }),
    },
};

// Step 2: Define the handlers
export const handler: Handlers["LogoutUser"] = async (req, { logger }) => {
    logger.info("User logout");

    // Note: For stateless JWT, logout is typically handled client-side
    // by removing tokens from storage. For more security, you could:
    // 1. Add refresh token to a blocklist in Redis
    // 2. Use short-lived access tokens
    // 3. Implement token versioning per user

    // For now, we just acknowledge the logout
    // In production, you might want to invalidate refresh tokens in Redis

    return {
        status: 200,
        body: {
            message: "Logged out successfully",
        },
    };
};
