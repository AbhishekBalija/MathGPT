// Local development entry point: `bun run dev`
import { createApp } from "./app";
import { logger } from "./lib/logger";
import { requireEnv } from "./lib/env";
import { geminiMathSolver } from "./modules/ai/math-solver";
import { createResendEmailSender } from "./modules/email/email-sender";

const port = Number(process.env.PORT) || 3000;

const app = createApp({
  solver: geminiMathSolver,
  emailSender: createResendEmailSender(
    requireEnv("RESEND_API"),
    process.env.FROM_EMAIL || "NeoMath <onboarding@resend.dev>"
  ),
});

app.listen(port, () => {
  logger.info(`NeoMath API listening on http://localhost:${port}`);
});
