import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["convex/tests/**/*.test.ts"],
    exclude: [".kiro/**/*"],
  },
  resolve: {
    conditions: ["import", "module", "browser", "default"],
  },
});
