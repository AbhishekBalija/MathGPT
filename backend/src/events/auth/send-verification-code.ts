import { logger } from "../../lib/logger";
import type { EmailSender } from "../../modules/email/email-sender";
import { verificationCodeEmailTemplate } from "../../services/email/templates/email.templates";

// Emails a Verification Code. Runs in the background after sign-up or resend.
export async function sendVerificationCode(
  emailSender: EmailSender,
  data: { email: string; name: string; code: string }
): Promise<void> {
  try {
    await emailSender.send({
      to: data.email,
      subject: `${data.code} is your NeoMath verification code`,
      html: verificationCodeEmailTemplate(data.name, data.code),
    });
    logger.info("Verification code sent", { email: data.email });
  } catch (error) {
    logger.error("Failed to send verification code", {
      email: data.email,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
