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
    dedupe: ["react", "react-dom", "next"],
    alias: [
      {
        find: "@/components/header",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/components/header.tsx"),
      },
      {
        find: "@/components/footer",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/components/footer.tsx"),
      },
      {
        find: "@/components/wave-divider",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/components/wave-divider.tsx"),
      },
      {
        find: "@/components/ui/toaster",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/components/ui/toaster.tsx"),
      },
      {
        find: "@/components/ui/button",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/components/ui/button.tsx"),
      },
      {
        find: "@/components/ui/card",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/components/ui/card.tsx"),
      },
      {
        find: "@/components/ui/input",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/components/ui/input.tsx"),
      },
      {
        find: "@/components/ui/label",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/components/ui/label.tsx"),
      },
      {
        find: "@/components/ui/textarea",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/components/ui/textarea.tsx"),
      },
      {
        find: "@/components/ui/calendar",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/components/ui/calendar.tsx"),
      },
      {
        find: "@/lib/translations",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/lib/translations.ts"),
      },
      {
        find: "@/lib/language-context",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/lib/language-context.tsx"),
      },
      {
        find: "@/hooks/use-toast",
        replacement: path.resolve(__dirname, "./apps/segelschule-altwarp/hooks/use-toast.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
      {
        find: "@cms",
        replacement: path.resolve(__dirname, "./packages/cms/src/index.ts"),
      },
      {
        find: "react",
        replacement: path.resolve(__dirname, "./node_modules/react"),
      },
      {
        find: "react/jsx-runtime",
        replacement: path.resolve(__dirname, "./node_modules/react/jsx-runtime.js"),
      },
      {
        find: "react/jsx-dev-runtime",
        replacement: path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime.js"),
      },
      {
        find: "react-dom",
        replacement: path.resolve(__dirname, "./node_modules/react-dom"),
      },
      {
        find: "convex/server",
        replacement: path.resolve(__dirname, "./node_modules/convex/dist/cjs/server/index.js"),
      },
      {
        find: "convex/browser",
        replacement: path.resolve(__dirname, "./node_modules/convex/dist/cjs/browser/index.js"),
      },
      {
        find: "convex/values",
        replacement: path.resolve(__dirname, "./node_modules/convex/dist/cjs/values/index.js"),
      },
    ],
    conditions: ["node", "require", "default"],
  },
});
