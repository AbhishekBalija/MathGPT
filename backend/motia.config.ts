import { defineConfig } from "@motiadev/core";
import endpointPlugin from "@motiadev/plugin-endpoint/plugin";
import logsPlugin from "@motiadev/plugin-logs/plugin";
import observabilityPlugin from "@motiadev/plugin-observability/plugin";
import statesPlugin from "@motiadev/plugin-states/plugin";
import bullmqPlugin from "@motiadev/plugin-bullmq/plugin";

const allowedOrigins = [
  "http://localhost:5173",
  "https://math-gpt-beta.vercel.app",
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

      // Store the original header methods
      const originalHeader = res.header.bind(res);
      const originalSetHeader = res.setHeader.bind(res);

      // Helper to fix CORS headers
      const fixCorsHeader = (name: string, value: any): any => {
        const lowerName = name.toLowerCase();

        // Fix Access-Control-Allow-Origin: * -> specific origin
        if (lowerName === "access-control-allow-origin" && value === "*") {
          if (origin && allowedOrigins.includes(origin)) {
            return origin;
          }
        }

        // Fix Access-Control-Allow-Methods: * -> explicit methods
        if (lowerName === "access-control-allow-methods" && value === "*") {
          return allowedMethods;
        }

        // Fix Access-Control-Allow-Headers: * -> explicit headers
        if (lowerName === "access-control-allow-headers" && value === "*") {
          return allowedHeaders;
        }

        return value;
      };

      // Patch res.header
      res.header = (name: string, value: any) => {
        return originalHeader(name, fixCorsHeader(name, value));
      };

      // Patch res.setHeader
      res.setHeader = (name: string, value: any) => {
        return originalSetHeader(name, fixCorsHeader(name, value));
      };

      next();
    });

    console.log(`CORS configured for origins: ${allowedOrigins.join(", ")}`);
  },
});
