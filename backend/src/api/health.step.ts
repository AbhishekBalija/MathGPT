import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
  name: "HealthCheck",
  type: "api",
  path: "/health",
  method: "GET",
  description: "Health check endpoint to verify the API is running",
  emits: [],
  flows: ["health-flow"],
  responseSchema: {
    200: z.object({
      status: z.string(),
      timestamp: z.string(),
    }),
    500: z.object({
      error: z.string(),
    }),
  },
};

export const handler: Handlers["HealthCheck"] = async (_req, { logger }) => {
  try {
    logger.info("Health check requested");

    return {
      status: 200,
      body: {
        status: "healthy",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error("Health check failed", { error });
    return {
      status: 500,
      body: {
        error: "Health check failed",
      },
    };
  }
};
