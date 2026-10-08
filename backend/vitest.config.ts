import { defineConfig } from "vitest/config";

export default defineConfig({
  // Never read the real .env files: tests get their settings from global-setup
  envDir: false,
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    // Once per run: safety guard, fresh Postgres schema
    globalSetup: ["tests/support/global-setup.ts"],
    // Once per test file: the real app on a random port with fake AI and email
    setupFiles: ["tests/support/start-app.ts"],
    // The app logs every request; only show those logs for failing tests
    silent: "passed-only",
    testTimeout: 60000,
    hookTimeout: 30000,
  },
});
