// Config for drizzle-kit: `bun run db:generate` and `bun run db:migrate`
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // Only `db:migrate` connects; `db:generate` works without a database
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
