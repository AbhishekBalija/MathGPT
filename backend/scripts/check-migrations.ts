/**
 * Stops a deploy when the database is missing a migration.
 *
 * Runs as Vercel's build step (`vercel-build`). Migrations are applied on
 * purpose, never by the deploy (ADR-0002). If code that needs a new table
 * is deployed before its migration runs, the live site breaks. This check
 * fails the build instead, so the current deployment keeps serving until
 * `bun run db:migrate` has been run against that database.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

interface JournalEntry {
  tag: string;
  when: number;
}

/** Tags of the migrations in the journal that the database has not applied. */
export function findPendingMigrations(
  journal: JournalEntry[],
  appliedTimestamps: number[]
): string[] {
  // Drizzle records each applied migration with its journal timestamp
  const applied = new Set(appliedTimestamps);
  return journal.filter((entry) => !applied.has(entry.when)).map((entry) => entry.tag);
}

function readJournal(): JournalEntry[] {
  const path = fileURLToPath(new URL("../drizzle/meta/_journal.json", import.meta.url));
  const journal: { entries: JournalEntry[] } = JSON.parse(readFileSync(path, "utf8"));
  return journal.entries;
}

async function readAppliedTimestamps(databaseUrl: string): Promise<number[]> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query<{ created_at: string }>(
      "select created_at from drizzle.__drizzle_migrations"
    );
    return result.rows.map((row) => Number(row.created_at));
  } catch (error) {
    // No migrations table yet means nothing has been applied
    if (typeof error === "object" && error !== null && "code" in error && error.code === "42P01") {
      return [];
    }
    throw error;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set, so the migration check cannot run");
  }

  const pending = findPendingMigrations(readJournal(), await readAppliedTimestamps(databaseUrl));
  if (pending.length > 0) {
    console.error(
      `Deploy stopped: the database is missing ${pending.length} migration(s): ${pending.join(", ")}.\n` +
        'Run `DATABASE_URL="<this environment\'s database>" bun run db:migrate` in backend/, then redeploy.'
    );
    process.exit(1);
  }
  console.log("Migration check passed: the database has every migration.");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    // Only the message: a database error must never print the connection string
    console.error("Migration check failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
