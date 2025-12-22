import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { AuthService } from "../../services/auth/auth.service";
import { EmailService } from "../../services/email/email.service";

// Defining body schema
const GoogleOAuthSchema = z.object({
  idToken: z.string(),
});

// Step 1: Define the route config
export const config: ApiRouteConfig = {
  name: "GoogleOAuth",
  type: "api",
  path: "/auth/google",
  method: "POST",
  description: "Authenticate user with Google OAuth",
  bodySchema: GoogleOAuthSchema,
  emits: ["send-welcome-email"],
  flows: ["auth-flow"],
  responseSchema: {
    200: z.object({
      message: z.string(),
      email: z.string().email(),
      refreshToken: z.string(),
      accessToken: z.string(),
      user: z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string(),
        avatar: z.string().optional(),
        isAdmin: z.boolean(),
      }),
    }),
    401: z.object({
      error: z.string(),
    }),
  },
};

// Step 2: Define the handlers
export const handler: Handlers["GoogleOAuth"] = async (
  req,
  { emit, logger }
) => {
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
    await emit({
      topic: "send-welcome-email",
      data: {
        userId: result.user?.id?.toString(),
        email: result.user?.email,
        name: result.user?.name,
      },
    } as any);
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
};
