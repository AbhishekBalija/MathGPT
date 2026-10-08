import { z } from "zod";
import { sendWelcomeEmail } from "../../events/auth/send-welcome-email";
import { runInBackground } from "../../lib/background";
import { routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";
import { getCurrentUser } from "../../modules/auth/auth.middleware";
import { EmailVerificationService } from "../../modules/auth/email-verification.service";
import type { EmailSender } from "../../modules/email/email-sender";

const VerifyEmailSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

// POST /auth/verify-email. Mounted behind requireUser.
export function createVerifyEmailRoute(emailSender: EmailSender) {
  return routeWithBody(VerifyEmailSchema, async (req, body) => {
    const user = getCurrentUser(req);

    if (user.emailVerified) {
      return { status: 200, body: { emailVerified: true } };
    }

    const result = await EmailVerificationService.verify(user.id, body.code);
    if (!result.ok) {
      logger.info("Email verification failed", { userId: user.id, reason: result.error });
      return { status: 400, body: { error: result.error } };
    }

    // Welcome only once the account is real, and only from the request that verified it
    if (result.newlyVerified) {
      logger.info("Email verified", { userId: user.id });
      runInBackground("send-welcome-email", () =>
        sendWelcomeEmail(emailSender, { userId: user.id, email: user.email, name: user.name })
      );
    }

    return { status: 200, body: { emailVerified: true } };
  });
}
