import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.local for tests
const envConfig = dotenv.config({ path: ".env.local" });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: [".kiro/**/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["convex/**/*.ts"],
      exclude: [
        "convex/_generated/**",
        "convex/schema.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
      all: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    testTimeout: 60000,
    hookTimeout: 120000, // Increased for cloud Convex operations
    env: {
      TEST_EMAIL: "itsmetherealremington@gmail.com",
      // Pass the Convex URL to tests (without NEXT_PUBLIC_ prefix for simplicity)
      CONVEX_URL: envConfig.parsed?.NEXT_PUBLIC_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || "",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "convex/server": path.resolve(__dirname, "./node_modules/convex/dist/cjs/server/index.js"),
      "convex/browser": path.resolve(__dirname, "./node_modules/convex/dist/cjs/browser/index.js"),
      "convex/values": path.resolve(__dirname, "./node_modules/convex/dist/cjs/values/index.js"),
    },
    conditions: ["node", "require", "default"],
  },
});
