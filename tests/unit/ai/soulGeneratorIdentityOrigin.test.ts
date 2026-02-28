import { describe, expect, it } from "vitest";
import { attachSoulV2Overlay } from "../../../convex/ai/soulGenerator";

describe("soul generator identity origin metadata", () => {
  it("defaults immutableOrigin to generated when no interview metadata is provided", () => {
    const soul = attachSoulV2Overlay({
      soul: {
        name: "Quinn",
        traits: ["calm", "direct"],
      },
      generatedAt: 1_740_000_000_000,
    });

    const identityAnchors = (soul.soulV2 as any)?.identityAnchors;
    expect((soul.soulV2 as any)?.schemaVersion).toBe(3);
    expect(identityAnchors?.immutableOrigin).toBe("generated");
    expect(identityAnchors?.interviewSessionId).toBeUndefined();
  });

  it("persists interview-origin anchors and first-words handshake linkage", () => {
    const soul = attachSoulV2Overlay({
      soul: {
        name: "Mika",
        tagline: "Your operator mirror",
        coreValues: ["Trust", "Clarity"],
      },
      generatedAt: 1_740_000_100_000,
      identityOrigin: {
        immutableOrigin: "interview",
        interviewSessionId: "session_abc",
        interviewTemplateId: "template_xyz",
        firstWordsHandshakeId: "first_words:session_abc:1740000100000",
      },
    });

    const identityAnchors = (soul.soulV2 as any)?.identityAnchors;
    expect(identityAnchors?.immutableOrigin).toBe("interview");
    expect(identityAnchors?.interviewSessionId).toBe("session_abc");
    expect(identityAnchors?.interviewTemplateId).toBe("template_xyz");
    expect(identityAnchors?.firstWordsHandshakeId).toContain("first_words:");
  });
});
