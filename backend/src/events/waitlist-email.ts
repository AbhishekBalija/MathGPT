/**
 * Waitlist Email Event Handler
 *
 * Sends confirmation emails.
 * Uses Resend for email delivery.
 */

import { Resend } from "resend";
import { requireEnv } from "../lib/env";
import { z } from "zod";
import { logger } from "../lib/logger";

// Define the input schema for the waitlist-joined event
const waitlistJoinedSchema = z.object({
  email: z.string().email(),
  source: z.string(),
  timestamp: z.string(),
});

// Fail fast at startup if email is not configured
const resend = new Resend(requireEnv("RESEND_API"));
const fromEmail = requireEnv("FROM_EMAIL");

export type WaitlistJoinedData = z.infer<typeof waitlistJoinedSchema>;

export async function sendWaitlistEmail(data: WaitlistJoinedData): Promise<void> {
  logger.info("Sending waitlist confirmation email");

  try {
    await resend.emails.send({
      from: fromEmail, // Change to your domain after verification
      to: data.email,
      replyTo: "abhishekan017@gmail.com",
      subject: "Welcome to the NeoMath Waitlist! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 28px; font-weight: 600; margin: 0;">NeoMath</h1>
          </div>
          
          <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 20px;">You're on the list! 🎉</h2>
          
          <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
            Thanks for joining the NeoMath waitlist. We're building an AI-powered math tutor 
            that explains solutions step-by-step, just like a real teacher.
          </p>
          
          <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
            <strong>What to expect:</strong>
          </p>
          
          <ul style="font-size: 16px; color: #555; margin-bottom: 30px; padding-left: 20px;">
            <li>Early access when we launch</li>
            <li>Free credits to try the platform</li>
            <li>Updates on our progress</li>
          </ul>
          
          <p style="font-size: 16px; color: #555; margin-bottom: 30px;">
            We'll email you as soon as we're ready. In the meantime, feel free to reply 
            to this email if you have any questions!
          </p>
          
          <p style="font-size: 14px; color: #888; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            — The Indie Dev
          </p>
        </body>
        </html>
      `,
    });

    logger.info("Waitlist confirmation email sent successfully");
  } catch (error) {
    // Log error but don't throw - email failures shouldn't break the flow
    logger.error("Failed to send waitlist confirmation email", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
