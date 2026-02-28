import { describe, expect, it } from "vitest";
import {
  composeMidwifeHybridProfile,
} from "../../../convex/ai/midwifeCatalogComposer";
import { attachSoulV2Overlay } from "../../../convex/ai/soulGenerator";

describe("midwife hybrid catalog composer", () => {
  it("persists hybrid composition provenance into soul overlay metadata", () => {
    const composition = composeMidwifeHybridProfile({
      interviewExtractedData: {
        identityNorthStar: "Protect customer trust.",
        voiceSignature: "Calm and direct.",
      },
      immutableAnchorFieldIds: ["identityNorthStar"],
      composedAt: 1_740_000_000_000,
      candidates: [
        {
          datasetVersion: "agp_v1",
          catalogAgentNumber: 42,
          name: "Trust Operator",
          seedCoverage: "full",
          requiresSoulBuild: false,
          protectedTemplate: true,
          requiredTools: ["crm_lookup", "schedule_follow_up"],
          soulProfile: {
            name: "Trust Operator",
          },
          executionOverlay: {
            communicationStyle: "Calm, highly structured, and explicit.",
            alwaysDo: ["Confirm next steps"],
            enabledTools: ["crm_lookup"],
          },
        },
      ],
    });

    const soul = attachSoulV2Overlay({
      soul: {
        name: "Iris",
        tagline: "Interview-born identity",
      },
      generatedAt: 1_740_000_000_100,
      identityOrigin: {
        immutableOrigin: "interview",
        interviewSessionId: "session_42",
        interviewTemplateId: "template_9",
      },
      hybridComposition: {
        overlay: composition.boundedOverlay,
        provenance: composition.provenance,
      },
    });

    const provenance = (soul.soulV2 as any)?.hybridCompositionProvenance;
    expect(provenance?.contractVersion).toBe("midwife_hybrid_composition.v1");
    expect(provenance?.selectedCatalogAgentNumbers).toEqual([42]);
    expect(provenance?.selectedInputCount).toBeGreaterThan(1);
  });

  it("preserves immutable interview identity anchors while applying bounded overlays", () => {
    const soul = attachSoulV2Overlay({
      soul: {
        name: "Interview Quinn",
        tagline: "Born from interview anchors",
      },
      generatedAt: 1_740_000_010_000,
      identityOrigin: {
        immutableOrigin: "interview",
        interviewSessionId: "session_anchor",
        interviewTemplateId: "template_anchor",
      },
      hybridComposition: {
        overlay: {
          name: "Catalog Override Name",
          tagline: "Catalog Override Tagline",
          communicationStyle: "Warm and concise.",
          alwaysDo: ["Recap decisions"],
        },
      },
    });

    expect(soul.name).toBe("Interview Quinn");
    expect(soul.tagline).toBe("Born from interview anchors");
    expect((soul.soulV2 as any)?.identityAnchors?.name).toBe("Interview Quinn");
    expect((soul.soulV2 as any)?.executionPreferences?.communicationStyle).toBe("Warm and concise.");
    expect((soul.soulV2 as any)?.executionPreferences?.alwaysDo).toEqual(["Recap decisions"]);
  });

  it("falls back gracefully when no AGP seed coverage is available", () => {
    const composition = composeMidwifeHybridProfile({
      interviewExtractedData: {
        voiceSignature: "Precise and empathetic.",
        nonNegotiableGuardrails: ["Never fabricate legal claims"],
      },
      immutableAnchorFieldIds: ["voiceSignature"],
      composedAt: 1_740_000_020_000,
      candidates: [],
    });

    expect(composition.provenance.fallbackApplied).toBe(true);
    expect(composition.provenance.selectedCatalogAgentNumbers).toEqual([]);
    expect(composition.provenance.missingCoverageAreas).toContain("seed_catalog_unavailable");
    expect(composition.provenance.inputs.some((input) => input.inputType === "generated_fallback_overlay")).toBe(true);
    expect(composition.boundedOverlay.communicationStyle).toBe("Precise and empathetic.");
  });
});
