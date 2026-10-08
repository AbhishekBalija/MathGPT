/**
 * The deployed app: our API with its real services (Gemini, Resend).
 *
 * Vercel looks for a file named app, index or server that imports express
 * and default-exports the app; this is that file. It never listens itself.
 * Local development listens in `server.ts`.
 */

import express from "express";
import { createApp } from "./create-app";
import { logger } from "./lib/logger";
import { requireEnv } from "./lib/env";
import { geminiMathSolver } from "./modules/ai/math-solver";
import {
  createConsoleEmailSender,
  createResendEmailSender,
  type EmailSender,
} from "./modules/email/email-sender";

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

const api = createApp({
  solver: geminiMathSolver,
  emailSender: chooseEmailSender(),
});

// A thin outer app so this file is a real Express entry. Vercel sits in front
// as a proxy, so client IPs come from X-Forwarded-For (see create-app.ts).
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(api);

export default app;

