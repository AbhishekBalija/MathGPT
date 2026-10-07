import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { AuthService } from "../../services/auth/auth.service";

// Defining body schema
const RefreshTokenSchema = z.object({
    refreshToken: z.string(),
});

// Step 1: Define the route config
export const config: ApiRouteConfig = {
    name: "RefreshToken",
    type: "api",
    path: "/auth/refresh",
    method: "POST",
    description: "Refresh access token using refresh token",
    bodySchema: RefreshTokenSchema,
    emits: [],
    flows: ["auth-flow"],
    responseSchema: {
        200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
        }),
        401: z.object({
            error: z.string(),
        }),
    },
};

// Step 2: Define the handlers
export const handler: Handlers["RefreshToken"] = async (req, { logger }) => {
    const { refreshToken } = RefreshTokenSchema.parse(req.body);

    logger.info("Token refresh attempt");

    // Step 3: Call the service to refresh the token
    const result = await AuthService.refreshToken(refreshToken);

    if (!result.success) {
        logger.warn("Token refresh failed", { reason: result.error });
        return {
            status: 401,
            body: {
                error: result.error ?? "Token refresh failed",
            },
        };
    }

    logger.info("Token refresh successful");

    // Step 4: Return the response
    return {
        status: 200,
        body: {
            accessToken: result.accessToken!,
            refreshToken: result.refreshToken!,
        },
    };
};
