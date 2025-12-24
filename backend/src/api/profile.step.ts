import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { AuthService } from "../services/auth/auth.service";
import { solutionRepository } from "../repositories/solution.repository";
import { userRepository } from "../repositories/user.repository";

// Daily free limit for users
const DAILY_FREE_LIMIT = 5;

// Step 1: Define the route config
export const config: ApiRouteConfig = {
  name: "GetProfile",
  type: "api",
  path: "/api/profile",
  method: "GET",
  description: "Get user profile and usage statistics",
  emits: [],
  flows: ["auth-flow"],
  responseSchema: {
    200: z.object({
      user: z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string(),
        avatar: z.string().optional(),
        provider: z.string(),
        createdAt: z.string(),
      }),
      stats: z.object({
        totalSolutions: z.number(),
        problemTypes: z.record(z.string(), z.number()),
        lastSolvedAt: z.string().nullable(),
      }),
      dailyCredits: z.object({
        used: z.number(),
        limit: z.number(),
        remaining: z.number(),
        resetsAt: z.string(),
      }),
    }),
    401: z.object({
      error: z.string(),
    }),
    404: z.object({
      error: z.string(),
    }),
    500: z.object({
      error: z.string(),
    }),
  },
};

// Step 2: Define the handler
export const handler: Handlers["GetProfile"] = async (req, { logger }) => {
  // Extract token from Authorization header
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const token =
    typeof authHeader === "string" ? authHeader.replace("Bearer ", "") : "";

  if (!token) {
    logger.warn("No authorization token provided");
    return {
      status: 401,
      body: {
        error: "No authorization token provided",
      },
    };
  }

  logger.info("Getting user profile");

  // Step 3: Verify token and get user
  const authResult = await AuthService.verifyToken(token);

  if (!authResult.success || !authResult.user) {
    logger.warn("Token verification failed", { reason: authResult.error });
    return {
      status: 401,
      body: {
        error: authResult.error ?? "Invalid token",
      },
    };
  }

  const userId = authResult.user.id.toString();

  try {
    // Step 4: Fetch user details from database
    const user = await userRepository.findById(userId);
    if (!user) {
      logger.warn("User not found", { userId });
      return {
        status: 404,
        body: { error: "User not found" },
      };
    }

    // Step 5: Fetch usage statistics
    const stats = await solutionRepository.getUserStats(userId);

    // Step 5.5: Calculate daily credits
    const today = new Date().toDateString();
    const lastReset = user.lastCreditReset
      ? new Date(user.lastCreditReset).toDateString()
      : null;
    const dailyUsed = today === lastReset ? user.dailyCreditsUsed || 0 : 0;
    const dailyRemaining = Math.max(0, DAILY_FREE_LIMIT - dailyUsed);
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);

    logger.info("Profile fetched successfully", {
      userId,
      totalSolutions: stats.totalSolutions,
      dailyCreditsUsed: dailyUsed,
    });

    // Step 6: Return the response
    return {
      status: 200,
      body: {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          provider: user.provider || "email",
          createdAt: user.createdAt.toISOString(),
        },
        stats: {
          totalSolutions: stats.totalSolutions,
          problemTypes: stats.problemTypes,
          lastSolvedAt: stats.lastSolvedAt?.toISOString() || null,
        },
        dailyCredits: {
          used: dailyUsed,
          limit: DAILY_FREE_LIMIT,
          remaining: dailyRemaining,
          resetsAt: tomorrow.toISOString(),
        },
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to fetch profile", { error: errorMessage, userId });

    return {
      status: 500,
      body: { error: "Failed to fetch profile" },
    };
  }
};
