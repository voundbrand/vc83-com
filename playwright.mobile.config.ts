import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const isCI = Boolean(process.env.CI);
const devServerCommand = isCI
  ? `npx next dev --port ${port} --hostname 127.0.0.1`
  : `npm run dev -- --port ${port} --hostname 127.0.0.1`;

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
        command: devServerCommand,
        url: baseURL,
        timeout: isCI ? 300_000 : 180_000,
        reuseExistingServer: !isCI,
        env: {
          NEXT_TELEMETRY_DISABLED: "1",
        },
      },
});
