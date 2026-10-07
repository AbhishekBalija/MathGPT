import type { EventConfig, Handlers } from "motia";
import { z } from "zod";
import { EmailService } from "../../services/email/email.service";

const WelcomeEmailSchema = z.object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
    name: z.string().optional(),
});

type WelcomeEmailData = z.infer<typeof WelcomeEmailSchema>;

export const config: EventConfig = {
    name: "SendWelcomeEmail",
    type: "event",
    subscribes: ["send-welcome-email"],
    input: WelcomeEmailSchema,
    flows: ["auth-flow"],
    emits: [],
    description: "Send welcome email to user",
};

export const handler: Handlers["SendWelcomeEmail"] = async (data, { logger }) => {
    const emailData = data as WelcomeEmailData;
    
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
};