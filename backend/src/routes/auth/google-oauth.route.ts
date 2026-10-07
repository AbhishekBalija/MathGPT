import { z } from "zod";
import { AuthService } from "../../services/auth/auth.service";
import { EmailService } from "../../services/email/email.service";
import { routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";
import { runInBackground } from "../../lib/background";
import { sendWelcomeEmail } from "../../events/auth/send-welcome-email";

// Defining body schema
const GoogleOAuthSchema = z.object({
  idToken: z.string(),
});

// POST /auth/google
export const googleOAuthRoute = routeWithBody(GoogleOAuthSchema, async (req, body) => {
  const { idToken } = GoogleOAuthSchema.parse(req.body);

  logger.info("Google OAuth login attempt");

  // Step 3: Call the service to handle Google OAuth
  const result = await AuthService.googleLogin(idToken);

  if (!result.success) {
    logger.warn("Google OAuth failed", { reason: result.error });
    return {
      status: 401,
      body: {
        error: result.error ?? "Google authentication failed",
      },
    };
  }

  // Step 4: Send welcome email for new users
  if (result.isNewUser) {
    // Mark waitlist entry as registered if exists
    try {
      const { MongoClient } = await import("mongodb");
      const uri = process.env.MONGODB_URI;
      if (uri && result.user?.email) {
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db("MathGPTDB");
        await db
          .collection("waitlist")
          .updateOne(
            { email: result.user.email.toLowerCase() },
            { $set: { registered: true } }
          );
        await client.close();
        logger.info("Waitlist entry marked as registered", {
          email: result.user.email,
        });
      }
    } catch (waitlistError) {
      // Non-blocking - don't fail auth if waitlist update fails
      logger.warn("Failed to update waitlist status", {
        error:
          waitlistError instanceof Error ? waitlistError.message : "Unknown",
      });
    }

    runInBackground("send-welcome-email", () =>
      sendWelcomeEmail({
        userId: result.user?.id?.toString(),
        email: result.user?.email,
        name: result.user?.name,
      })
    );
  }

  logger.info("Google OAuth successful", { email: result.user?.email });

  // Step 5: Return the response
  return {
    status: 200,
    body: {
      message: "Google authentication successful",
      email: result.user!.email,
      refreshToken: result.refreshToken!,
      accessToken: result.accessToken!,
      user: {
        id: result.user!.id.toString(),
        email: result.user!.email,
        name: result.user!.name,
        avatar: result.user!.avatar,
        isAdmin: result.user!.isAdmin || false,
      },
    },
  };
});
