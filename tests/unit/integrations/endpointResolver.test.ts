import { describe, expect, it } from "vitest";
import {
  normalizeIntegrationBaseUrl,
  resolveIntegrationEndpoints,
  toConvexSiteBaseUrl,
} from "../../../convex/integrations/endpointResolver";

describe("integration endpoint resolver", () => {
  it("normalizes public base URLs", () => {
    expect(normalizeIntegrationBaseUrl("app.l4yercak3.com")).toBe(
      "https://app.l4yercak3.com"
    );
    expect(normalizeIntegrationBaseUrl(" https://app.l4yercak3.com/ ")).toBe(
      "https://app.l4yercak3.com"
    );
    expect(normalizeIntegrationBaseUrl("")).toBeUndefined();
  });

  it("converts convex cloud URLs to convex site URLs", () => {
    expect(
      toConvexSiteBaseUrl("https://agreeable-lion-828.convex.cloud")
    ).toBe("https://agreeable-lion-828.convex.site");
  });

  it("resolves unified slack endpoints", () => {
    const endpoints = resolveIntegrationEndpoints({
      provider: "slack",
      apiBaseUrl: "https://app.l4yercak3.com",
      ingressBaseUrl: "https://api.l4yercak3.com",
    });

    expect(endpoints).toEqual({
      oauthCallbackUrl: "https://app.l4yercak3.com/integrations/slack/oauth/callback",
      eventsUrl: "https://api.l4yercak3.com/integrations/slack/events",
      commandsUrl: "https://api.l4yercak3.com/integrations/slack/commands",
      interactivityUrl: "https://api.l4yercak3.com/integrations/slack/interactivity",
    });
  });

  it("throws on unsupported providers", () => {
    expect(() =>
      resolveIntegrationEndpoints({
        provider: "google",
        apiBaseUrl: "https://app.l4yercak3.com",
      })
    ).toThrow("Unsupported integration provider: google");
  });
});

