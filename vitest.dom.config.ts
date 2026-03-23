import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

const envConfig = dotenv.config({ path: ".env.local" });

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts", "./tests/setup-dom.ts"],
    include: ["tests/**/*.dom.test.ts"],
    exclude: [".kiro/**/*"],
    testTimeout: 60000,
    hookTimeout: 120000,
    env: {
      TEST_EMAIL: "itsmetherealremington@gmail.com",
      CONVEX_URL: envConfig.parsed?.NEXT_PUBLIC_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || "",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@cms": path.resolve(__dirname, "./packages/cms/src/index.ts"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime.js"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "convex/server": path.resolve(__dirname, "./node_modules/convex/dist/cjs/server/index.js"),
      "convex/browser": path.resolve(__dirname, "./node_modules/convex/dist/cjs/browser/index.js"),
      "convex/values": path.resolve(__dirname, "./node_modules/convex/dist/cjs/values/index.js"),
    },
    conditions: ["node", "require", "default"],
  },
});
