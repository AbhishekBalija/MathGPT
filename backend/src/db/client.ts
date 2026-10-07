/**
 * The one Postgres connection pool for the whole app, wrapped by Drizzle.
 *
 * Only repositories import this (ADR-0004). A pool reuses a few open
 * connections instead of opening a new one per query, which matters on Neon.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { requireEnv } from "../lib/env";
import * as schema from "./schema";

export const pool = new Pool({
  connectionString: requireEnv("DATABASE_URL"),
});

export const db = drizzle(pool, { schema });
