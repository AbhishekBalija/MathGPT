/**
 * The backend's one entry point.
 *
 * - Local development (`bun run dev`): starts listening on PORT.
 * - Vercel: imports this file and serves the default export as a function,
 *   so it must not listen itself. Vercel sets VERCEL=1.
 */
import { createApp } from "./create-app";
import { logger } from "./lib/logger";
import { requireEnv } from "./lib/env";
import { geminiMathSolver } from "./modules/ai/math-solver";
import {
  createConsoleEmailSender,
  createResendEmailSender,
  type EmailSender,
} from "./modules/email/email-sender";

const port = Number(process.env.PORT) || 3000;

// EMAIL_TRANSPORT=console prints emails to this log instead of sending them
function chooseEmailSender(): EmailSender {
  if (process.env.EMAIL_TRANSPORT === "console") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("EMAIL_TRANSPORT=console is not allowed in production");
    }
    logger.warn("Emails are printed to the console, not sent");
    return createConsoleEmailSender();
  }

  return createResendEmailSender(
    requireEnv("RESEND_API"),
    process.env.FROM_EMAIL || "NeoMath <onboarding@resend.dev>"
  );
}

const app = createApp({
  solver: geminiMathSolver,
  emailSender: chooseEmailSender(),
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    logger.info(`NeoMath API listening on http://localhost:${port}`);
  });
}

export default app;
