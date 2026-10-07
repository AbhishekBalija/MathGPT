import type { ApiRouteConfig, Handlers } from "motia";
import { z, ZodError } from "zod";
import { AuthService } from "../../services/auth/auth.service";

// Defining body schema

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Step 1: Define the route config

export const config: ApiRouteConfig = {
  name: "LoginUser",
  type: "api",
  path: "/auth/login",
  method: "POST",
  description: "Authenticate user and return a token",
  bodySchema: LoginSchema,
  emits: [],
  flows: ["auth-flow"],
  responseSchema: {
    200: z.object({
      email: z.string().email(),
      refreshToken: z.string(),
      accessToken: z.string(),
      user: z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string().optional(),
        avatar: z.string().optional(),
        isAdmin: z.boolean(),
      }),
    }),
    400: z.object({
      error: z.string(),
    }),
    401: z.object({
      error: z.string(),
    }),
  },
};

// Step 2: Define the handlers

export const handler: Handlers["LoginUser"] = async (req, { emit, logger }) => {
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
        error: user.error ?? "Login failed",
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
      email: user.user!.email,
      refreshToken: user.refreshToken!,
      accessToken: user.accessToken!,
      user: {
        id: user.user!.id.toString(),
        email: user.user!.email,
        name: user.user!.name,
        avatar: user.user!.avatar,
        isAdmin: user.user!.isAdmin || false,
      },
    },
  };
};
