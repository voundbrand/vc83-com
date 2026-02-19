import { expect, test, type Locator, type Page } from "@playwright/test";

const DEEP_LINK_CONTEXT = "mobile_fallback_e2e";

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
  const appsButton = page.getByTestId("windows-menu-trigger").first();
  const menuPanel = page.getByTestId("windows-menu-panel").first();

  await expect(appsButton).toBeVisible();

  if (await menuPanel.isVisible().catch(() => false)) {
    return;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await safeClick(appsButton);

    try {
      await expect(menuPanel).toBeVisible({ timeout: 2_000 });
      return;
    } catch {
      await page.waitForTimeout(150);
    }
  }

  await expect(menuPanel).toBeVisible();
}

async function safeClick(locator: Locator) {
  try {
    await locator.click();
  } catch {
    await locator.click({ force: true });
  }
}

test.describe("Mobile Shell", () => {
  test("supports login close, app launch/switching, and deep-link cleanup", async ({ page }) => {
    await test.step("login deep-link opens and closes cleanly", async () => {
      await page.goto(`/?app=login&context=${DEEP_LINK_CONTEXT}`, { waitUntil: "domcontentloaded" });
      await waitForAppParamToBecome(page, "login");

      const closeButton = page.getByRole("button", { name: /close window/i }).first();
      await expect(closeButton).toBeVisible();
      await safeClick(closeButton);
      await waitForAppParamToClear(page);
    });

    await test.step("apps menu shows stable launcher entries and opens store", async () => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await openAppsMenu(page);
      const menuPanel = page.getByTestId("windows-menu-panel").first();
      const browseLauncher = menuPanel.getByTestId("windows-menu-launcher-mobile-browse-apps");
      const storeLauncher = menuPanel.getByTestId("windows-menu-launcher-mobile-store");

      await expect(browseLauncher).toHaveCount(1);
      await expect(storeLauncher).toHaveCount(1);

      await safeClick(storeLauncher.first());
      await waitForAppParamToClear(page);
      await expect(page.locator("h2", { hasText: /store/i }).first()).toBeVisible();
    });

    await test.step("switching apps keeps a single active mobile panel", async () => {
      await openAppsMenu(page);
      const menuPanel = page.getByTestId("windows-menu-panel").first();
      await safeClick(menuPanel.getByTestId("windows-menu-launcher-mobile-browse-apps").first());

      await page.waitForFunction(() => {
        const headings = Array.from(document.querySelectorAll("h2")).map((node) =>
          (node.textContent || "").toLowerCase(),
        );
        const switchedPanel = headings.some((text) => /all apps|all applications|user account/.test(text));
        const storeStillVisible = headings.some((text) => text.includes("store"));
        return switchedPanel && !storeStillVisible;
      });
    });

    await test.step("store deep-link opens and close clears app param", async () => {
      await page.goto(`/?app=store&context=${DEEP_LINK_CONTEXT}`, { waitUntil: "domcontentloaded" });
      await waitForAppParamToBecome(page, "store");
      await expect(page.locator("h2", { hasText: /store/i }).first()).toBeVisible();

      const closeButton = page.getByRole("button", { name: /close window/i }).first();
      await safeClick(closeButton);
      await waitForAppParamToClear(page);
    });

    await test.step("unknown deep-link app is cleaned from URL", async () => {
      await page.goto(`/?app=does-not-exist&context=${DEEP_LINK_CONTEXT}`, { waitUntil: "domcontentloaded" });
      await waitForAppParamToClear(page);
      await expect(page).not.toHaveURL(/[\?&]app=/);
    });
  });
});
