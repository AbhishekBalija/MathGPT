/**
 * Waitlist Invite Email Event Handler
 *
 * Subscribes to 'waitlist-invite-sent' events and sends invite emails
 * with registration link containing the invite token.
 */

import { EventConfig, Handlers } from "motia";
import { Resend } from "resend";
import { z } from "zod";

// Define the input schema for the waitlist-invite-sent event
const waitlistInviteSchema = z.object({
  email: z.string().email(),
  inviteToken: z.string(),
  expiresAt: z.string(),
  timestamp: z.string(),
});

// Initialize Resend client at module load (fail fast if not configured)
const resendApiKey = process.env.RESEND_API;
if (!resendApiKey) {
  throw new Error("RESEND_API environment variable is not set");
}
const resend = new Resend(resendApiKey);

// Validate FROM_EMAIL at module load
const fromEmail = process.env.FROM_EMAIL;
if (!fromEmail) {
  throw new Error("FROM_EMAIL environment variable is not set");
}

// Get frontend URL for registration link based on environment
const getFrontendUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.FRONTEND_URL_PROD || "https://neomath.vercel.app";
  }
  return process.env.FRONTEND_URL_DEV || "http://localhost:5173";
};

export const config: EventConfig = {
  type: "event",
  name: "SendWaitlistInvite",
  description:
    "Send invite email with registration link when admin approves user",
  subscribes: ["waitlist-invite-sent"],
  emits: [],
  flows: ["WaitlistFlow"],
  input: waitlistInviteSchema,
};

type WaitlistInviteData = z.infer<typeof waitlistInviteSchema>;

export const handler: Handlers["SendWaitlistInvite"] = async (
  data: WaitlistInviteData,
  { logger }
) => {
  logger.info("Sending waitlist invite email");

  const frontendUrl = getFrontendUrl();
  const registrationLink = `${frontendUrl}/register?token=${data.inviteToken}`;
  const expiryDate = new Date(data.expiresAt);
  const formattedExpiry = expiryDate.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.email,
      replyTo: "abhishekan017@gmail.com",
      subject: "You're Invited to NeoMath! 🎉",
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
          
          <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 20px;">You're Invited! 🚀</h2>
          
          <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
            Great news! You've been approved to join NeoMath. Click the button below to create your account 
            and start solving math problems with AI-powered explanations.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${registrationLink}" 
               style="display: inline-block; padding: 16px 32px; background-color: #000; color: #fff; 
                      text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 50px;
                      box-shadow: 0 4px 14px rgba(0,0,0,0.25);">
              Create Your Account
            </a>
          </div>
          
          <p style="font-size: 14px; color: #888; margin-bottom: 20px; text-align: center;">
            ⏰ This invite expires on <strong>${formattedExpiry}</strong>
          </p>
          
          <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <p style="font-size: 14px; color: #555; margin: 0;">
              <strong>Can't click the button?</strong> Copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #888; word-break: break-all; margin: 10px 0 0 0;">
              ${registrationLink}
            </p>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="font-size: 14px; color: #856404; margin: 0 0 10px 0;">
              <strong>📋 Your Invite Token:</strong>
            </p>
            <p style="font-family: monospace; font-size: 14px; background: #fff; padding: 12px 16px; border-radius: 6px; border: 1px dashed #ccc; word-break: break-all; margin: 0; user-select: all; cursor: text;">
              ${data.inviteToken}
            </p>
            <p style="font-size: 12px; color: #856404; margin: 10px 0 0 0;">
              Copy this token if asked during registration.
            </p>
          </div>
          
          <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
            <strong>What you'll get:</strong>
          </p>
          
          <ul style="font-size: 16px; color: #555; margin-bottom: 30px; padding-left: 20px;">
            <li>5 free math problems per day</li>
            <li>Step-by-step verified solutions</li>
            <li>Teacher-quality explanations</li>
            <li>Solution history & tracking</li>
          </ul>
          
          <div style="background-color: #f0f7ff; border: 1px solid #b3d4fc; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="font-size: 13px; color: #31708f; margin: 0;">
              <strong>💡 Token expired?</strong> Don't worry! 
              <a href="${registrationLink}" style="color: #0066cc; text-decoration: underline; font-weight: 600;">Click here to request a fresh invite</a> instantly.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #888; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            — The Indie Dev
          </p>
        </body>
        </html>
      `,
    });

    logger.info("Waitlist invite email sent successfully");
  } catch (error) {
    // Log error but don't throw - email failures shouldn't break the flow
    logger.error("Failed to send waitlist invite email", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
