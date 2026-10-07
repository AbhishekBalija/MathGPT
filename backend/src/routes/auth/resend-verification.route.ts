import { sendVerificationCode } from "../../events/auth/send-verification-code";
import { runInBackground } from "../../lib/background";
import { route } from "../../lib/http";
import { getCurrentUser } from "../../modules/auth/auth.middleware";
import { EmailVerificationService } from "../../modules/auth/email-verification.service";
import type { EmailSender } from "../../modules/email/email-sender";

// POST /auth/resend-verification. Mounted behind requireUser.
export function createResendVerificationRoute(emailSender: EmailSender) {
  return route(async (req) => {
    const user = getCurrentUser(req);

    if (user.emailVerified) {
      return { status: 400, body: { error: "Your email is already verified." } };
    }

    const result = await EmailVerificationService.resend(user.id);
    if (!result.ok) {
      return {
        status: 429,
        body: {
          error: `Please wait ${result.retryAfterSeconds} seconds before requesting another code.`,
          code: "RATE_LIMITED",
          retryAfter: result.retryAfterSeconds,
        },
      };
    }

    runInBackground("send-verification-code", () =>
      sendVerificationCode(emailSender, { email: user.email, name: user.name, code: result.code })
    );

    return { status: 200, body: { message: "A new code is on its way." } };
  });
}
