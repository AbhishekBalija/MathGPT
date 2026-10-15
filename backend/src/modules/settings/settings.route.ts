/**
 * GET /admin/settings - current settings and the newest 20 changes
 * PATCH /admin/settings - change any of them; only real changes are saved and logged
 * GET /api/app-status - public: is solving paused, and are sign-ups open
 */

import { z } from "zod";
import { route, routeWithBody } from "../../lib/http";
import { logger } from "../../lib/logger";
import { getCurrentUser } from "../auth/auth.middleware";
import { getSettings, MaintenanceSchema, recentSettingChanges, SETTING_SCHEMAS, updateSettings, type Settings } from "./settings";

const SHOWN_CHANGES = 20;

const SettingsChangeSchema = z
  .object({
    dailyLimit: SETTING_SCHEMAS.dailyLimit.optional(),
    signupsOpen: SETTING_SCHEMAS.signupsOpen.optional(),
    maintenance: MaintenanceSchema.optional(),
  })
  .strict();

async function settingsBody(settings: Settings) {
  const changes = await recentSettingChanges(SHOWN_CHANGES);
  return { settings, changes: changes.map((change) => ({ ...change, changedAt: change.changedAt.toISOString() })) };
}

export const adminGetSettingsRoute = route(async () => ({ status: 200, body: await settingsBody(await getSettings()) }));

export const adminUpdateSettingsRoute = routeWithBody(SettingsChangeSchema, async (req, change) => {
  const admin = getCurrentUser(req);
  const settings = await updateSettings(change, admin.id);
  logger.info("Settings changed", { adminId: admin.id, keys: Object.keys(change) });
  return { status: 200, body: await settingsBody(settings) };
});

export const appStatusRoute = route(async () => {
  const { maintenance, signupsOpen } = await getSettings();
  return { status: 200, body: { maintenance, signupsOpen } };
});
