import { expect, test, type Page } from "@playwright/test";

type AppearanceMode = "dark" | "sepia";
type ShowcaseScheme = "midnight" | "daylight";
type VisualScreenId = "visual-shell" | "design-token-showcase" | "design-token-showcase-coverage";
type ContrastTokenPairId =
  | "text-on-bg"
  | "text-secondary-on-bg"
  | "text-on-surface"
  | "text-secondary-on-surface"
  | "accent-on-bg"
  | "btn-primary-text-on-btn-primary-bg";
type CheckKind = "VISUAL_CHECK" | "CONTRAST_CHECK";

const APPEARANCE_KEY = "reading-mode";
const APPEARANCE_EXPLICIT_KEY = "reading-mode-explicit";
const VISUAL_ASSERTION_OPTIONS = {
  animations: "disabled",
  caret: "hide",
  scale: "css",
  maxDiffPixelRatio: 0.01,
} as const;

const VISUAL_SNAPSHOTS = [
  {
    screen: "visual-shell",
    testId: "visual-shell-scene",
    snapshotPrefix: "visual-shell",
  },
  {
    screen: "design-token-showcase",
    testId: "design-token-showcase-scene",
    snapshotPrefix: "design-token-showcase",
  },
  {
    screen: "design-token-showcase-coverage",
    testId: "design-token-showcase-coverage-scene",
    snapshotPrefix: "design-token-showcase-coverage",
  },
] as const satisfies ReadonlyArray<{
  screen: VisualScreenId;
  testId: string;
  snapshotPrefix: string;
}>;

const CONTRAST_TOKEN_PAIRS = [
  "text-on-bg",
  "text-secondary-on-bg",
  "text-on-surface",
  "text-secondary-on-surface",
  "accent-on-bg",
  "btn-primary-text-on-btn-primary-bg",
] as const satisfies ReadonlyArray<ContrastTokenPairId>;

function logDeterministicLabel(
  kind: CheckKind,
  status: "PASS" | "FAIL",
  details: {
    screen: VisualScreenId | "design-token-showcase";
    mode: AppearanceMode;
    token?: ContrastTokenPairId;
    detail?: string;
  },
) {
  const segments = [`status=${status}`, `screen=${details.screen}`, `mode=${details.mode}`];
  if (details.token) {
    segments.push(`token=${details.token}`);
  }
  if (details.detail) {
    segments.push(details.detail);
  }
  console.log(`[${kind}] ${segments.join(" ")}`);
}

async function openScene(
  page: Page,
  mode: AppearanceMode,
  route: string,
  testId: string,
) {
  await page.addInitScript(
    ({ readingModeKey, explicitKey, nextMode }) => {
      window.localStorage.setItem(readingModeKey, nextMode);
      window.localStorage.setItem(explicitKey, "1");
    },
    { readingModeKey: APPEARANCE_KEY, explicitKey: APPEARANCE_EXPLICIT_KEY, nextMode: mode },
  );

  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-reading-mode", mode);
  await expect(page.getByTestId(testId)).toBeVisible();

  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

function mapAppearanceToShowcaseScheme(mode: AppearanceMode): ShowcaseScheme {
  if (mode === "dark") {
    return "midnight";
  }
  return "daylight";
}

function resolveSnapshotRoute(mode: AppearanceMode, screen: VisualScreenId): string {
  if (screen === "visual-shell") {
    return "/visual-regression";
  }
  const scheme = mapAppearanceToShowcaseScheme(mode);
  if (screen === "design-token-showcase-coverage") {
    return `/design-token-showcase?scheme=${scheme}&scene=coverage`;
  }
  return `/design-token-showcase?scheme=${scheme}`;
}

for (const mode of ["dark", "sepia"] as const) {
  for (const scenario of VISUAL_SNAPSHOTS) {
    test(`[VISUAL_CHECK] screen=${scenario.screen} mode=${mode}`, async ({ page }) => {
      const route = resolveSnapshotRoute(mode, scenario.screen);
      const snapshotFile = `${scenario.snapshotPrefix}-${mode}.png`;

      await openScene(page, mode, route, scenario.testId);

      await expect(
        page.getByTestId(scenario.testId),
        `[VISUAL_CHECK][FAIL] screen=${scenario.screen} mode=${mode} snapshot=${snapshotFile}`,
      ).toHaveScreenshot(snapshotFile, {
        ...VISUAL_ASSERTION_OPTIONS,
      });

      logDeterministicLabel("VISUAL_CHECK", "PASS", {
        screen: scenario.screen,
        mode,
        detail: `snapshot=${snapshotFile}`,
      });
    });
  }

  for (const tokenPair of CONTRAST_TOKEN_PAIRS) {
    test(`[CONTRAST_CHECK] screen=design-token-showcase mode=${mode} token=${tokenPair}`, async ({ page }) => {
      const scheme = mapAppearanceToShowcaseScheme(mode);
      await openScene(page, mode, `/design-token-showcase?scheme=${scheme}`, "design-token-showcase-scene");

      await page.getByRole("button", { name: "Contrast", exact: true }).click();
      await expect(page.getByTestId("showcase-contrast-panel")).toBeVisible();

      const row = page.getByTestId(`showcase-contrast-row-${tokenPair}`);
      await expect(
        row,
        `[CONTRAST_CHECK][FAIL] screen=design-token-showcase mode=${mode} token=${tokenPair} reason=row_not_visible`,
      ).toBeVisible();

      const recordedToken = await row.getAttribute("data-contrast-token-pair");
      const status = await row.getAttribute("data-contrast-status");
      const ratioRaw = await row.getAttribute("data-contrast-ratio");
      const thresholdRaw = await row.getAttribute("data-contrast-threshold");
      const ratio = ratioRaw ? Number(ratioRaw) : Number.NaN;
      const threshold = thresholdRaw ? Number(thresholdRaw) : Number.NaN;

      expect(
        recordedToken,
        `[CONTRAST_CHECK][FAIL] screen=design-token-showcase mode=${mode} token=${tokenPair} reason=token_mismatch observed=${recordedToken ?? "null"}`,
      ).toBe(tokenPair);
      expect(
        status,
        `[CONTRAST_CHECK][FAIL] screen=design-token-showcase mode=${mode} token=${tokenPair} ratio=${ratioRaw ?? "null"} threshold=${thresholdRaw ?? "null"}`,
      ).toBe("PASS");
      expect(
        Number.isFinite(threshold),
        `[CONTRAST_CHECK][FAIL] screen=design-token-showcase mode=${mode} token=${tokenPair} reason=invalid_threshold threshold=${thresholdRaw ?? "null"}`,
      ).toBe(true);
      expect(
        Number.isFinite(ratio) ? ratio : 0,
        `[CONTRAST_CHECK][FAIL] screen=design-token-showcase mode=${mode} token=${tokenPair} reason=invalid_ratio ratio=${ratioRaw ?? "null"} threshold=${thresholdRaw ?? "null"}`,
      ).toBeGreaterThanOrEqual(threshold);

      logDeterministicLabel("CONTRAST_CHECK", "PASS", {
        screen: "design-token-showcase",
        mode,
        token: tokenPair,
        detail: `ratio=${ratio.toFixed(2)} threshold=${Number.isFinite(threshold) ? threshold.toFixed(1) : "unknown"}`,
      });
    });
  }
}
