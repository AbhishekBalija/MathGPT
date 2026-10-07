/**
 * Sliding-window rate limiter: at most `maxRequests` per `windowMs` per key.
 *
 * Kept in memory for now, which is fine for one local server. On Vercel each
 * instance has its own memory, so Phase 2 moves this into a Postgres table.
 */

interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next request is allowed (only when blocked). */
  retryAfterSeconds?: number;
}

const requestTimes = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const recent = (requestTimes.get(key) ?? []).filter(
    (time) => now - time < windowMs
  );

  if (recent.length >= maxRequests) {
    const oldest = Math.min(...recent);
    requestTimes.set(key, recent);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((oldest + windowMs - now) / 1000),
    };
  }

  recent.push(now);
  requestTimes.set(key, recent);
  return { allowed: true };
}
