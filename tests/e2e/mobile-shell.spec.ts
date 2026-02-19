import { expect, test, type Locator, type Page } from "@playwright/test";

const DEEP_LINK_CONTEXT = "mobile_fallback_e2e";

async function gotoShell(page: Page, path: string) {
  await page.goto(path, { waitUntil: "commit" });
}

async function waitForAppParamToBecome(page: Page, expectedValue: string, timeout = 20_000) {
  await expect
    .poll(() => new URL(page.url()).searchParams.get("app"), { timeout })
    .toBe(expectedValue);
}

async function waitForAppParamToClear(page: Page, timeout = 20_000) {
  await expect
    .poll(() => new URL(page.url()).searchParams.get("app"), { timeout })
    .toBeNull();
}

async function safeClick(locator: Locator) {
  try {
    await locator.click({ timeout: 3_000 });
  } catch {
    await locator.click({ force: true, timeout: 3_000 });
  }
}

async function openAppsMenu(page: Page) {
  const appsButtonByTestId = page.getByTestId("windows-menu-trigger").first();
  const appsButtonByRole = page.getByRole("button", { name: /^Apps/i }).first();
  const menuPanel = page.getByTestId("windows-menu-panel").first();

  await expect
    .poll(
      async () =>
        (await appsButtonByTestId.count().catch(() => 0)) +
        (await appsButtonByRole.count().catch(() => 0)),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);

  const appsButton = (await appsButtonByTestId.count().catch(() => 0)) > 0
    ? appsButtonByTestId
    : appsButtonByRole;
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

async function getVisibleLauncherIds(page: Page, timeout = 10_000) {
  const menuPanel = page.getByTestId("windows-menu-panel").first();
  const launchers = menuPanel.locator('[data-testid^="windows-menu-launcher-"]');

  await expect
    .poll(async () => launchers.count(), { timeout })
    .toBeGreaterThan(0);

  return launchers.evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute("data-testid") || "")
      .filter((value) => value.length > 0 && value !== "windows-menu-launcher-list"),
  );
}

async function openStoreFromAppsMenu(page: Page) {
  await openAppsMenu(page);
  const menuPanel = page.getByTestId("windows-menu-panel").first();
  const launcherIds = await getVisibleLauncherIds(page);
  const storeLauncherId = launcherIds.find((id) => id.includes("store"));
  expect(storeLauncherId, `Expected a store launcher. Got: ${launcherIds.join(", ")}`).toBeTruthy();

  await safeClick(menuPanel.getByTestId(storeLauncherId!));
  await waitForAppParamToClear(page);
}

test.describe("Mobile Shell", () => {
  test("login deep-link opens and closes cleanly", async ({ page }) => {
    await gotoShell(page, `/?app=login&context=${DEEP_LINK_CONTEXT}`);
    await waitForAppParamToBecome(page, "login");

    const closeButton = page.getByRole("button", { name: /close window/i }).first();
    await expect(closeButton).toBeVisible();
    await safeClick(closeButton);
    await waitForAppParamToClear(page);
  });

  test("apps menu exposes launcher entries and opens store", async ({ page }) => {
    await gotoShell(page, "/");
    await openStoreFromAppsMenu(page);

    await expect(page.getByRole("button", { name: /close window/i })).toHaveCount(1);
    await openAppsMenu(page);
    await expect(page.getByTestId("windows-menu-window-store")).toHaveCount(1);
  });

  test("switching apps keeps a single active mobile panel", async ({ page }) => {
    await gotoShell(page, "/");
    await openStoreFromAppsMenu(page);

    await openAppsMenu(page);
    const menuPanel = page.getByTestId("windows-menu-panel").first();
    const launcherIds = await getVisibleLauncherIds(page);
    const switchLauncherId =
      launcherIds.find((id) => id.includes("mobile-settings")) ??
      launcherIds.find((id) => id.includes("mobile-browse-apps")) ??
      launcherIds.find((id) => id.includes("mobile-search-apps")) ??
      launcherIds.find((id) => !id.includes("store") && !id.includes("mobile-auth"));

    expect(switchLauncherId, `Expected a non-store launcher. Got: ${launcherIds.join(", ")}`).toBeTruthy();
    await safeClick(menuPanel.getByTestId(switchLauncherId!));

    await expect(page.getByRole("button", { name: /close window/i })).toHaveCount(1);
    await expect(page.locator("h2", { hasText: /store/i })).toHaveCount(0, { timeout: 20_000 });
  });

  test("store deep-link clears app param", async ({ page }) => {
    await gotoShell(page, `/?app=store&context=${DEEP_LINK_CONTEXT}`);
    await waitForAppParamToClear(page, 30_000);
  });

  test("public /store full-screen keeps section deep-link parity on mobile layouts", async ({ page }) => {
    await gotoShell(page, "/store?section=credits");
    await expect(page.getByRole("button", { name: /jump to/i })).toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("panel"), { timeout: 30_000 })
      .toBe("credits");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("section"), { timeout: 30_000 })
      .toBe("credits");
  });

  test("unknown deep-link app is cleaned from URL", async ({ page }) => {
    await gotoShell(page, `/?app=does-not-exist&context=${DEEP_LINK_CONTEXT}`);
    await waitForAppParamToClear(page, 30_000);
    await expect(page).not.toHaveURL(/[\?&]app=/);
  });
});
