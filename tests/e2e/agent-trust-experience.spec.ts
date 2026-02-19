import { expect, test } from "@playwright/test";

const AUTH_PROMPT = "Sign in and select an organization to manage agents.";

function buildAgentName() {
  return `ATX E2E Agent ${Date.now()}`;
}

test.describe("Agent Trust Experience", () => {
  test("creates an agent and renders trust cockpit surfaces", async ({ page }) => {
    await page.goto("/agents", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("AI Agents").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(AUTH_PROMPT)).toHaveCount(0);

    await page.getByRole("button", { name: /^New$/ }).first().click();
    await page.getByPlaceholder("My Support Agent").fill(buildAgentName());
    await page.getByRole("button", { name: /Create Agent/i }).click();

    await expect(page.getByText("Trust Health")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Guardrail Map")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Thread Queue")).toBeVisible({ timeout: 30_000 });
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
