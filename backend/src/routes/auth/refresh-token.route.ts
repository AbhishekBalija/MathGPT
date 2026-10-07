import { z } from "zod";
import { routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";
import { AuthService } from "../../modules/auth/auth.service";

// Defining body schema
const RefreshTokenSchema = z.object({
    refreshToken: z.string(),
});

// POST /auth/refresh: swap a refresh token for a new token pair
export const refreshTokenRoute = routeWithBody(RefreshTokenSchema, async (_req, body) => {
    const { refreshToken } = body;

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
});
