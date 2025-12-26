import "./src/instrument"; // Must be the very first import
import { defineConfig } from "@motiadev/core";
import endpointPlugin from "@motiadev/plugin-endpoint/plugin";
import logsPlugin from "@motiadev/plugin-logs/plugin";
import observabilityPlugin from "@motiadev/plugin-observability/plugin";
import bullmqPlugin from "@motiadev/plugin-bullmq/plugin";
import statesPlugin from "@motiadev/plugin-states/plugin";
import * as Sentry from "@sentry/node";

// Sentry Init moved to src/instrument.ts to ensure it runs beore Express load

const allowedOrigins = [
  "http://localhost:5173",
  "https://math-gpt-beta.vercel.app",
  "https://neomath.vercel.app",
];

const allowedMethods = "GET, POST, PUT, DELETE, OPTIONS, PATCH";
const allowedHeaders = "Content-Type, Authorization, X-Requested-With, Accept";

export default defineConfig({
  plugins: [
    observabilityPlugin,
    statesPlugin,
    logsPlugin,
    bullmqPlugin,
    endpointPlugin,
  ],
  app: (app) => {
    // Motia hardcodes wildcard (*) CORS headers in its core server.mjs (lines 306-323)
    // This middleware patches the response's header methods to fix all wildcards
    app.use((req: any, res: any, next: any) => {
      const origin = req.headers.origin;
      const originalHeader = res.header.bind(res);
      const originalSetHeader = res.setHeader.bind(res);

      const fixCorsHeader = (name: string, value: any): any => {
        const lowerName = name.toLowerCase();
        if (lowerName === "access-control-allow-origin" && value === "*") {
          if (origin && allowedOrigins.includes(origin)) {
            return origin;
          }
        }
        if (lowerName === "access-control-allow-methods" && value === "*") {
          return allowedMethods;
        }
        if (lowerName === "access-control-allow-headers" && value === "*") {
          return allowedHeaders;
        }
        return value;
      };
      res.header = (name: string, value: any) => {
        return originalHeader(name, fixCorsHeader(name, value));
      };
      res.setHeader = (name: string, value: any) => {
        return originalSetHeader(name, fixCorsHeader(name, value));
      };
      next();
    });

    console.log(`CORS configured for origins: ${allowedOrigins.join(", ")}`);

    if (process.env.SENTRY_DSN) {
      Sentry.setupExpressErrorHandler(app);
    }
  },
});
