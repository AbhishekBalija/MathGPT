/**
 * Runs once before the whole test run (and its teardown once after).
 *
 * 1. Builds test-only settings, so nothing comes from your real `.env`
 * 2. Refuses to continue unless the Postgres URL is on localhost
 * 3. Recreates the Postgres test database schema and applies every migration
 *
 * Test files inherit `process.env` from here.
 */

import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { assertLocalDatabaseUrls } from "./local-only-guard";

const DEFAULT_TEST_DATABASE_URL = "postgres://localhost:5432/neomath_test";

// Resolved from this file, so the run works from any working directory
const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../drizzle", import.meta.url));

// Every secret is a dummy, so a test can never use a real account
const TEST_ENV = {
  NODE_ENV: "test",
  JWT_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  ACCESS_TOKEN_EXPIRY: "15m",
  REFRESH_TOKEN_EXPIRY: "7d",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GEMINI_MATH_AI_API: "test-not-a-real-key",
  OPEN_ROUTER_API_KEY: "",
  USE_MULTI_MODEL: "false",
  RESEND_API: "re_test_not_a_real_key",
  FROM_EMAIL: "NeoMath Test <test@example.invalid>",
};

// Creates the test database the first time, so no manual setup is needed
async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.slice(1);
  url.pathname = "/postgres";

  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      databaseName,
    ]);
    if (existing.rowCount === 0) {
      // Identifiers cannot be query parameters, so quote the name safely
      await client.query(`CREATE DATABASE "${databaseName.replaceAll('"', '""')}"`);
    }
  } finally {
    await client.end();
  }
}

// Drops every table, then applies all migrations from scratch
async function resetAndMigrate(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await client.end();
  }
}

export default async function setup(): Promise<() => Promise<void>> {
  const databaseUrl = process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL;

  // Before anything connects
  assertLocalDatabaseUrls({ DATABASE_URL: databaseUrl });

  Object.assign(process.env, TEST_ENV, {
    DATABASE_URL: databaseUrl,
  });

  await ensureDatabaseExists(databaseUrl);
  await resetAndMigrate(databaseUrl);

  return async () => {
    // Nothing to clean up: Postgres test tables stay for inspection
  };
}
