import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    exclude: [".kiro/**/*"],
    env: {
      // Load test environment variables
      ...process.env,
      // Use your verified email for Resend test mode
      TEST_EMAIL: "itsmetherealremington@gmail.com",
    },
  },
  resolve: {
    conditions: ["import", "module", "browser", "default"],
  },
});
