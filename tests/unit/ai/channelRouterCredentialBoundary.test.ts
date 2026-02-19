import { describe, expect, it } from "vitest";
import {
  credentialFieldRequiresDecryption,
  providerSupportsChannel,
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
});
