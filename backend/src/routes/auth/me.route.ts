import { route } from "../../lib/http";
import { logger } from "../../lib/logger";
import { AuthService } from "../../services/auth/auth.service";

// GET /auth/me: current user from the access token
export const meRoute = route(async (req) => {
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
});
