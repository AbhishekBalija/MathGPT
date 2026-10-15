/** The app_settings and setting_changes tables. */

import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { appSettings, settingChanges, users } from "../../db/schema";

export interface StoredChange {
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface ChangeRow extends StoredChange {
  id: string;
  changedAt: Date;
  // Null once that admin's account is deleted
  by: { id: string; name: string } | null;
}

export const settingsRepository = {
  /** Every stored setting, by key. Missing keys use the defaults. */
  async readAll(): Promise<Map<string, unknown>> {
    const rows = await db.select({ key: appSettings.key, value: appSettings.value }).from(appSettings);
    return new Map(rows.map((row) => [row.key, row.value]));
  },

  /** Saves the new values and logs each change, all or nothing. */
  async save(changes: StoredChange[], adminId: string): Promise<void> {
    if (changes.length === 0) return;
    await db.transaction(async (tx) => {
      for (const change of changes) {
        await tx
          .insert(appSettings)
          .values({ key: change.key, value: change.newValue, updatedBy: adminId, updatedAt: new Date() })
          .onConflictDoUpdate({ target: appSettings.key, set: { value: change.newValue, updatedBy: adminId, updatedAt: new Date() } });
      }
      await tx.insert(settingChanges).values(changes.map((change) => ({ ...change, changedBy: adminId })));
    });
  },

  /** Newest first, with who made each change. */
  async recentChanges(limit: number): Promise<ChangeRow[]> {
    const rows = await db
      .select({
        id: settingChanges.id,
        key: settingChanges.key,
        oldValue: settingChanges.oldValue,
        newValue: settingChanges.newValue,
        changedAt: settingChanges.changedAt,
        byId: users.id,
        byName: users.name,
      })
      .from(settingChanges)
      .leftJoin(users, eq(users.id, settingChanges.changedBy))
      .orderBy(desc(settingChanges.changedAt))
      .limit(limit);
    return rows.map(({ byId, byName, ...row }) => ({ ...row, by: byId && byName ? { id: byId, name: byName } : null }));
  },
};
