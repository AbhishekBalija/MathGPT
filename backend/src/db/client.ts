/**
 * The one Postgres connection pool for the whole app, wrapped by Drizzle.
 *
 * Only repositories import this (ADR-0004). A pool reuses a few open
 * connections instead of opening a new one per query, which matters on Neon.
 * In production DATABASE_URL should be Neon's pooled ("-pooler") address.
 */

import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { requireEnv } from "../lib/env";
import * as schema from "./schema";

export const pool = new Pool({
  connectionString: requireEnv("DATABASE_URL"),
});

// On Vercel, closes idle connections before a function is suspended, so
// Neon connections are not leaked. Does nothing outside Vercel.
attachDatabasePool(pool);

export const db = drizzle(pool, { schema });
