import { expect, test } from "@playwright/test";
import {
  createShellNavigationRetryTracker,
  finalizeShellNavigationRetries,
  gotoShellWithRetry,
} from "./utils/shell-navigation";

const LANDING_BASE_URL = process.env.PLAYWRIGHT_LANDING_BASE_URL || "http://127.0.0.1:3200";

const REHEARSAL_SESSION_TOKEN = "ooo059-session-token";
const REHEARSAL_CLAIM_TOKEN = "ooo059-claim-token";
const REHEARSAL_FIRST_RESPONSE =
  "Thanks. I have enough context to map your Monday bottleneck.";
const REHEARSAL_SECOND_RESPONSE =
  "Good. I can now frame the exact workflow your operator should own first.";
const REHEARSAL_WORKFLOW_RESPONSE =
  "Based on what you've told me, here's the highest-leverage workflow and your workflow brief PDF.";

test.describe("Onboarding Audit Handoff", () => {
  test("cold visit completes audit-to-signup handoff with preserved context", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);

    const navigationTracker = createShellNavigationRetryTracker({ abortRetryBudget: 2 });
    const outboundPayloads: Array<Record<string, unknown>> = [];
    let oauthSignupRequestUrl: string | null = null;
    let auditRequestCount = 0;

    await page.route("**/api/v1/native-guest/message", async (route) => {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      outboundPayloads.push(payload);
      auditRequestCount += 1;

      const responseByStep =
        auditRequestCount === 1
          ? REHEARSAL_FIRST_RESPONSE
          : auditRequestCount === 2
            ? REHEARSAL_SECOND_RESPONSE
            : REHEARSAL_WORKFLOW_RESPONSE;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessionToken: REHEARSAL_SESSION_TOKEN,
          claimToken: REHEARSAL_CLAIM_TOKEN,
          response: responseByStep,
          agentName: "Operator",
        }),
      });
    });

    await page.route("**/api/auth/oauth-signup**", async (route) => {
      oauthSignupRequestUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body>stubbed oauth signup</body></html>",
      });
    });

    await gotoShellWithRetry(
      page,
      `${LANDING_BASE_URL}/?utm_source=e2e&utm_medium=playwright&utm_campaign=ooo_059&exp_flow=v1`,
      navigationTracker
    );

    await expect(page.getByRole("heading", { name: /Private AI\. You can Trust\./i })).toBeVisible();
    await expect(page.locator("#landing-audit-input")).toBeEnabled();

    const sendAuditMessage = async (message: string, expectedRequestCount: number) => {
      const input = page.locator("#landing-audit-input");
      const sendButton = page.locator('form:has(#landing-audit-input) button[type="submit"]');

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        await input.click();
        await input.fill(message);
        await expect(input).toHaveValue(message);

        if (!(await sendButton.isEnabled())) {
          if (attempt === 3) {
            throw new Error("Expected landing audit send button to be enabled after composer fill");
          }
          await page.waitForTimeout(250);
          continue;
        }

        await sendButton.click();
        try {
          await expect.poll(() => auditRequestCount).toBe(expectedRequestCount);
          return;
        } catch (error) {
          if (attempt === 3) {
            throw error;
          }
          await page.waitForTimeout(300);
        }
      }
    };

    await sendAuditMessage("We run an accounting firm at roughly $3M ARR.", 1);
    await expect(page.getByText(REHEARSAL_FIRST_RESPONSE)).toBeVisible();

    await sendAuditMessage("Team is 9 people and Monday starts in inbox + cashflow check.", 2);
    await expect(page.getByText(REHEARSAL_SECOND_RESPONSE)).toBeVisible();

    await sendAuditMessage("I need quote prep and follow-up ownership off my plate.", 3);
    await expect(page.getByText(REHEARSAL_WORKFLOW_RESPONSE)).toBeVisible();

    expect(auditRequestCount).toBe(3);
    expect((outboundPayloads[0] as { sessionToken?: string }).sessionToken).toBeUndefined();
    expect((outboundPayloads[1] as { sessionToken?: string }).sessionToken).toBe(REHEARSAL_SESSION_TOKEN);
    expect((outboundPayloads[2] as { sessionToken?: string }).sessionToken).toBe(REHEARSAL_SESSION_TOKEN);

    const firstPayloadAttribution = (outboundPayloads[0] as { attribution?: Record<string, string> })
      .attribution;
    expect(firstPayloadAttribution?.source).toBe("e2e");
    expect(firstPayloadAttribution?.medium).toBe("playwright");
    expect(firstPayloadAttribution?.campaign).toBe("ooo_059");
    expect(firstPayloadAttribution?.landingPath).toContain("utm_source=e2e");

    await expect(page.getByText("Claim token captured for handoff.")).toBeVisible();

    const createAccountLink = page.getByRole("link", {
      name: /Create account and (carry audit context|keep your audit progress)/i,
    });
    await expect(createAccountLink).toBeVisible();

    const createAccountHref = await createAccountLink.getAttribute("href");
    if (!createAccountHref) {
      throw new Error("Expected create-account handoff link to include href");
    }

    const createAccountUrl = new URL(createAccountHref);
    expect(createAccountUrl.searchParams.get("identityClaimToken")).toBe(REHEARSAL_CLAIM_TOKEN);
    expect(createAccountUrl.searchParams.get("onboardingChannel")).toBe("native_guest");
    expect(createAccountUrl.searchParams.get("utm_source")).toBe("e2e");
    expect(createAccountUrl.searchParams.get("utm_medium")).toBe("playwright");
    expect(createAccountUrl.searchParams.get("utm_campaign")).toBe("ooo_059");

    const callbackParam = createAccountUrl.searchParams.get("callback");
    if (!callbackParam) {
      throw new Error("Expected callback URL in create-account link");
    }

    const callbackUrl = new URL(callbackParam);
    expect(callbackUrl.pathname).toBe("/chat");
    expect(callbackUrl.searchParams.get("handoff")).toBe("one-of-one");
    expect(callbackUrl.searchParams.get("intent")).toBe("resume");
    expect(callbackUrl.searchParams.get("guestSession")).toBe(REHEARSAL_SESSION_TOKEN);
    expect(callbackUrl.searchParams.get("identityClaimToken")).toBe(REHEARSAL_CLAIM_TOKEN);
    expect(callbackUrl.searchParams.get("utm_source")).toBe("e2e");
    expect(callbackUrl.searchParams.get("utm_medium")).toBe("playwright");

    const webLink = page.getByRole("link", { name: /^Web$/ }).first();
    const webHref = await webLink.getAttribute("href");
    if (!webHref) {
      throw new Error("Expected Start Free Web handoff URL");
    }
    const webUrl = new URL(webHref);
    expect(webUrl.pathname).toBe("/chat");
    expect(webUrl.searchParams.get("guestSession")).toBe(REHEARSAL_SESSION_TOKEN);
    expect(webUrl.searchParams.get("identityClaimToken")).toBe(REHEARSAL_CLAIM_TOKEN);

    const doneWithYouHref = await page
      .locator('a[href*="offer_code=consult_done_with_you"]')
      .first()
      .getAttribute("href");
    if (!doneWithYouHref) {
      throw new Error("Expected Done With You CTA link");
    }
    const doneWithYouUrl = new URL(doneWithYouHref);
    expect(doneWithYouUrl.pathname).toBe("/store");
    expect(doneWithYouUrl.searchParams.get("autostartCommercial")).toBe("1");
    expect(doneWithYouUrl.searchParams.get("offer_code")).toBe("consult_done_with_you");
    expect(doneWithYouUrl.searchParams.get("intent_code")).toBe("consulting_sprint_scope_only");
    expect(doneWithYouUrl.searchParams.get("offerCode")).toBe("consult_done_with_you");
    expect(doneWithYouUrl.searchParams.get("intentCode")).toBe("consulting_sprint_scope_only");
    expect(doneWithYouUrl.searchParams.get("guestSession")).toBe(REHEARSAL_SESSION_TOKEN);

    const fullBuildHref = await page
      .locator('a[href*="offer_code=layer1_foundation"]')
      .first()
      .getAttribute("href");
    if (!fullBuildHref) {
      throw new Error("Expected Full Build CTA link");
    }
    const fullBuildUrl = new URL(fullBuildHref);
    expect(fullBuildUrl.pathname).toBe("/store");
    expect(fullBuildUrl.searchParams.get("autostartCommercial")).toBe("1");
    expect(fullBuildUrl.searchParams.get("offer_code")).toBe("layer1_foundation");
    expect(fullBuildUrl.searchParams.get("intent_code")).toBe("implementation_start_layer1");
    expect(fullBuildUrl.searchParams.get("offerCode")).toBe("layer1_foundation");
    expect(fullBuildUrl.searchParams.get("intentCode")).toBe("implementation_start_layer1");
    expect(fullBuildUrl.searchParams.get("guestSession")).toBe(REHEARSAL_SESSION_TOKEN);

    await Promise.all([
      page.waitForURL(/\/api\/auth\/oauth-signup\?/),
      createAccountLink.click(),
    ]);

    if (!oauthSignupRequestUrl) {
      throw new Error("Expected OAuth signup request to be captured");
    }

    const requestUrl = new URL(oauthSignupRequestUrl);
    expect(requestUrl.searchParams.get("identityClaimToken")).toBe(REHEARSAL_CLAIM_TOKEN);
    expect(requestUrl.searchParams.get("onboardingChannel")).toBe("native_guest");
    expect(requestUrl.searchParams.get("utm_source")).toBe("e2e");
    expect(requestUrl.searchParams.get("utm_medium")).toBe("playwright");

    const requestCallback = requestUrl.searchParams.get("callback");
    if (!requestCallback) {
      throw new Error("Expected callback in OAuth signup request");
    }
    const requestCallbackUrl = new URL(requestCallback);
    expect(requestCallbackUrl.searchParams.get("guestSession")).toBe(REHEARSAL_SESSION_TOKEN);
    expect(requestCallbackUrl.searchParams.get("identityClaimToken")).toBe(REHEARSAL_CLAIM_TOKEN);

    finalizeShellNavigationRetries(navigationTracker, testInfo);
  });
});
