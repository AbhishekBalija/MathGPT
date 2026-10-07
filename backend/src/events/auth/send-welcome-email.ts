import { logger } from "../../lib/logger";
import { EmailService } from "../../services/email/email.service";

export interface WelcomeEmailData {
    userId?: string;
    email?: string;
    name?: string;
}

// Sends the welcome email after a new user signs up
export async function sendWelcomeEmail(emailData: WelcomeEmailData): Promise<void> {
    if (!emailData.email) {
        logger.warn("No email provided for welcome email");
        return;
    }

    const name = emailData.name || "there";

    logger.info("Sending welcome email", { email: emailData.email, name });

    const result = await EmailService.sendWelcomeEmail(emailData.email, name);

    if (result.success) {
        logger.info("Welcome email sent successfully", { email: emailData.email });
    } else {
        logger.error("Failed to send welcome email", {
            email: emailData.email,
            error: result.error
        });
    }
}
