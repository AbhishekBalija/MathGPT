/**
 * Per-IP Rate Limits as Express middleware:
 *
 *   router.post("/auth/login", limitByIp("login", 10, 15 * 60), loginRoute);
 *
 * The IP is `req.ip`. The app trusts one proxy hop (`trust proxy` = 1), so
 * req.ip is the address in X-Forwarded-For. Vercel overwrites that header
 * with the real client address, which makes this safe on Vercel. Without a
 * proxy in front (e.g. the server exposed directly), clients could send any
 * X-Forwarded-For and dodge these limits, so the API must only be deployed
 * behind one.
 */

import type { RequestHandler } from "express";
import { tooManyAttemptsMessage } from "../../lib/format-wait";
import { getCurrentUser } from "../auth/auth.middleware";
import { rateLimitRepository } from "./rate-limit.repository";

export function limitByIp(
  action: string,
  limit: number,
  windowSeconds: number
): RequestHandler {
  return limitBy(action, limit, windowSeconds, (req) => `ip:${req.ip ?? "unknown"}`);
}

/** The same, per logged-in User. Mount it after requireUser. */
export function limitByUser(
  action: string,
  limit: number,
  windowSeconds: number
): RequestHandler {
  return limitBy(action, limit, windowSeconds, (req) => `user:${getCurrentUser(req).id}`);
}

function limitBy(
  action: string,
  limit: number,
  windowSeconds: number,
  who: (req: Parameters<RequestHandler>[0]) => string
): RequestHandler {
  return async (req, res, next) => {
    const result = await rateLimitRepository.hit(`${action}:${who(req)}`, limit, windowSeconds);

    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfterSeconds));
      res.status(429).json({
        error: tooManyAttemptsMessage(result.retryAfterSeconds),
        code: "RATE_LIMITED",
        retryAfter: result.retryAfterSeconds,
      });
      return;
    }

    next();
  };
}
