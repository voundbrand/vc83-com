import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/mobile-shell.spec.ts"],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { outputFolder: "tmp/playwright-report/mobile-shell", open: "never" }],
      ]
    : [["list"]],
  outputDir: "tmp/test-results/mobile-shell",
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "phone-390x844",
      use: {
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "tablet-834x1112",
      use: {
        viewport: { width: 834, height: 1112 },
      },
    },
  ],
  webServer: useExternalServer
    ? undefined
    : {
        command: "npm run dev -- --port 3000 --hostname 127.0.0.1",
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
        env: {
          NEXT_TELEMETRY_DISABLED: "1",
        },
      },
});
