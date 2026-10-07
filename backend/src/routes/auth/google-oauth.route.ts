import { z } from "zod";
import { AuthService } from "../../modules/auth/auth.service";
import { routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";
import { runInBackground } from "../../lib/background";
import { sendWelcomeEmail } from "../../events/auth/send-welcome-email";
import type { EmailSender } from "../../modules/email/email-sender";

// Defining body schema
const GoogleOAuthSchema = z.object({
  idToken: z.string(),
});

// POST /auth/google
export function createGoogleOAuthRoute(emailSender: EmailSender) {
  return routeWithBody(GoogleOAuthSchema, async (_req, body) => {
    const { idToken } = body;

    logger.info("Google OAuth login attempt");

    // Step 3: Call the service to handle Google OAuth
    const result = await AuthService.googleLogin(idToken);

    if (!result.success) {
      logger.warn("Google OAuth failed", { reason: result.error });
      return {
        status: 401,
        body: {
          error: result.error,
        },
      };
    }

    // Step 4: Send welcome email for new users
    if (result.isNewUser) {
      runInBackground("send-welcome-email", () =>
        sendWelcomeEmail(emailSender, {
          userId: result.user.id,
          email: result.user.email,
          name: result.user.name,
        })
      );
    }

    logger.info("Google OAuth successful", { email: result.user.email });

    // Step 5: Return the response
    return {
      status: 200,
      body: {
        message: "Google authentication successful",
        email: result.user.email,
        refreshToken: result.refreshToken,
        accessToken: result.accessToken,
        user: result.user,
      },
    };
  });
}
