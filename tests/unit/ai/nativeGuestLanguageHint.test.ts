import { describe, expect, it } from "vitest";
import { resolveNativeGuestLanguageHint } from "../../../src/hooks/use-ai-chat";

describe("resolveNativeGuestLanguageHint", () => {
  it("prefers an explicit locale when supported", () => {
    expect(
      resolveNativeGuestLanguageHint({
        preferredLocale: "de-DE",
        browserLanguages: ["en-US"],
      })
    ).toEqual({
      language: "de",
      locale: "de-DE",
    });
  });

  it("falls back to browser language priority order", () => {
    expect(
      resolveNativeGuestLanguageHint({
        browserLanguages: ["pt-BR", "fr-FR", "en-US"],
      })
    ).toEqual({
      language: "fr",
      locale: "fr-FR",
    });
  });

  it("falls back to english when no supported language exists", () => {
    expect(
      resolveNativeGuestLanguageHint({
        browserLanguages: ["pt-BR", "it-IT"],
      })
    ).toEqual({
      language: "en",
      locale: "en",
    });
  });
});
