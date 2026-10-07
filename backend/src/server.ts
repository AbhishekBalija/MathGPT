// Local development entry point: `bun run dev`
import { createApp } from "./app";
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

app.listen(port, () => {
  logger.info(`NeoMath API listening on http://localhost:${port}`);
});
