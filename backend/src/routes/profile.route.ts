import { solutionRepository } from "../repositories/solution.repository";
import { getCurrentUser } from "../modules/auth/auth.middleware";
import { userRepository } from "../modules/users/user.repository";
import { route } from "../lib/http";
import { logger } from "../lib/logger";

// Daily free limit for users
const DAILY_FREE_LIMIT = 5;

// GET /api/profile
// Mounted behind requireUser
export const profileRoute = route(async (req) => {
  const userId = getCurrentUser(req).id;
  logger.info("Getting user profile");

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
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatarUrl ?? undefined,
          provider: user.provider,
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
});
