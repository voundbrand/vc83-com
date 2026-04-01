/* @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: () => async () => undefined,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ sessionId: null }),
}));

import { CookieConsentBanner } from "../../../src/components/cookie-consent-banner";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  getStoredCookieConsent,
  getStoredCookieConsentSnapshot,
  isAnalyticsConsentGranted,
  revokeCookieConsent,
  setCookieConsent,
} from "../../../src/lib/cookie-consent";
import {
  captureShellTelemetry,
  usePostHog,
} from "../../../src/components/providers/posthog-provider";

describe("GDPR consent runtime", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to fail-closed with no consent and no active analytics client", () => {
    expect(getStoredCookieConsent()).toBeNull();
    expect(isAnalyticsConsentGranted()).toBe(false);
    expect(usePostHog()).toBeNull();

    expect(() =>
      captureShellTelemetry("shell_window_opened", { source: "test" }),
    ).not.toThrow();
  });

  it("stores explicit accept and marks analytics consent as granted", () => {
    render(React.createElement(CookieConsentBanner));

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    expect(raw).toBeTruthy();

    const snapshot = getStoredCookieConsentSnapshot();
    expect(snapshot?.decision).toBe("accepted");
    expect(snapshot?.policyVersion).toBeTruthy();
    expect(isAnalyticsConsentGranted()).toBe(true);
  });

  it("stores reject and revoke decisions as analytics-disabled", () => {
    setCookieConsent("accepted", "test-version");
    expect(isAnalyticsConsentGranted()).toBe(true);

    revokeCookieConsent("test-version");
    expect(getStoredCookieConsent()).toBe("declined");
    expect(isAnalyticsConsentGranted()).toBe(false);
  });

  it("mounts cookie consent banner in global providers path", () => {
    const providersPath = path.resolve(process.cwd(), "src/app/providers.tsx");
    const providersSource = readFileSync(providersPath, "utf8");
    expect(providersSource).toContain("CookieConsentBanner");
    expect(providersSource).toContain("<CookieConsentBanner />");
  });
});
