import { z } from "zod";

// Shared by sign-up and the create-admin script, so Admins never get weaker rules.
// Password must contain: uppercase, lowercase, number, and special character
export const passwordSchema = z
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
