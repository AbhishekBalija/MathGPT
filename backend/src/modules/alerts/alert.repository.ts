/**
 * The alert_state rows: one per kind of alert (e.g. "solving"). Changes run
 * in a transaction that locks the row, so two solves finishing at once can't
 * both decide to send the same email.
 */

import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { alertState } from "../../db/schema";
import type { AlertRecord } from "./alert-rules";

export const alertRepository = {
  /** Applies `change` to the row (made if missing) and saves the result. Returns what `change` returned. */
  async update<T>(kind: string, change: (record: AlertRecord) => { record: AlertRecord; result: T }): Promise<T> {
    return db.transaction(async (tx) => {
      await tx.insert(alertState).values({ kind }).onConflictDoNothing();
      const [row] = await tx.select().from(alertState).where(eq(alertState.kind, kind)).for("update");
      if (!row) throw new Error(`Alert row ${kind} is missing`);

      const { record, result } = change({
        status: row.status,
        recent: row.recent,
        consecutive: row.consecutive,
        lastSentAt: row.lastSentAt?.getTime() ?? null,
        changedAt: row.changedAt.getTime(),
      });
      await tx
        .update(alertState)
        .set({
          status: record.status,
          recent: record.recent,
          consecutive: record.consecutive,
          lastSentAt: record.lastSentAt === null ? null : new Date(record.lastSentAt),
          changedAt: new Date(record.changedAt),
        })
        .where(eq(alertState.kind, kind));
      return result;
    });
  },
};
