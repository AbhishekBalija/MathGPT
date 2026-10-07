import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
  name: "HealthCheck",
  type: "api",
  path: "/health",
  method: "GET",
  description: "Health check endpoint to verify the API is running",
  emits: [],
  responseSchema: {
    200: z.object({
      status: z.string(),
      timestamp: z.string(),
    }),
  },
};

export const handler: Handlers["HealthCheck"] = async (_req, _ctx) => {
  return {
    status: 200,
    body: {
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
  };
};
