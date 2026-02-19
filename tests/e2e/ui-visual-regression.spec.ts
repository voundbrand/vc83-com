import { expect, test, type Page } from "@playwright/test";

type AppearanceMode = "dark" | "sepia";

const APPEARANCE_KEY = "reading-mode";
const APPEARANCE_EXPLICIT_KEY = "reading-mode-explicit";
const VISUAL_SCENE_TEST_ID = "visual-shell-scene";

async function openVisualScene(page: Page, mode: AppearanceMode) {
  await page.addInitScript(
    ({ readingModeKey, explicitKey, nextMode }) => {
      window.localStorage.setItem(readingModeKey, nextMode);
      window.localStorage.setItem(explicitKey, "1");
    },
    { readingModeKey: APPEARANCE_KEY, explicitKey: APPEARANCE_EXPLICIT_KEY, nextMode: mode },
  );

  await page.goto("/visual-regression", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-reading-mode", mode);
  await expect(page.getByTestId(VISUAL_SCENE_TEST_ID)).toBeVisible();

  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

for (const mode of ["dark", "sepia"] as const) {
  test(`captures visual shell snapshot in ${mode} mode`, async ({ page }) => {
    await openVisualScene(page, mode);

    await expect(page.getByTestId(VISUAL_SCENE_TEST_ID)).toHaveScreenshot(`visual-shell-${mode}.png`, {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.01,
    });
  });
}
