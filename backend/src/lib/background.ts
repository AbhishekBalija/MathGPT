/**
 * Runs work after the response is sent (emails, analytics) so the user does
 * not wait for it. A failure is logged and never reaches the user.
 *
 * On Vercel, a function can be suspended once the response is sent, which
 * would cut background work short. `waitUntil` keeps it alive until the
 * task finishes. Outside Vercel (local dev, tests) it simply lets it run.
 */

import { waitUntil } from "@vercel/functions";
import { logger } from "./logger";

export function runInBackground(taskName: string, task: () => Promise<void>): void {
  waitUntil(
    task().catch((error: unknown) => {
      logger.error(`Background task failed: ${taskName}`, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    })
  );
}
