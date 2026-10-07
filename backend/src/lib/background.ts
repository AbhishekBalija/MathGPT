/**
 * Runs work after the response is sent (emails, analytics) so the user does
 * not wait for it. A failure is logged and never reaches the user.
 *
 * Note for Vercel (Phase 3): serverless functions can be frozen once the
 * response is sent, so this will be wrapped in `waitUntil()` from
 * `@vercel/functions` to keep the function alive until the task finishes.
 */

import { logger } from "./logger";

export function runInBackground(taskName: string, task: () => Promise<void>): void {
  task().catch((error: unknown) => {
    logger.error(`Background task failed: ${taskName}`, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  });
}
