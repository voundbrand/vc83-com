import { describe, expect, it } from "vitest";
import {
  buildVoiceConversationStarterText as buildWebVoiceConversationStarterText,
  buildVoicePreviewSampleText as buildWebVoicePreviewSampleText,
  isVoiceCompatibleWithLanguage as isWebVoiceCompatibleWithLanguage,
} from "@/lib/voice/catalog-language";
import {
  buildVoiceConversationStarterText as buildMobileVoiceConversationStarterText,
  buildVoicePreviewSampleText as buildMobileVoicePreviewSampleText,
  isVoiceCompatibleWithLanguage as isMobileVoiceCompatibleWithLanguage,
} from "../../../apps/operator-mobile/src/lib/voice/catalogLanguage";

describe("voice language compatibility", () => {
  const compatibleFns = [
    ["web", isWebVoiceCompatibleWithLanguage] as const,
    ["mobile", isMobileVoiceCompatibleWithLanguage] as const,
  ];
  const previewFns = [
    ["web", buildWebVoicePreviewSampleText] as const,
    ["mobile", buildMobileVoicePreviewSampleText] as const,
  ];
  const conversationStarterFns = [
    ["web", buildWebVoiceConversationStarterText] as const,
    ["mobile", buildMobileVoiceConversationStarterText] as const,
  ];

  it.each(compatibleFns)(
    "%s: treats unlabeled voices as English defaults",
    (_name, isCompatible) => {
      const unlabeledVoice = { labels: {} };
      expect(isCompatible(unlabeledVoice, "en")).toBe(true);
      expect(isCompatible(unlabeledVoice, "de")).toBe(false);
      expect(isCompatible(unlabeledVoice, "es")).toBe(false);
    },
  );

  it.each(compatibleFns)(
    "%s: respects explicit language metadata when present",
    (_name, isCompatible) => {
      const englishVoice = { language: "English", labels: {} };
      const germanVoice = { language: "de", labels: {} };
      const multilingualVoice = { languages: ["en", "de"], labels: {} };

      expect(isCompatible(englishVoice, "en")).toBe(true);
      expect(isCompatible(englishVoice, "de")).toBe(false);
      expect(isCompatible(germanVoice, "de")).toBe(true);
      expect(isCompatible(multilingualVoice, "de")).toBe(true);
      expect(isCompatible(multilingualVoice, "fr")).toBe(false);
    },
  );

  it.each(compatibleFns)(
    "%s: remains permissive when no language filter is set",
    (_name, isCompatible) => {
      const unlabeledVoice = { labels: {} };
      expect(isCompatible(unlabeledVoice, undefined)).toBe(true);
      expect(isCompatible(unlabeledVoice, null)).toBe(true);
      expect(isCompatible(unlabeledVoice, "")).toBe(true);
    },
  );

  it.each(previewFns)(
    "%s: builds preview text in selected language when available",
    (_name, buildPreviewText) => {
      expect(buildPreviewText("de", "Mila")).toContain("Hallo");
      expect(buildPreviewText("es", "Mila")).toContain("Hola");
    },
  );

  it.each(previewFns)(
    "%s: falls back to English preview text when language is unknown",
    (_name, buildPreviewText) => {
      expect(buildPreviewText("xx", "Mila")).toContain("Hello");
    },
  );

  it.each(previewFns)(
    "%s: uses greeting-only preview text when no voice name is provided",
    (_name, buildPreviewText) => {
      expect(buildPreviewText("de", undefined)).toBe("Hallo.");
      expect(buildPreviewText("en", null)).toBe("Hello.");
    },
  );

  it.each(conversationStarterFns)(
    "%s: builds starter greeting with user first name when available",
    (_name, buildStarterText) => {
      expect(buildStarterText("de", "Mila")).toBe("Hallo, Mila.");
      expect(buildStarterText("en", "Alex")).toBe("Hello, Alex.");
    },
  );

  it.each(conversationStarterFns)(
    "%s: falls back to greeting-only starter when user first name missing",
    (_name, buildStarterText) => {
      expect(buildStarterText("de", undefined)).toBe("Hallo.");
      expect(buildStarterText("en", "")).toBe("Hello.");
    },
  );
});
