import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const isCI = Boolean(process.env.CI);
const devServerCommand = isCI
  ? `npx next dev --port ${port} --hostname 127.0.0.1`
  : `npm run dev -- --port ${port} --hostname 127.0.0.1`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["desktop-shell.spec.ts"],
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
  use: {
    baseURL,
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
  webServer: {
    command: devServerCommand,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: isCI ? 300_000 : 180_000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
