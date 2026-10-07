import { z, ZodError } from "zod";
import { AuthService } from "../../modules/auth/auth.service";
import { route } from "../../lib/http";
import { logger } from "../../lib/logger";

// Defining body schema

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Step 1: Define the route config

// POST /auth/login
export const loginRoute = route(async (req) => {
  // Validate input with proper error handling
  let email: string;
  let password: string;
  try {
    const parsed = LoginSchema.parse(req.body);
    email = parsed.email;
    password = parsed.password;
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Login validation failed", { errors: error.issues });
      return {
        status: 400,
        body: {
          error: "Invalid email or password format",
        },
      };
    }
    throw error;
  }

  logger.info(`Login attempt for ${email}`);

  // Step 3: Call the service to handle business logic

  const user = await AuthService.login(email, password);

  if (!user.success) {
    logger.warn("Login failed", { email, reason: user.error });
    return {
      status: 401,
      body: {
        error: user.error,
      },
    };
  }

  // // Step 4: Emit an event to notify other services

  // await emit({
  //     topic: "user-logged-in",
  //     data: {
  //         userId: user.user?.id,
  //         email: user.user?.email,
  //         token: user.accessToken,
  //         timestamp: new Date().toISOString(),
  //     },
  // });

  // Step 5: Return the response

  return {
    status: 200,
    body: {
      message: "Login successful.",
      email: user.user.email,
      refreshToken: user.refreshToken,
      accessToken: user.accessToken,
      user: user.user,
    },
  };
});
