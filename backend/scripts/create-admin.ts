/**
 * Creates an Admin, or makes an existing User an Admin.
 *
 * Usage: bun run scripts/create-admin.ts
 *
 * Uses DATABASE_URL from your environment (Bun loads .env automatically).
 * To create an Admin in production, set DATABASE_URL to the Neon URL for
 * that one command, on purpose. The script never picks production for you.
 */

import bcrypt from "bcryptjs";
import * as readline from "node:readline/promises";
import { pool } from "../src/db/client";
import { passwordSchema } from "../src/modules/auth/password";
import { normalizeEmail, userRepository } from "../src/modules/users/user.repository";

async function createAdmin(rl: readline.Interface) {
  console.log("\nCreate Admin User\n");
  console.log(`Database host: ${new URL(process.env.DATABASE_URL ?? "").hostname}\n`);

  const email = normalizeEmail(await rl.question("Admin email: "));
  if (!email.includes("@")) {
    throw new Error("Invalid email address");
  }

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    if (existing.isAdmin) {
      console.log("\nThat User is already an Admin.");
    } else {
      await userRepository.setAdmin(existing.id, true);
      console.log("\nExisting User is now an Admin.");
    }
    return;
  }

  const name = (await rl.question("Admin name: ")).trim();
  if (!name) {
    throw new Error("Name is required");
  }

  // Same rules as normal sign-up
  const password = passwordSchema.safeParse(await rl.question("Password: "));
  if (!password.success) {
    throw new Error(password.error.issues[0]?.message ?? "Invalid password");
  }

  // One insert, so a failure never leaves a half-created account behind
  const user = await userRepository.create({
    email,
    name,
    passwordHash: await bcrypt.hash(password.data, 10),
    provider: "email",
    isAdmin: true,
  });

  console.log(`\nAdmin created: ${user.email}`);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

createAdmin(rl)
  .catch((error: unknown) => {
    console.error("\nFailed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  // Closing readline releases stdin, otherwise the script hangs after an error
  .finally(() => {
    rl.close();
    return pool.end();
  });
