/**
 * Builds the Express app without starting a server.
 *
 * `server.ts` calls `listen()` for local development. On Vercel (Phase 3)
 * the platform imports this app directly, so it must not listen itself.
 */

import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";
import { logger } from "./lib/logger";
import type { MathSolver } from "./modules/ai/math-solver";
import type { EmailSender } from "./modules/email/email-sender";
import { createRouter } from "./routes";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://math-gpt-beta.vercel.app",
  "https://neomath.vercel.app",
];

// Comma-separated list in CORS_ORIGINS overrides the defaults, e.g. for preview URLs
function getAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS;
  if (!fromEnv) {
    return DEFAULT_ALLOWED_ORIGINS;
  }
  return fromEnv
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Unknown paths get the same JSON error shape as every other response
const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};

// Last stop for anything a route did not handle. Never leaks stack traces.
const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  const isBadJson =
    error instanceof SyntaxError &&
    "type" in error &&
    error.type === "entity.parse.failed";

  if (isBadJson) {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  logger.error("Unhandled error", {
    error: error instanceof Error ? error.message : "Unknown error",
  });
  res.status(500).json({ error: "Internal server error" });
};

/**
 * The outside services the app talks to. Passed in rather than imported so
 * tests can run the real app with a fake AI solver and a fake email outbox.
 */
export interface AppServices {
  solver: MathSolver;
  emailSender: EmailSender;
}

export function createApp(services: AppServices) {
  const app = express();

  // Vercel sits in front of the app as a proxy
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    cors({
      origin: getAllowedOrigins(),
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
      ],
    })
  );
  app.use(express.json({ limit: "100kb" }));

  app.use(createRouter(services));

  app.use(notFound);
  app.use(handleError);

  return app;
}
