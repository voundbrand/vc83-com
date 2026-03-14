import { expect, test } from "@playwright/test";

const AUTH_PROMPT = "Sign in and select an organization to manage agents.";

test.describe("Agent Trust Experience", () => {
  test("renders agent cockpit surfaces for an authenticated org context", async ({ page }) => {
    await page.goto("/agents", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("AI Agents").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(AUTH_PROMPT)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Agent Ops$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: /^Agent Catalog$/i }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: /^Tool Setup$/i })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("opens agents-browser via shell deep-link after auth hydration", async ({ page }) => {
    await page.goto("/?app=agents-browser&context=atx_e2e", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("AI Agents").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(AUTH_PROMPT)).toHaveCount(0);

    await expect.poll(
      () => new URL(page.url()).searchParams.get("app"),
      { timeout: 20_000, message: "Expected app query param to be cleaned after deep-link open" },
    ).toBeNull();
  });
});
