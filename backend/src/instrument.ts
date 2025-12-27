// Sentry initialization - only runs if SENTRY_DSN is provided
// Using dynamic import to avoid loading @sentry/node when not needed
export async function initSentry() {
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = await import("@sentry/node");
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [Sentry.expressIntegration()],
        tracesSampleRate: 1.0,
        sendDefaultPii: true,
      });
      console.log("✅ Sentry Initialized");
      return Sentry;
    } catch (error) {
      console.error("❌ Failed to initialize Sentry:", error);
    }
  }
  return null;
}
