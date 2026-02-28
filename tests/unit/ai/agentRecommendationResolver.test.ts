import { describe, expect, it } from "vitest";
import {
  AGENT_RECOMMENDER_COMPATIBILITY_FLAG_ALIASES,
  AGENT_STORE_COMPATIBILITY_FLAG_ALIASES,
  resolveAgentRecommendations,
  resolveCompatibilityFlagDecision,
  type AgentRecommendationCatalogEntryInput,
  type AgentRecommendationMetadata,
  type AgentRecommendationToolRequirementInput,
} from "../../../convex/ai/agentRecommendationResolver";

function buildMetadata(overrides: Partial<AgentRecommendationMetadata> = {}): AgentRecommendationMetadata {
  return {
    schemaVersion: "agp_recommender_v1",
    source: "manual",
    rankHint: 0,
    gapPenaltyMultiplier: 1,
    defaultActivationState: "suggest_activation",
    ...overrides,
  };
}

function buildEntry(
  catalogAgentNumber: number,
  overrides: Partial<AgentRecommendationCatalogEntryInput> = {},
): AgentRecommendationCatalogEntryInput {
  return {
    catalogAgentNumber,
    name: `Agent ${catalogAgentNumber}`,
    category: "health",
    subtype: "booking_agent",
    toolProfile: "health",
    tier: "Foundation",
    intentTags: ["book_appointment"],
    keywordAliases: ["book", "appointment"],
    recommendationMetadata: buildMetadata(),
    requiredIntegrations: ["google_calendar"],
    specialistAccessModes: ["invisible", "direct"],
    runtimeStatus: "live",
    blockers: [],
    ...overrides,
  };
}

function buildToolRequirement(
  catalogAgentNumber: number,
  overrides: Partial<AgentRecommendationToolRequirementInput> = {},
): AgentRecommendationToolRequirementInput {
  return {
    catalogAgentNumber,
    toolName: "schedule_callback",
    requirementLevel: "required",
    implementationStatus: "implemented",
    source: "registry",
    ...overrides,
  };
}

describe("agent recommendation resolver", () => {
  it("resolves compatibility flags as default-off when no alias is enabled", () => {
    const decision = resolveCompatibilityFlagDecision({
      aliases: AGENT_STORE_COMPATIBILITY_FLAG_ALIASES,
      env: {},
    });
    expect(decision).toEqual({
      enabled: false,
      flagKey: "AGENT_STORE_COMPATIBILITY_ENABLED",
      matchedAlias: null,
      defaultState: "off",
    });
  });

  it("accepts alias compatibility flags when enabled", () => {
    const decision = resolveCompatibilityFlagDecision({
      aliases: AGENT_RECOMMENDER_COMPATIBILITY_FLAG_ALIASES,
      env: {
        AGENT_MARKETPLACE_COMPATIBILITY_ENABLED: "true",
      },
    });
    expect(decision).toEqual({
      enabled: true,
      flagKey: "AGENT_RECOMMENDER_COMPATIBILITY_ENABLED",
      matchedAlias: "AGENT_MARKETPLACE_COMPATIBILITY_ENABLED",
      defaultState: "off",
    });
  });

  it("uses deterministic tie-break ordering by lower agent id", () => {
    const resolution = resolveAgentRecommendations({
      queryText: "book appointment",
      requestedAccessMode: "invisible",
      availableIntegrations: ["google_calendar"],
      entries: [
        buildEntry(36),
        buildEntry(35),
      ],
      toolRequirements: [
        buildToolRequirement(35),
        buildToolRequirement(36),
      ],
    });

    expect(resolution.recommendations).toHaveLength(2);
    expect(resolution.recommendations[0].catalogAgentNumber).toBe(35);
    expect(resolution.recommendations[1].catalogAgentNumber).toBe(36);
    expect(resolution.recommendations[0].finalScore).toBe(resolution.recommendations[1].finalScore);
  });

  it("returns gap-first rationale with explicit runtime/integration/tool/access gaps", () => {
    const resolution = resolveAgentRecommendations({
      queryText: "quote followup",
      requestedAccessMode: "direct",
      availableIntegrations: [],
      entries: [
        buildEntry(77, {
          name: "Quote Follow-Up Agent",
          intentTags: ["document_or_quote_packet", "provider_or_client_outreach"],
          keywordAliases: ["quote", "followup"],
          requiredIntegrations: ["stripe"],
          specialistAccessModes: ["invisible"],
          runtimeStatus: "template_only",
        }),
      ],
      toolRequirements: [
        buildToolRequirement(77, {
          toolName: "generate_quote_or_scope_pdf",
          implementationStatus: "missing",
          source: "proposed_new",
        }),
      ],
    });

    const recommendation = resolution.recommendations[0];
    expect(recommendation.capabilityStatus).toBe("blocked");
    expect(recommendation.activationState).toBe("blocked");
    expect(recommendation.gaps.runtime.length).toBeGreaterThan(0);
    expect(recommendation.gaps.integrations).toEqual(["stripe"]);
    expect(recommendation.gaps.tools).toEqual(["generate_quote_or_scope_pdf"]);
    expect(recommendation.gaps.accessMode.length).toBeGreaterThan(0);

    expect(recommendation.rationale.gapSummary[0]).toContain("Runtime gaps");
    expect(recommendation.rationale.gapSummary[1]).toContain("Integration gaps");
    expect(recommendation.rationale.gapSummary[2]).toContain("Tool gaps");
    expect(recommendation.rationale.gapSummary[3]).toContain("Access-mode gaps");
    expect(recommendation.rationale.activationSuggestion).toContain("blocked");
    expect(recommendation.nextActions).toContain(
      "Complete runtime deployment and set runtime status to live before allowing activation.",
    );
  });

  it("fails closed when prerequisites are unknown and returns explicit unblocking steps", () => {
    const resolution = resolveAgentRecommendations({
      queryText: "book appointment",
      requestedAccessMode: "direct",
      availableIntegrations: [],
      entries: [
        buildEntry(90, {
          runtimeStatus: "unknown",
          specialistAccessModes: [],
          requiredIntegrations: ["unknown"],
        }),
      ],
      toolRequirements: [
        buildToolRequirement(90, {
          implementationStatus: "tbd",
        }),
      ],
    });

    const recommendation = resolution.recommendations[0];
    expect(recommendation.capabilityStatus).toBe("blocked");
    expect(recommendation.activationState).toBe("blocked");
    expect(recommendation.gaps.prerequisites.length).toBeGreaterThan(0);
    expect(
      recommendation.rationale.gapSummary[recommendation.rationale.gapSummary.length - 1],
    ).toContain("Unknown prerequisites");
    expect(recommendation.nextActions).toContain(
      "Resolve unknown prerequisites by replacing placeholder values with concrete runtime, tool, access-mode, and integration requirements.",
    );
  });

  it("marks recommendation as available_now only when all deterministic prerequisites are satisfied", () => {
    const resolution = resolveAgentRecommendations({
      queryText: "book appointment",
      requestedAccessMode: "invisible",
      availableIntegrations: ["google_calendar"],
      entries: [buildEntry(35)],
      toolRequirements: [buildToolRequirement(35)],
    });

    const recommendation = resolution.recommendations[0];
    expect(recommendation.capabilityStatus).toBe("available_now");
    expect(recommendation.activationState).toBe("suggest_activation");
    expect(recommendation.gaps).toEqual({
      runtime: [],
      integrations: [],
      tools: [],
      accessMode: [],
      prerequisites: [],
    });
  });

  it("applies metadata rank hints without creating parallel scoring semantics", () => {
    const resolution = resolveAgentRecommendations({
      queryText: "book appointment",
      requestedAccessMode: "invisible",
      availableIntegrations: ["google_calendar"],
      entries: [
        buildEntry(11, {
          runtimeStatus: "template_only",
          recommendationMetadata: buildMetadata({ rankHint: 0 }),
        }),
        buildEntry(12, {
          runtimeStatus: "template_only",
          recommendationMetadata: buildMetadata({ rankHint: 0.1 }),
        }),
      ],
      toolRequirements: [
        buildToolRequirement(11),
        buildToolRequirement(12),
      ],
    });

    expect(resolution.recommendations[0].catalogAgentNumber).toBe(12);
    expect(resolution.recommendations[0].finalScore).toBeGreaterThan(
      resolution.recommendations[1].finalScore,
    );
  });
});
