// Local development entry point: `bun run dev`. On Vercel, `app.ts` is served.
import app from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  logger.info(`NeoMath API listening on http://localhost:${port}`);
});
