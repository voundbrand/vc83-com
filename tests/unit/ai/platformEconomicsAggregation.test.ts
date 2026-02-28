import { describe, expect, it } from "vitest";
import { aggregatePlatformEconomics } from "../../../convex/ai/billing";

describe("platform economics aggregation", () => {
  it("separates platform spend from BYOK/private usage and computes margin", () => {
    const summary = aggregatePlatformEconomics({
      startTs: 1,
      endTs: 3_600_001,
      records: [
        {
          organizationId: "org_platform",
          provider: "openrouter",
          model: "openai/gpt-4o",
          requestType: "chat",
          action: "chat_completion",
          requestCount: 2,
          billingSource: "platform",
          creditsCharged: 300,
          nativeCostInCents: 180,
        },
        {
          organizationId: "org_platform",
          provider: "elevenlabs",
          model: "elevenlabs_voice_runtime",
          requestType: "voice_tts",
          action: "voice_synthesis",
          requestCount: 1,
          billingSource: "platform",
          creditsCharged: 60,
          nativeCostInCents: 30,
        },
        {
          organizationId: "org_byok",
          provider: "openai",
          model: "gpt-4.1",
          requestType: "chat",
          action: "agent_completion",
          requestCount: 4,
          billingSource: "byok",
          creditsCharged: 0,
          nativeCostInCents: 120,
        },
        {
          organizationId: "org_private",
          provider: "browser",
          model: "local_voice",
          requestType: "voice_stt",
          action: "voice_transcription",
          requestCount: 1,
          billingSource: "private",
          creditsCharged: 0,
          nativeCostInCents: 0,
        },
      ],
      organizationNamesById: {
        org_platform: "Platform Organization",
        org_byok: "BYOK Organization",
        org_private: "Private Runtime",
      },
      platformOrganizationId: "org_platform",
    });

    expect(summary.totals.allUsageRequests).toBe(8);
    expect(summary.totals.allUsageNativeCostInCents).toBe(330);

    expect(summary.totals.platformRequests).toBe(3);
    expect(summary.totals.byokRequests).toBe(4);
    expect(summary.totals.privateRequests).toBe(1);
    expect(summary.totals.platformNativeCostInCents).toBe(210);
    expect(summary.totals.platformCreditsCharged).toBe(360);
    expect(summary.totals.platformCreditRevenueInCents).toBe(360);
    expect(summary.totals.platformGrossMarginInCents).toBe(150);
    expect(summary.totals.platformGrossMarginPct).toBe(41.67);

    const byokProvider = summary.providerBreakdown.find((row) => row.provider === "openai");
    expect(byokProvider?.platformNativeCostInCents).toBe(0);
    expect(byokProvider?.byokRequests).toBe(4);
  });

  it("returns a zeroed platform organization row when no records exist", () => {
    const summary = aggregatePlatformEconomics({
      startTs: 1,
      endTs: 2,
      records: [],
      organizationNamesById: {
        org_platform: "System Platform",
      },
      platformOrganizationId: "org_platform",
    });

    expect(summary.platformOrganization).not.toBeNull();
    expect(summary.platformOrganization?.organizationId).toBe("org_platform");
    expect(summary.platformOrganization?.platformRequests).toBe(0);
    expect(summary.platformOrganization?.platformNativeCostInCents).toBe(0);
  });

  it("keeps BYOK/private usage visible in analytics while platform margin uses platform-only spend", () => {
    const summary = aggregatePlatformEconomics({
      startTs: 1,
      endTs: 7_200_001,
      records: [
        {
          organizationId: "org_platform",
          provider: "v0",
          model: "v0-chat",
          requestType: "completion",
          action: "v0_template_generation",
          requestCount: 1,
          billingSource: "platform",
          creditsCharged: 120,
          nativeCostInCents: 40,
        },
        {
          organizationId: "org_byok",
          provider: "v0",
          model: "v0-chat",
          requestType: "completion",
          action: "v0_followup_generation",
          requestCount: 2,
          billingSource: "byok",
          creditsCharged: 0,
          nativeCostInCents: 90,
        },
        {
          organizationId: "org_private",
          provider: "v0",
          model: "v0-chat",
          requestType: "completion",
          action: "v0_chat_fetch",
          requestCount: 1,
          billingSource: "private",
          creditsCharged: 0,
          nativeCostInCents: 20,
        },
      ],
      organizationNamesById: {
        org_platform: "Platform Organization",
        org_byok: "BYOK Organization",
        org_private: "Private Organization",
      },
      platformOrganizationId: "org_platform",
    });

    expect(summary.totals.allUsageRequests).toBe(4);
    expect(summary.totals.platformRequests).toBe(1);
    expect(summary.totals.byokRequests).toBe(2);
    expect(summary.totals.privateRequests).toBe(1);
    expect(summary.totals.allUsageNativeCostInCents).toBe(150);
    expect(summary.totals.platformNativeCostInCents).toBe(40);
    expect(summary.totals.platformCreditsCharged).toBe(120);
    expect(summary.totals.platformGrossMarginInCents).toBe(
      summary.totals.platformCreditRevenueInCents - 40,
    );

    const v0Provider = summary.providerBreakdown.find((row) => row.provider === "v0");
    expect(v0Provider?.requests).toBe(4);
    expect(v0Provider?.platformRequests).toBe(1);
    expect(v0Provider?.byokRequests).toBe(2);
    expect(v0Provider?.privateRequests).toBe(1);
    expect(v0Provider?.nativeCostInCents).toBe(150);
    expect(v0Provider?.platformNativeCostInCents).toBe(40);

    const followupAction = summary.actionBreakdown.find(
      (row) => row.action === "v0_followup_generation",
    );
    expect(followupAction?.requests).toBe(2);
    expect(followupAction?.platformRequests).toBe(0);
    expect(followupAction?.byokRequests).toBe(2);
    expect(followupAction?.privateRequests).toBe(0);
    expect(followupAction?.nativeCostInCents).toBe(90);
    expect(followupAction?.platformNativeCostInCents).toBe(0);

    const chatFetchAction = summary.actionBreakdown.find(
      (row) => row.action === "v0_chat_fetch",
    );
    expect(chatFetchAction?.requests).toBe(1);
    expect(chatFetchAction?.platformRequests).toBe(0);
    expect(chatFetchAction?.byokRequests).toBe(0);
    expect(chatFetchAction?.privateRequests).toBe(1);
    expect(chatFetchAction?.nativeCostInCents).toBe(20);
    expect(chatFetchAction?.platformNativeCostInCents).toBe(0);

    const v0Model = summary.modelBreakdown.find(
      (row) => row.provider === "v0" && row.model === "v0-chat",
    );
    expect(v0Model?.requests).toBe(4);
    expect(v0Model?.platformRequests).toBe(1);
    expect(v0Model?.byokRequests).toBe(2);
    expect(v0Model?.privateRequests).toBe(1);
    expect(v0Model?.nativeCostInCents).toBe(150);
    expect(v0Model?.platformNativeCostInCents).toBe(40);
  });

  it("tracks cost-quality percentages for provider-reported vs estimated-model pricing", () => {
    const summary = aggregatePlatformEconomics({
      startTs: 1,
      endTs: 10,
      records: [
        {
          organizationId: "org_platform",
          provider: "openrouter",
          model: "openai/gpt-4.1-mini",
          requestType: "chat",
          requestCount: 1,
          billingSource: "platform",
          nativeCostInCents: 100,
          nativeCostSource: "provider_reported",
        },
        {
          organizationId: "org_platform",
          provider: "openrouter",
          model: "openai/gpt-4.1-mini",
          requestType: "chat",
          requestCount: 1,
          billingSource: "platform",
          nativeCostInCents: 50,
          nativeCostSource: "estimated_model_pricing",
        },
        {
          organizationId: "org_byok",
          provider: "openrouter",
          model: "openai/gpt-4.1-mini",
          requestType: "chat",
          requestCount: 2,
          billingSource: "byok",
          nativeCostInCents: 40,
          nativeCostSource: "provider_reported",
        },
      ],
    });

    expect(summary.costQuality.providerReportedRequestPct).toBe(75);
    expect(summary.costQuality.estimatedModelPricingRequestPct).toBe(25);
    expect(summary.costQuality.providerReportedPlatformCostPct).toBe(66.67);
    expect(summary.costQuality.estimatedModelPricingPlatformCostPct).toBe(33.33);

    const providerReportedSource = summary.costQuality.sourceBreakdown.find(
      (row) => row.source === "provider_reported"
    );
    expect(providerReportedSource?.platformRequests).toBe(1);
    expect(providerReportedSource?.platformCostPct).toBe(66.67);
  });
});
