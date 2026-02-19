import { describe, expect, it } from "vitest";
import {
  credentialFieldRequiresDecryption,
  providerSupportsChannel,
  shouldAllowPlatformCredentialFallback,
  validateCredentialBoundary,
} from "../../../convex/channels/router";
import {
  getAllProviders,
  getProvider,
  getProviderConformanceIssues,
} from "../../../convex/channels/registry";
import type { ProviderCredentials } from "../../../convex/channels/types";

describe("channel router credential boundaries", () => {
  it("decrypts only oauth-sourced encrypted credential fields", () => {
    const oauthCredentials: ProviderCredentials = {
      providerId: "slack",
      credentialSource: "oauth_connection",
      encryptedFields: ["slackBotToken"],
      slackBotToken: "encrypted-token",
    };
    const envFallbackCredentials: ProviderCredentials = {
      providerId: "slack",
      credentialSource: "env_fallback",
      slackBotToken: "xoxb-live-token",
    };

    expect(
      credentialFieldRequiresDecryption(oauthCredentials, "slackBotToken")
    ).toBe(true);
    expect(
      credentialFieldRequiresDecryption(
        oauthCredentials,
        "whatsappAccessToken"
      )
    ).toBe(false);
    expect(
      credentialFieldRequiresDecryption(
        envFallbackCredentials,
        "slackBotToken"
      )
    ).toBe(false);
  });

  it("gates sends when provider capabilities do not include the channel", () => {
    const infobipProvider = getProvider("infobip");
    expect(infobipProvider).not.toBeNull();

    expect(providerSupportsChannel(infobipProvider!, "sms")).toBe(true);
    expect(providerSupportsChannel(infobipProvider!, "whatsapp")).toBe(false);
  });

  it("keeps built-in provider registrations conformance-clean", () => {
    for (const provider of getAllProviders()) {
      expect(getProviderConformanceIssues(provider)).toEqual([]);
    }
  });

  it("requires explicit platform fallback opt-in for bound routes", () => {
    expect(
      shouldAllowPlatformCredentialFallback({
        hasBinding: true,
        providerId: "slack",
        bindingProfileType: "platform",
        bindingAllowPlatformFallback: false,
      })
    ).toBe(false);

    expect(
      shouldAllowPlatformCredentialFallback({
        hasBinding: true,
        providerId: "slack",
        bindingProfileType: "platform",
        bindingAllowPlatformFallback: true,
      })
    ).toBe(true);
  });

  it("keeps unbound platform fallback explicit for platform-owned channels", () => {
    expect(
      shouldAllowPlatformCredentialFallback({
        hasBinding: false,
        providerId: "infobip",
      })
    ).toBe(true);

    expect(
      shouldAllowPlatformCredentialFallback({
        hasBinding: false,
        providerId: "telegram",
      })
    ).toBe(true);

    expect(
      shouldAllowPlatformCredentialFallback({
        hasBinding: false,
        providerId: "slack",
        slackTokenPolicy: "oauth_connection_only",
      })
    ).toBe(false);

    expect(
      shouldAllowPlatformCredentialFallback({
        hasBinding: false,
        providerId: "slack",
        slackTokenPolicy: "oauth_or_env_fallback",
      })
    ).toBe(true);
  });

  it("rejects organization binding from resolving to platform credential fallbacks", () => {
    const boundary = validateCredentialBoundary({
      binding: {
        providerProfileType: "organization",
        providerInstallationId: "team-a",
        routeKey: "slack:team-a",
      },
      credentials: {
        providerId: "slack",
        credentialSource: "env_fallback",
        providerProfileType: "platform",
        providerInstallationId: "team-a",
        bindingRouteKey: "slack:team-a",
      },
    });

    expect(boundary.ok).toBe(false);
    expect(boundary.reason).toContain("platform");
  });

  it("rejects installation mismatch between binding identity and resolved credentials", () => {
    const boundary = validateCredentialBoundary({
      binding: {
        providerProfileType: "organization",
        providerInstallationId: "team-a",
      },
      credentials: {
        providerId: "slack",
        credentialSource: "oauth_connection",
        providerProfileType: "organization",
        providerInstallationId: "team-b",
      },
    });

    expect(boundary.ok).toBe(false);
    expect(boundary.reason).toContain("providerInstallationId");
  });

  it("rejects provider connection mismatch between binding and credentials", () => {
    const boundary = validateCredentialBoundary({
      binding: {
        providerProfileType: "organization",
        providerConnectionId: "oauth_1",
      },
      credentials: {
        providerId: "slack",
        credentialSource: "oauth_connection",
        providerProfileType: "organization",
        providerConnectionId: "oauth_2",
      },
    });

    expect(boundary.ok).toBe(false);
    expect(boundary.reason).toContain("providerConnectionId");
  });

  it("rejects route key mismatch between binding and credentials", () => {
    const boundary = validateCredentialBoundary({
      binding: {
        providerProfileType: "organization",
        routeKey: "slack:team-a",
      },
      credentials: {
        providerId: "slack",
        credentialSource: "oauth_connection",
        providerProfileType: "organization",
        bindingRouteKey: "slack:team-b",
      },
    });

    expect(boundary.ok).toBe(false);
    expect(boundary.reason).toContain("routeKey");
  });
});
