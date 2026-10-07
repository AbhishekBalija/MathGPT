import { route } from "../../lib/http";
import { logger } from "../../lib/logger";

// POST /auth/logout
export const logoutRoute = route(async () => {
    logger.info("User logout");

    // Note: For stateless JWT, logout is typically handled client-side
    // by removing tokens from storage. For more security, you could:
    // 1. Add refresh token to a blocklist
    // 2. Use short-lived access tokens
    // 3. Implement token versioning per user

    // For now, we just acknowledge the logout

    return {
        status: 200,
        body: {
            message: "Logged out successfully",
        },
    };
});
