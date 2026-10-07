import { logger } from "../../lib/logger";
import type { EmailSender } from "../../modules/email/email-sender";
import { welcomeEmailTemplate } from "../../services/email/templates/email.templates";

export interface WelcomeEmailData {
    userId?: string;
    email?: string;
    name?: string;
}

// Sends the welcome email after a new user signs up
export async function sendWelcomeEmail(
    emailSender: EmailSender,
    emailData: WelcomeEmailData
): Promise<void> {
    if (!emailData.email) {
        logger.warn("No email provided for welcome email");
        return;
    }

    const name = emailData.name || "there";

    logger.info("Sending welcome email", { email: emailData.email, name });

    try {
        await emailSender.send({
            to: emailData.email,
            subject: "Welcome to NeoMath! 🎓",
            html: welcomeEmailTemplate(name),
        });
        logger.info("Welcome email sent successfully", { email: emailData.email });
    } catch (error) {
        logger.error("Failed to send welcome email", {
            email: emailData.email,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
