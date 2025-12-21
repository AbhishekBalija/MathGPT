import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    testTimeout: 60000, // 60 seconds for API tests
    hookTimeout: 30000, // 30 seconds for setup/teardown hooks
  },
});
