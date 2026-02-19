import { expect, test, type Locator, type Page } from "@playwright/test";

const AUTH_CONTEXT = "mobile_signed_in_e2e";

async function waitForAppParamToBecome(page: Page, expectedValue: string, timeout = 10_000) {
  await page.waitForFunction(
    (value) => new URL(window.location.href).searchParams.get("app") === value,
    expectedValue,
    { timeout },
  );
}

async function waitForAppParamToClear(page: Page, timeout = 10_000) {
  await page.waitForFunction(
    () => !new URL(window.location.href).searchParams.get("app"),
    undefined,
    { timeout },
  );
}

async function openAppsMenu(page: Page) {
  const appsButton = page.getByRole("button", { name: /^Apps/i }).first();
  await expect(appsButton).toBeVisible();
  await appsButton.click();
}

async function safeClick(locator: Locator) {
  try {
    await locator.click();
  } catch {
    await locator.click({ force: true });
  }
}

test.describe("Mobile Shell (Authenticated)", () => {
  test("opens auth-only windows and preserves single-panel behavior while signed in", async ({ page }) => {
    await test.step("all-apps deep-link opens for authenticated user", async () => {
      await page.goto(`/?app=all-apps&context=${AUTH_CONTEXT}`, { waitUntil: "domcontentloaded" });
      await waitForAppParamToBecome(page, "all-apps");
      await expect(page.locator("h2", { hasText: /all apps|all applications/i }).first()).toBeVisible();
      await waitForAppParamToClear(page);
    });

    await test.step("apps menu exposes authenticated actions", async () => {
      await openAppsMenu(page);
      await expect(page.getByTestId("windows-menu-launcher-mobile-auth")).toHaveCount(1);
      await expect(page.getByTestId("windows-menu-launcher-mobile-settings")).toHaveCount(1);
    });

    await test.step("switching to settings hides all-apps panel", async () => {
      await safeClick(page.getByTestId("windows-menu-launcher-mobile-settings").first());

      await page.waitForFunction(() => {
        const headings = Array.from(document.querySelectorAll("h2")).map((node) =>
          (node.textContent || "").toLowerCase(),
        );
        const hasSettings = headings.some((text) => text.includes("settings"));
        const hasAllApps = headings.some((text) => /all apps|all applications/.test(text));
        return hasSettings && !hasAllApps;
      });
    });

    await test.step("settings launches without auth fallback prompt", async () => {
      await page.waitForFunction(() => {
        const headings = Array.from(document.querySelectorAll("h2")).map((node) =>
          (node.textContent || "").toLowerCase(),
        );
        const hasSettings = headings.some((text) => text.includes("settings"));
        const hasUserAccount = headings.some((text) => text.includes("user account"));
        return hasSettings && !hasUserAccount;
      });
      await waitForAppParamToClear(page);
    });

    await test.step("control-panel deep-link opens while authenticated", async () => {
      await page.goto(`/?app=control-panel&context=${AUTH_CONTEXT}`, { waitUntil: "domcontentloaded" });
      await waitForAppParamToBecome(page, "control-panel");
      await page.waitForFunction(() => {
        const headings = Array.from(document.querySelectorAll("h2")).map((node) =>
          (node.textContent || "").toLowerCase(),
        );
        return headings.some((text) => text.includes("settings"));
      });
      await waitForAppParamToClear(page);
    });
  });
});
