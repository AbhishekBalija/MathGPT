import { route } from "../lib/http";

// GET /health: lets uptime checks confirm the API is running
export const healthRoute = route(async () => {
  return {
    status: 200,
    body: {
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
  };
});
