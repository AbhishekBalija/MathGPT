import { route } from "../lib/http";
import { healthRepository } from "../modules/admin/health/health.repository";
import { withTimeout } from "../services/ai/failover";

const CHECK_TIMEOUT_MS = 3000;

/**
 * Healthy only when the database answers within 3 seconds. A failure says
 * nothing about why, since this endpoint is public.
 */
export async function healthCheck(ping: () => Promise<void>) {
  const timestamp = new Date().toISOString();
  try {
    await withTimeout(ping(), CHECK_TIMEOUT_MS, "database");
    return { status: 200, body: { status: "healthy", timestamp } };
  } catch {
    return { status: 503, body: { status: "unhealthy", timestamp } };
  }
}

// GET /health: what the outside uptime check calls
export const healthRoute = route(() => healthCheck(() => healthRepository.ping()));
