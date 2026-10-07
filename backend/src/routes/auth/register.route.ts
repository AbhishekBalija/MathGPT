import { z } from "zod";
import { AuthService } from "../../modules/auth/auth.service";
import { routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";
import { runInBackground } from "../../lib/background";
import { sendWelcomeEmail } from "../../events/auth/send-welcome-email";
import type { EmailSender } from "../../modules/email/email-sender";
import { passwordSchema } from "../../modules/auth/password";

// Defining body schema

const RegisterSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  // No isAdmin here: admin rights are never set by the person signing up.
  // Unknown fields (including isAdmin) are dropped by zod.
});

// Step 1: Define the route config

// POST /auth/register
export function createRegisterRoute(emailSender: EmailSender) {
  return routeWithBody(RegisterSchema, async (_req, data) => {
    logger.info("Register attempt for ", { email: data.email });

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

    // Step 4: Emit an event to send welcome email

    runInBackground("send-welcome-email", () =>
      sendWelcomeEmail(emailSender, {
        userId: user.user.id,
        email: user.user.email,
        name: user.user.name,
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
