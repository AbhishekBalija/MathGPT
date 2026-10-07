/**
 * Admin Resend Confirmation Email Endpoint
 *
 * POST /admin/resend-confirmation
 *
 * Resends the waitlist confirmation email to a user.
 */

import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware";
import { Resend } from "resend";

// Request schema
const resendConfirmationSchema = z.object({
  email: z.string().email("Invalid email address"),
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

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminResendConfirmation",
  description: "Resend waitlist confirmation email",
  path: "/admin/resend-confirmation",
  method: "POST",
  flows: ["WaitlistFlow"],
  emits: [],
  bodySchema: resendConfirmationSchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
    400: z.object({
      error: z.string(),
    }),
    401: z.object({
      error: z.string(),
    }),
    403: z.object({
      error: z.string(),
    }),
    500: z.object({
      error: z.string(),
    }),
  },
};

export const handler: Handlers["AdminResendConfirmation"] = async (
  req,
  { logger }
) => {
  try {
    // Require admin authentication
    let user;
    try {
      user = await requireAuth(
        req.headers as Record<string, string | string[] | undefined>
      );
      if (!user.isAdmin) {
        return {
          status: 403 as const,
          body: { error: "Admin access required" },
        };
      }
    } catch {
      return {
        status: 401 as const,
        body: { error: "Authentication required" },
      };
    }

    const { email } = resendConfirmationSchema.parse(req.body);

    logger.info("Admin resending confirmation email", {
      adminId: user.id,
    });

    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
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

      logger.info("Confirmation email resent successfully", { email });

      return {
        status: 200 as const,
        body: {
          success: true,
          message: `Confirmation email resent to ${email}`,
        },
      };
    } catch (emailError) {
      logger.error("Failed to resend confirmation email", {
        email,
        error: emailError instanceof Error ? emailError.message : "Unknown",
      });

      return {
        status: 500 as const,
        body: { error: "Failed to send email. Please try again." },
      };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400 as const,
        body: { error: error.issues[0]?.message || "Invalid request" },
      };
    }

    return {
      status: 500 as const,
      body: { error: "An error occurred" },
    };
  }
};
