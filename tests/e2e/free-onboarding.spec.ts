import { expect, test } from "@playwright/test";
import {
  createShellNavigationRetryTracker,
  finalizeShellNavigationRetries,
  gotoShellWithRetry,
} from "./utils/shell-navigation";

const CLAIM_TOKEN_STORAGE_KEY = "l4yercak3_native_guest_claim_token";

test.describe("Free Onboarding", () => {
  test("logged-out refresh keeps AI chat-first path without forcing login", async ({ page }, testInfo) => {
    const navigationTracker = createShellNavigationRetryTracker({ abortRetryBudget: 2 });

    await gotoShellWithRetry(page, "/", navigationTracker);
    await expect(page.getByTestId("desktop-window-tab-ai-assistant")).toBeVisible();
    await expect(page.getByTestId("desktop-window-tab-login")).toHaveCount(0);

    await page.reload({ waitUntil: "commit" });

    await expect(page.getByTestId("desktop-window-tab-ai-assistant")).toBeVisible();
    await expect(page.getByTestId("desktop-window-tab-login")).toHaveCount(0);

    finalizeShellNavigationRetries(navigationTracker, testInfo);
  });

  test("authMode/signup + betaCode handoff opens signup mode and prefills beta code", async ({ page }, testInfo) => {
    const navigationTracker = createShellNavigationRetryTracker({ abortRetryBudget: 2 });
    const betaCode = "FOG2-BETA-001";

    await gotoShellWithRetry(
      page,
      `/?openLogin=aiAssistant&authMode=signup&betaCode=${betaCode}`,
      navigationTracker
    );

    await expect(page.getByTestId("desktop-window-tab-login")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Create Free Account$/ })).toBeVisible();
    await expect(page.getByPlaceholder("BNI-PSW-001")).toHaveValue(betaCode);

    finalizeShellNavigationRetries(navigationTracker, testInfo);
  });

  test("guest claim-token handoff is forwarded into OAuth signup URL requests", async ({ page }, testInfo) => {
    const navigationTracker = createShellNavigationRetryTracker({ abortRetryBudget: 2 });
    const claimToken = "fog2-claim-token-e2e";
    let oauthSignupRequestUrl: string | null = null;

    await page.addInitScript(
      ({ storageKey, token }: { storageKey: string; token: string }) => {
        window.localStorage.setItem(storageKey, token);
      },
      { storageKey: CLAIM_TOKEN_STORAGE_KEY, token: claimToken }
    );

    await page.route("**/api/auth/oauth-signup**", async (route) => {
      oauthSignupRequestUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body>stubbed oauth signup</body></html>",
      });
    });

    await gotoShellWithRetry(page, "/?openLogin=aiAssistant&authMode=signup", navigationTracker);
    await expect(page.getByTestId("desktop-window-tab-login")).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/api\/auth\/oauth-signup\?/),
      page.getByRole("button", { name: /^Continue with Google$/ }).first().click(),
    ]);

    if (!oauthSignupRequestUrl) {
      throw new Error("Expected OAuth signup request to be captured");
    }

    const requestUrl = new URL(oauthSignupRequestUrl);
    expect(requestUrl.searchParams.get("identityClaimToken")).toBe(claimToken);
    expect(requestUrl.searchParams.get("onboardingChannel")).toBe("native_guest");
    expect(requestUrl.searchParams.get("sessionType")).toBe("platform");

    finalizeShellNavigationRetries(navigationTracker, testInfo);
  });

  test("signup deep-link query params are removed after handoff consumption", async ({ page }, testInfo) => {
    const navigationTracker = createShellNavigationRetryTracker({ abortRetryBudget: 2 });

    await gotoShellWithRetry(
      page,
      "/?openLogin=aiAssistant&authMode=signup&betaCode=FOG2-CLEANUP-01&beta_code=legacy-cleanup",
      navigationTracker
    );

    await expect(page.getByTestId("desktop-window-tab-login")).toBeVisible();

    await expect.poll(() => {
      const params = new URL(page.url()).searchParams;
      return {
        openLogin: params.get("openLogin"),
        authMode: params.get("authMode"),
        betaCode: params.get("betaCode"),
        beta_code: params.get("beta_code"),
      };
    }).toEqual({
      openLogin: null,
      authMode: null,
      betaCode: null,
      beta_code: null,
    });

    finalizeShellNavigationRetries(navigationTracker, testInfo);
  });
});
