/**
 * The migrations the code expects, from Drizzle's journal. Imported (not
 * read from disk) so it is bundled into the deployed API too.
 */

import journal from "../../drizzle/meta/_journal.json" with { type: "json" };

export interface JournalEntry {
  tag: string;
  when: number;
}

export function readJournal(): JournalEntry[] {
  return journal.entries.map((entry) => ({ tag: entry.tag, when: entry.when }));
}

/** Tags of the migrations in the journal that the database has not applied. */
export function findPendingMigrations(entries: JournalEntry[], appliedTimestamps: number[]): string[] {
  // Drizzle records each applied migration with its journal timestamp
  const applied = new Set(appliedTimestamps);
  return entries.filter((entry) => !applied.has(entry.when)).map((entry) => entry.tag);
}
