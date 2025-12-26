import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// Ensure Sentry is initialized before anything else
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
      // Add express integration to trace performance of requests
      Sentry.expressIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0,
    // Profiling
    profilesSampleRate: 1.0,
    // PII
    sendDefaultPii: true,
  });
  console.log("✅ Sentry Initialized via instrument.ts");
}
