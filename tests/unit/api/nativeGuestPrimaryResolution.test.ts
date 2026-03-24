import { describe, expect, it } from "vitest";
import {
  resolvePreferredNativeGuestLocale,
  resolvePrimaryAwareNativeGuestAgentId,
} from "../../../src/app/api/native-guest/config/route";

describe("resolvePrimaryAwareNativeGuestAgentId", () => {
  it("prefers the primary agent that has native_guest channel binding enabled", () => {
    const resolvedId = resolvePrimaryAwareNativeGuestAgentId([
      {
        _id: "agent-primary-a",
        customProperties: {
          isPrimary: true,
        },
      },
      {
        _id: "agent-primary-b",
        customProperties: {
          isPrimary: true,
          channelBindings: [{ channel: "native_guest", enabled: true }],
        },
      },
    ]);

    expect(resolvedId).toBe("agent-primary-b");
  });

  it("falls back to deterministic primary ordering when no native_guest binding is configured", () => {
    const resolvedId = resolvePrimaryAwareNativeGuestAgentId([
      {
        _id: "agent-primary-z",
        customProperties: { isPrimary: true },
      },
      {
        _id: "agent-primary-a",
        customProperties: { isPrimary: true },
      },
    ]);

    expect(resolvedId).toBe("agent-primary-a");
  });

  it("returns null when there is no primary candidate", () => {
    const resolvedId = resolvePrimaryAwareNativeGuestAgentId([
      {
        _id: "agent-general",
        customProperties: { isPrimary: false },
      },
    ]);

    expect(resolvedId).toBeNull();
  });
});

describe("resolvePreferredNativeGuestLocale", () => {
  it("prefers explicit locale hints", () => {
    expect(
      resolvePreferredNativeGuestLocale({
        explicitLocale: "de-DE",
        acceptLanguageHeader: "en-US,en;q=0.9",
      })
    ).toBe("de");
  });

  it("falls back to Accept-Language header when explicit locale is missing", () => {
    expect(
      resolvePreferredNativeGuestLocale({
        acceptLanguageHeader: "fr-FR,fr;q=0.9,en;q=0.8",
      })
    ).toBe("fr");
  });

  it("falls back to english when no supported locale is available", () => {
    expect(
      resolvePreferredNativeGuestLocale({
        acceptLanguageHeader: "pt-BR,pt;q=0.9",
      })
    ).toBe("en");
  });
});
