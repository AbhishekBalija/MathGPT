// Local development entry point: `bun run dev`
import { createApp } from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env.PORT) || 3000;

createApp().listen(port, () => {
  logger.info(`NeoMath API listening on http://localhost:${port}`);
});
