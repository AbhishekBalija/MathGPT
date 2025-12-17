import type { EventConfig, Handlers } from "motia";
import { z } from "zod";

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
    logger.info("Sending welcome email", { email: emailData.email });
    // TODO: Add actual email sending logic
};