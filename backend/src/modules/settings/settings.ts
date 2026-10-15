/**
 * Admin settings: the daily free limit, whether new sign-ups are open, and
 * maintenance mode. Changed from the admin Settings page, with no deploy.
 *
 * Each server copy keeps them for 15 seconds, so a change applies everywhere
 * within 15 seconds without a database read on every request.
 */

import { z } from "zod";
import { settingsRepository } from "./settings.repository";

export const MaintenanceSchema = z.object({
  on: z.boolean(),
  message: z.string().trim().min(1).max(300),
});

// What each stored value must look like. A value that doesn't fit is ignored
// and the default is used, so a bad row can never break solving.
export const SETTING_SCHEMAS = {
  dailyLimit: z.number().int().min(1).max(50),
  signupsOpen: z.boolean(),
  maintenance: MaintenanceSchema,
};

export type SettingKey = keyof typeof SETTING_SCHEMAS;
export type Settings = { [K in SettingKey]: z.infer<(typeof SETTING_SCHEMAS)[K]> };

export const DEFAULT_SETTINGS: Settings = {
  dailyLimit: 5,
  signupsOpen: true,
  maintenance: { on: false, message: "Neo is taking a short break to get better. Please try again in a little while." },
};

export const SIGNUPS_PAUSED_MESSAGE = "New sign-ups are paused for now. If you already have an account, log in.";

const CACHE_MS = 15_000;
const KEYS = Object.keys(SETTING_SCHEMAS) as SettingKey[];

let cached: { at: number; settings: Settings } | null = null;

/** Forgets the kept settings, so the next read goes to the database. */
export function resetSettingsCache(): void {
  cached = null;
}

function fromStored(stored: Map<string, unknown>): Settings {
  const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const key of KEYS) {
    const parsed = SETTING_SCHEMAS[key].safeParse(stored.get(key));
    if (parsed.success) settings[key] = parsed.data;
  }
  return settings as Settings;
}

export async function getSettings(): Promise<Settings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.settings;
  const settings = fromStored(await settingsRepository.readAll());
  cached = { at: Date.now(), settings };
  return settings;
}

/** Saves what changed and logs each change. Values must already be valid. */
export async function updateSettings(change: Partial<Settings>, adminId: string): Promise<Settings> {
  // Compare with the database, not the 15-second copy
  const current = fromStored(await settingsRepository.readAll());
  const changes = KEYS.filter((key) => change[key] !== undefined && JSON.stringify(change[key]) !== JSON.stringify(current[key])).map((key) => ({
    key,
    oldValue: current[key],
    newValue: change[key],
  }));
  await settingsRepository.save(changes, adminId);
  resetSettingsCache();
  return getSettings();
}

export function recentSettingChanges(limit: number) {
  return settingsRepository.recentChanges(limit);
}
