import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const landingPort = Number(process.env.PLAYWRIGHT_LANDING_PORT || 3200);
const landingBaseURL = process.env.PLAYWRIGHT_LANDING_BASE_URL || `http://127.0.0.1:${landingPort}`;
const isCI = Boolean(process.env.CI);
const useWaeFixture = process.env.PLAYWRIGHT_WAE_ENABLE === "1";
const devServerCommand = isCI
  ? `npx next dev --port ${port} --hostname 127.0.0.1`
  : `npm run dev -- --port ${port} --hostname 127.0.0.1`;
const landingDevServerCommand = `npm --prefix apps/one-of-one-landing run dev -- --port ${landingPort} --hostname 127.0.0.1`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: [
    "desktop-shell.spec.ts",
    "onboarding-audit-handoff.spec.ts",
    "wae-scenario-dsl.spec.ts",
  ],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [
        ["github"],
        ["html", { outputFolder: "tmp/playwright-report/desktop-shell", open: "never" }],
      ]
    : [["list"]],
  outputDir: "tmp/test-results/desktop-shell",
  globalSetup: useWaeFixture ? "./tests/e2e/wae-global-setup.ts" : undefined,
  use: {
    baseURL,
    storageState: useWaeFixture ? "tmp/playwright/wae-storage-state.json" : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: [
    {
      command: devServerCommand,
      url: baseURL,
      reuseExistingServer: !isCI,
      timeout: isCI ? 300_000 : 180_000,
      env: {
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
    {
      command: landingDevServerCommand,
      url: landingBaseURL,
      reuseExistingServer: false,
      timeout: isCI ? 300_000 : 180_000,
      env: {
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_APP_URL: baseURL,
        NEXT_PUBLIC_API_ENDPOINT_URL: baseURL,
        NEXT_PUBLIC_ONE_OF_ONE_AUDIT_AGENT_ID: "one_of_one_audit_e2e",
      },
    },
  ],
});
