import { describe, expect, it } from "vitest";
import { buildCommercialMetadata } from "../../../convex/stripe/platformCheckout";
import {
  extractCommercialMetadataEnvelope,
  extractFunnelCampaign,
} from "../../../convex/stripe/platformWebhooks";

describe("commercial metadata envelope continuity", () => {
  it("keeps canonical commercial + campaign keys populated for checkout metadata", () => {
    const metadata = buildCommercialMetadata({
      offerCode: "layer1_foundation",
      intentCode: "implementation_start_layer1",
      surface: "store",
      routingHint: "founder_bridge",
      funnelChannel: "platform_web",
      funnelCampaign: {
        source: "google",
        medium: "cpc",
        campaign: "spring_launch",
        content: "hero",
        term: "implementation agency",
        referrer: "https://example.com/launch",
        landingPath: "/commercial",
      },
    });

    expect(metadata.offer_code).toBe("layer1_foundation");
    expect(metadata.intent_code).toBe("implementation_start_layer1");
    expect(metadata.surface).toBe("store");
    expect(metadata.routing_hint).toBe("founder_bridge");
    expect(metadata.source).toBe("google");
    expect(metadata.medium).toBe("cpc");
    expect(metadata.campaign).toBe("spring_launch");
    expect(metadata.content).toBe("hero");
    expect(metadata.term).toBe("implementation agency");
    expect(metadata.referrer).toBe("https://example.com/launch");
    expect(metadata.landingPath).toBe("/commercial");
  });

  it("extracts canonical commercial envelope from either canonical or compatibility aliases", () => {
    const parsed = extractCommercialMetadataEnvelope({
      offerCode: "consult_done_with_you",
      intentCode: "consulting_sprint_scope_only",
      surface: "one_of_one_landing",
      routingHint: "samantha_lead_capture",
      catalogVersion: "2026_03_01",
    });

    expect(parsed).toEqual({
      offerCode: "consult_done_with_you",
      intentCode: "consulting_sprint_scope_only",
      surface: "one_of_one_landing",
      routingHint: "samantha_lead_capture",
      catalogVersion: "2026_03_01",
    });
  });

  it("extracts campaign envelope from either canonical or compatibility aliases", () => {
    const parsed = extractFunnelCampaign({
      utm_source: "newsletter",
      utmMedium: "email",
      utm_campaign: "q2_rollout",
      utmContent: "footer_cta",
      utm_term: "commercial_intake",
      funnelReferrer: "https://example.com/articles/42",
      funnelLandingPath: "/article/42",
    });

    expect(parsed).toEqual({
      source: "newsletter",
      medium: "email",
      campaign: "q2_rollout",
      content: "footer_cta",
      term: "commercial_intake",
      referrer: "https://example.com/articles/42",
      landingPath: "/article/42",
    });
  });
});
