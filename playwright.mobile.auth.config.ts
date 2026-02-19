import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["mobile-shell-authenticated.spec.ts"],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [
        ["github"],
        ["html", { outputFolder: "tmp/playwright-report/mobile-shell-auth", open: "never" }],
      ]
    : [["list"]],
  outputDir: "tmp/test-results/mobile-shell-auth",
  globalSetup: "./tests/e2e/atx-global-setup.ts",
  use: {
    baseURL,
    storageState: "tmp/playwright/atx-storage-state.json",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "phone-auth-390x844",
      use: {
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "tablet-auth-834x1112",
      use: {
        viewport: { width: 834, height: 1112 },
      },
    },
  ],
  webServer: useExternalServer
    ? undefined
    : {
        command: `npm run dev -- --port ${port} --hostname 127.0.0.1`,
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: !isCI,
        env: {
          NEXT_TELEMETRY_DISABLED: "1",
        },
      },
});
