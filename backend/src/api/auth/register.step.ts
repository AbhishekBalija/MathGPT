import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { AuthService } from "../../services/auth/auth.service";

// Defining body schema

// Password must contain: uppercase, lowercase, number, and special character
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*(),.?":{}|<>]/,
    "Password must contain at least one special character"
  )
  .refine((val) => val.trim().length > 0, "Password cannot be only whitespace");

const RegisterSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  isAdmin: z.boolean().optional(),
});

// Step 1: Define the route config

export const config: ApiRouteConfig = {
  name: "RegisterUser",
  type: "api",
  path: "/auth/register",
  method: "POST",
  description: "Register a new user",
  bodySchema: RegisterSchema,
  emits: ["send-welcome-email"],
  flows: ["auth-flow"],
  responseSchema: {
    200: z.object({
      message: z.string(),
      accessToken: z.string(),
      refreshToken: z.string(),
      user: z.object({
        id: z.string(),
        email: z.string().email(),
      }),
    }),
    400: z.object({
      error: z.string(),
    }),
    409: z.object({
      error: z.string(),
    }),
  },
};

// Step 2: Define the handlers

export const handler: Handlers["RegisterUser"] = async (
  req,
  { emit, logger }
) => {
  const data = RegisterSchema.parse(req.body);
  logger.info("Register attempt for ", { email: data.email });

  // Step 3: Call the service to handle business logic

  const user = await AuthService.register(data);

  if (!user.success) {
    logger.warn("Register failed", { email: data.email, reason: user.error });
    return {
      status: 409,
      body: {
        error: user.error ?? "Registration failed",
      },
    };
  }

  // Step 4: Emit an event to send welcome email

  await emit({
    topic: "send-welcome-email",
    data: {
      userId: user.user?.id,
      email: user.user?.email,
      name: user.user?.name,
    },
  } as any);

  // Step 5: Return the response

  return {
    status: 200,
    body: {
      message: "User registered successfully",
      accessToken: user.accessToken!,
      refreshToken: user.refreshToken!,
      user: {
        id: user.user!.id.toString(),
        email: user.user!.email,
      },
    },
  };
};
