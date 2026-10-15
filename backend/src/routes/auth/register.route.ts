import { z } from "zod";
import { getSettings, SIGNUPS_PAUSED_MESSAGE } from "../../modules/settings/settings";
import { AuthService } from "../../modules/auth/auth.service";
import { routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";
import { runInBackground } from "../../lib/background";
import { sendVerificationCode } from "../../events/auth/send-verification-code";
import type { EmailSender } from "../../modules/email/email-sender";
import { passwordSchema } from "../../modules/auth/password";
import { isDisposableEmail } from "../../modules/auth/disposable-email";
import type { HumanCheck } from "../../modules/auth/turnstile";

// Defining body schema

const RegisterSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  // From the Turnstile widget on the sign-up form
  turnstileToken: z.string().max(2048).optional(),
  // No isAdmin here: admin rights are never set by the person signing up.
  // Unknown fields (including isAdmin) are dropped by zod.
});

// Step 1: Define the route config

// POST /auth/register
export function createRegisterRoute(emailSender: EmailSender, humanCheck: HumanCheck) {
  return routeWithBody(RegisterSchema, async (req, { turnstileToken, ...data }) => {
    logger.info("Register attempt for ", { email: data.email });

    // An admin can pause new accounts from Settings (spam, a cost spike)
    if (!(await getSettings()).signupsOpen) {
      return { status: 403, body: { error: SIGNUPS_PAUSED_MESSAGE, code: "SIGNUPS_PAUSED" } };
    }

    // Cheap check first: throwaway addresses are a common way to farm accounts
    if (isDisposableEmail(data.email)) {
      logger.warn("Register refused: disposable email");
      return { status: 400, body: { error: "Please use a school or personal email address." } };
    }

    if (!(await humanCheck(turnstileToken, req.ip ?? ""))) {
      logger.warn("Register refused: robot check failed");
      return { status: 400, body: { error: "Please confirm you're not a robot and try again." } };
    }

    // Step 3: Call the service to handle business logic

    const user = await AuthService.register(data);

    if (!user.success) {
      logger.warn("Register failed", { email: data.email, reason: user.error });
      return {
        status: 409,
        body: {
          error: user.error,
        },
      };
    }

    // Step 4: Email the Verification Code. The welcome email follows once verified.
    runInBackground("send-verification-code", () =>
      sendVerificationCode(emailSender, {
        email: user.user.email,
        name: user.user.name,
        code: user.verificationCode,
      })
    );

    // Step 5: Return the response

    return {
      status: 200,
      body: {
        message: "User registered successfully",
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        user: {
          id: user.user.id,
          email: user.user.email,
          emailVerified: user.user.emailVerified,
        },
      },
    };
  });
}
