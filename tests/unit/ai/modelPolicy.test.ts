import { describe, expect, it } from "vitest";
import {
  assessModelQuality,
  buildModelRoutingMatrix,
  calculateModelSwitchDriftScores,
  OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG,
  SAFE_FALLBACK_MODEL_ID,
  determineModelSelectionSource,
  isOpenClawAuthorityContractSatisfied,
  isModelAllowedForOrg,
  resolveOpenClawCompatibilityMode,
  resolveModelQualityFirewallDecision,
  resolveModelRoutingIntent,
  resolveModelRoutingModality,
  resolveOrgDefaultModel,
  resolveRequestedModel,
  selectFirstPlatformEnabledModel,
} from "../../../convex/ai/model/modelPolicy";

describe("modelPolicy", () => {
  it("resolves default model from llm.defaultModelId when present in enabled list", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: false },
          { modelId: "openai/gpt-4o-mini", isDefault: true },
        ],
        defaultModelId: "openai/gpt-4o-mini",
      },
    };
    expect(resolveOrgDefaultModel(settings)).toBe("openai/gpt-4o-mini");
  });

  it("falls back to enabled model flagged isDefault when defaultModelId is missing", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: false },
          { modelId: "openai/gpt-4o-mini", isDefault: true },
        ],
      },
    };
    expect(resolveOrgDefaultModel(settings)).toBe("openai/gpt-4o-mini");
  });

  it("falls back to first enabled model when no defaults are specified", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: false },
          { modelId: "openai/gpt-4o-mini", isDefault: false },
        ],
      },
    };
    expect(resolveOrgDefaultModel(settings)).toBe("anthropic/claude-3-5-sonnet");
  });

  it("falls back to legacy llm.model when multi-model settings are absent", () => {
    const settings = {
      llm: {
        model: "openai/gpt-4o",
      },
    };
    expect(resolveOrgDefaultModel(settings)).toBe("openai/gpt-4o");
  });

  it("returns null when no org default model can be resolved", () => {
    expect(resolveOrgDefaultModel({})).toBeNull();
  });

  it("falls back to safe fallback when org has no model restriction", () => {
    const model = resolveRequestedModel({}, "openai/gpt-4o");
    expect(model).toBe(SAFE_FALLBACK_MODEL_ID);
  });

  it("uses requested model when it is in the enabled model list", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: true },
          { modelId: "openai/gpt-4o-mini", isDefault: false },
        ],
      },
    };
    expect(resolveRequestedModel(settings, "openai/gpt-4o-mini")).toBe(
      "openai/gpt-4o-mini"
    );
  });

  it("rejects non-enabled requested models and falls back to org default", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: "anthropic/claude-3-5-sonnet", isDefault: true },
          { modelId: "openai/gpt-4o-mini", isDefault: false },
        ],
      },
    };
    expect(resolveRequestedModel(settings, "google/gemini-2.0-flash")).toBe(
      "anthropic/claude-3-5-sonnet"
    );
  });

  it("uses system default when org has no configured model defaults", () => {
    expect(
      resolveRequestedModel(
        {},
        undefined,
        { systemDefaultModelId: "openai/gpt-4o-mini" }
      )
    ).toBe("openai/gpt-4o-mini");
  });

  it("uses caller-provided safe fallback when no defaults are available", () => {
    expect(
      resolveRequestedModel(
        {},
        undefined,
        { safeFallbackModelId: "google/gemini-2.0-flash-lite" }
      )
    ).toBe("google/gemini-2.0-flash-lite");
  });

  it("uses global safe fallback as final fallback", () => {
    expect(resolveRequestedModel({})).toBe(SAFE_FALLBACK_MODEL_ID);
  });

  it("keeps OpenClaw compatibility mode disabled by default when org flag is absent", () => {
    const decision = resolveOpenClawCompatibilityMode({
      organizationFeatureFlags: {},
      adapterRequested: true,
    });

    expect(decision.enabled).toBe(false);
    expect(decision.mode).toBe("native");
    expect(decision.fallbackToNative).toBe(true);
    expect(decision.fallbackReason).toBe("org_feature_flag_disabled");
    expect(decision.directMutationBypassAllowed).toBe(false);
    expect(decision.trustApprovalRequiredForActionableIntent).toBe(true);
  });

  it("enables OpenClaw compatibility mode only when explicit org feature flag is true", () => {
    const decision = resolveOpenClawCompatibilityMode({
      organizationFeatureFlags: {
        [OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG]: true,
      },
      adapterRequested: true,
    });

    expect(decision.enabled).toBe(true);
    expect(decision.mode).toBe("openclaw_adapter");
    expect(decision.fallbackToNative).toBe(false);
    expect(decision.fallbackReason).toBeNull();
  });

  it("falls back to native mode when the OpenClaw adapter fails after flag enablement", () => {
    const decision = resolveOpenClawCompatibilityMode({
      organizationFeatureFlags: {
        [OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG]: true,
      },
      adapterRequested: true,
      adapterFailed: true,
    });

    expect(decision.enabled).toBe(false);
    expect(decision.mode).toBe("native");
    expect(decision.fallbackToNative).toBe(true);
    expect(decision.fallbackReason).toBe("adapter_failure");
  });

  it("keeps compatibility mode native when adapter is not explicitly requested", () => {
    const decision = resolveOpenClawCompatibilityMode({
      organizationFeatureFlags: {
        [OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG]: true,
      },
    });

    expect(decision.enabled).toBe(false);
    expect(decision.mode).toBe("native");
    expect(decision.fallbackReason).toBe("adapter_not_requested");
  });

  it("validates no-bypass authority contract fields for OpenClaw compatibility", () => {
    const decision = resolveOpenClawCompatibilityMode({
      organizationFeatureFlags: {
        [OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG]: true,
      },
      adapterRequested: true,
    });

    expect(isOpenClawAuthorityContractSatisfied(decision)).toBe(true);
  });

  it("matches allow-list behavior for multi-model settings", () => {
    const settings = {
      llm: {
        enabledModels: [{ modelId: "openai/gpt-4o", isDefault: true }],
      },
    };

    expect(isModelAllowedForOrg(settings, "openai/gpt-4o")).toBe(true);
    expect(isModelAllowedForOrg(settings, "anthropic/claude-3-5-sonnet")).toBe(
      false
    );
  });

  it("matches allow-list behavior for legacy single-model settings", () => {
    const settings = {
      llm: {
        model: "openai/gpt-4o",
      },
    };

    expect(isModelAllowedForOrg(settings, "openai/gpt-4o")).toBe(true);
    expect(isModelAllowedForOrg(settings, "openai/gpt-4o-mini")).toBe(false);
  });

  it("trims model IDs before resolving", () => {
    const settings = {
      llm: {
        enabledModels: [
          { modelId: " openai/gpt-4o ", isDefault: true },
        ],
      },
    };

    expect(resolveOrgDefaultModel(settings)).toBe("openai/gpt-4o");
    expect(resolveRequestedModel(settings, " openai/gpt-4o ")).toBe("openai/gpt-4o");
  });

  it("selects the first candidate that is platform-enabled", () => {
    const selected = selectFirstPlatformEnabledModel(
      [
        "google/gemini-2.0-flash",
        "openai/gpt-4o-mini",
        "anthropic/claude-3-5-sonnet",
      ],
      [
        "openai/gpt-4o-mini",
        "anthropic/claude-3-5-sonnet",
      ]
    );

    expect(selected).toBe("openai/gpt-4o-mini");
  });

  it("returns null when no candidate is platform-enabled", () => {
    const selected = selectFirstPlatformEnabledModel(
      ["google/gemini-2.0-flash"],
      ["anthropic/claude-3-5-sonnet"]
    );

    expect(selected).toBeNull();
  });

  it("classifies selection source as preferred when no fallback is needed", () => {
    expect(
      determineModelSelectionSource({
        selectedModel: "openai/gpt-4o",
        preferredModel: "openai/gpt-4o",
      })
    ).toBe("preferred");
  });

  it("classifies selection source as org_default when selected model matches org default", () => {
    expect(
      determineModelSelectionSource({
        selectedModel: "openai/gpt-4o-mini",
        preferredModel: "google/gemini-2.0-flash",
        orgDefaultModel: "openai/gpt-4o-mini",
      })
    ).toBe("org_default");
  });

  it("classifies selection source as safe_fallback when safe fallback is used", () => {
    expect(
      determineModelSelectionSource({
        selectedModel: SAFE_FALLBACK_MODEL_ID,
        preferredModel: "google/gemini-2.0-flash",
      })
    ).toBe("safe_fallback");
  });

  it("classifies selection source as platform_first_enabled when first enabled platform model is used", () => {
    expect(
      determineModelSelectionSource({
        selectedModel: "openai/gpt-4o-mini",
        preferredModel: "google/gemini-2.0-flash",
        orgDefaultModel: "anthropic/claude-3-5-sonnet",
        platformFirstEnabledModelId: "openai/gpt-4o-mini",
      })
    ).toBe("platform_first_enabled");
  });

  it("resolves routing intent from deterministic intent taxonomy", () => {
    expect(
      resolveModelRoutingIntent({
        detectedIntents: ["billing", "support"],
      })
    ).toBe("billing");

    expect(
      resolveModelRoutingIntent({
        detectedIntents: [],
        requiresTools: false,
      })
    ).toBe("general");
  });

  it("resolves routing modality from metadata attachment hints", () => {
    expect(
      resolveModelRoutingModality({
        message: "please review this",
        metadata: {
          attachments: [{ type: "audio/ogg", name: "voice-note.ogg" }],
        },
      })
    ).toBe("audio_in");

    expect(
      resolveModelRoutingModality({
        message: "[Image]",
      })
    ).toBe("vision");
  });

  it("builds a routing matrix that prioritizes models meeting intent + modality requirements", () => {
    const matrix = buildModelRoutingMatrix({
      preferredModelId: "openai/gpt-4o-mini",
      orgDefaultModelId: "openai/gpt-4o-mini",
      platformModels: [
        {
          modelId: "openai/gpt-4o-mini",
          providerId: "openai",
          capabilityMatrix: {
            text: true,
            vision: false,
            audio_in: false,
            audio_out: false,
            tools: true,
            json: true,
          },
        },
        {
          modelId: "openrouter/openai/gpt-4o",
          providerId: "openrouter",
          capabilityMatrix: {
            text: true,
            vision: true,
            audio_in: false,
            audio_out: false,
            tools: true,
            json: true,
          },
        },
      ],
      routingIntent: "tooling",
      routingModality: "vision",
      availableProviderIds: ["openai", "openrouter"],
    });

    expect(matrix[0].modelId).toBe("openrouter/openai/gpt-4o");
    expect(matrix[0].supportsIntent).toBe(true);
    expect(matrix[0].supportsModality).toBe(true);

    const preferredEntry = matrix.find(
      (entry) => entry.modelId === "openai/gpt-4o-mini"
    );
    expect(preferredEntry?.reason).toBe("modality_unsupported");
  });

  it("prefers gemini routes for vision traffic when candidates are otherwise equivalent", () => {
    const matrix = buildModelRoutingMatrix({
      preferredModelId: "openrouter/openai/gpt-4o",
      platformModels: [
        {
          modelId: "openrouter/openai/gpt-4o",
          providerId: "openrouter",
          capabilityMatrix: {
            text: true,
            vision: true,
            audio_in: false,
            audio_out: false,
            tools: true,
            json: true,
          },
        },
        {
          modelId: "google/gemini-2.0-flash",
          providerId: "gemini",
          capabilityMatrix: {
            text: true,
            vision: true,
            audio_in: false,
            audio_out: false,
            tools: true,
            json: true,
          },
        },
      ],
      routingIntent: "tooling",
      routingModality: "vision",
      availableProviderIds: ["openrouter", "gemini"],
    });

    expect(matrix[0].modelId).toBe("google/gemini-2.0-flash");
    expect(matrix[0].providerId).toBe("gemini");
    expect(matrix[0].supportsIntent).toBe(true);
    expect(matrix[0].supportsModality).toBe(true);
  });

  it("falls back cleanly when gemini is unavailable for vision routing", () => {
    const matrix = buildModelRoutingMatrix({
      preferredModelId: "google/gemini-2.0-flash",
      platformModels: [
        {
          modelId: "google/gemini-2.0-flash",
          providerId: "gemini",
          capabilityMatrix: {
            text: true,
            vision: true,
            audio_in: false,
            audio_out: false,
            tools: true,
            json: true,
          },
        },
        {
          modelId: "openrouter/openai/gpt-4o",
          providerId: "openrouter",
          capabilityMatrix: {
            text: true,
            vision: true,
            audio_in: false,
            audio_out: false,
            tools: true,
            json: true,
          },
        },
      ],
      routingIntent: "tooling",
      routingModality: "vision",
      availableProviderIds: ["openrouter"],
    });

    expect(matrix[0].modelId).toBe("openrouter/openai/gpt-4o");
    expect(matrix[0].providerId).toBe("openrouter");
    expect(
      matrix.find((entry) => entry.modelId === "google/gemini-2.0-flash")?.reason
    ).toBe("provider_unavailable_auth_profiles");
  });

  it("marks unavailable-provider candidates with deterministic reason", () => {
    const matrix = buildModelRoutingMatrix({
      preferredModelId: "openai/gpt-4o-mini",
      platformModels: [
        {
          modelId: "openai/gpt-4o-mini",
          providerId: "openai",
          capabilityMatrix: {
            text: true,
            vision: true,
            audio_in: false,
            audio_out: false,
            tools: true,
            json: true,
          },
        },
        {
          modelId: "openrouter/openai/gpt-4o",
          providerId: "openrouter",
          capabilityMatrix: {
            text: true,
            vision: true,
            audio_in: false,
            audio_out: false,
            tools: true,
            json: true,
          },
        },
      ],
      availableProviderIds: ["openrouter"],
      routingIntent: "general",
      routingModality: "text",
    });

    expect(matrix[0].providerId).toBe("openrouter");
    expect(
      matrix.find((entry) => entry.modelId === "openai/gpt-4o-mini")?.reason
    ).toBe("provider_unavailable_auth_profiles");
  });

  it("scores model quality tiers from capability matrices", () => {
    const gold = assessModelQuality({
      capabilityMatrix: {
        text: true,
        tools: true,
        json: true,
        vision: true,
        audio_in: true,
        audio_out: true,
      },
    });
    expect(gold.tier).toBe("gold");

    const bronze = assessModelQuality({
      capabilityMatrix: {
        text: true,
        tools: false,
        json: false,
        vision: false,
        audio_in: false,
        audio_out: false,
      },
    });
    expect(bronze.tier).toBe("unrated");
  });

  it("enforces privacy and quality floor in quality firewall decisions", () => {
    const privacyBlocked = resolveModelQualityFirewallDecision({
      privacyMode: "local_only",
      qualityTierFloor: "unrated",
      qualityTier: "gold",
      isLocalModel: false,
    });
    expect(privacyBlocked.allowed).toBe(false);
    expect(privacyBlocked.blockReason).toBe("privacy_mode_requires_local_model");

    const tierBlocked = resolveModelQualityFirewallDecision({
      privacyMode: "off",
      qualityTierFloor: "silver",
      qualityTier: "bronze",
      isLocalModel: true,
    });
    expect(tierBlocked.allowed).toBe(false);
    expect(tierBlocked.blockReason).toBe("quality_tier_below_floor");
  });

  it("computes drift severity for model switches with capability regressions", () => {
    const drift = calculateModelSwitchDriftScores({
      previousCapabilityMatrix: {
        text: true,
        tools: true,
        json: true,
        vision: true,
        audio_in: true,
        audio_out: true,
      },
      nextCapabilityMatrix: {
        text: true,
        tools: false,
        json: false,
        vision: false,
        audio_in: false,
        audio_out: false,
      },
      previousProviderId: "openrouter",
      nextProviderId: "openai_compatible",
    });

    expect(drift.capabilityRegression).toBeGreaterThan(0);
    expect(drift.overall).toBeGreaterThan(0);
    expect(["medium", "high"]).toContain(drift.severity);
  });

  it("marks routes blocked by local-only privacy mode", () => {
    const matrix = buildModelRoutingMatrix({
      preferredModelId: "openrouter/openai/gpt-4o",
      platformModels: [
        {
          modelId: "openrouter/openai/gpt-4o",
          providerId: "openrouter",
          capabilityMatrix: {
            text: true,
            tools: true,
            json: true,
            vision: true,
            audio_in: false,
            audio_out: false,
          },
        },
        {
          modelId: "local/phi-4-mini",
          providerId: "openai_compatible",
          capabilityMatrix: {
            text: true,
            tools: false,
            json: true,
            vision: false,
            audio_in: false,
            audio_out: false,
          },
        },
      ],
      privacyMode: "local_only",
      localModelIds: ["local/phi-4-mini"],
      qualityTierFloor: "unrated",
      routingIntent: "general",
      routingModality: "text",
      availableProviderIds: ["openrouter", "openai_compatible"],
    });

    expect(matrix[0].modelId).toBe("local/phi-4-mini");
    expect(
      matrix.find((entry) => entry.modelId === "openrouter/openai/gpt-4o")?.reason
    ).toBe("privacy_mode_blocked");
  });

  it("adds local connector model pool candidates when only local model IDs are configured", () => {
    const matrix = buildModelRoutingMatrix({
      preferredModelId: "openrouter/openai/gpt-4o-mini",
      platformModels: [
        {
          modelId: "openrouter/openai/gpt-4o-mini",
          providerId: "openrouter",
          capabilityMatrix: {
            text: true,
            tools: true,
            json: true,
            vision: true,
            audio_in: false,
            audio_out: false,
          },
        },
      ],
      privacyMode: "local_only",
      localModelIds: ["local/phi-4-mini"],
      routingIntent: "general",
      routingModality: "text",
      availableProviderIds: ["openrouter", "openai_compatible"],
    });

    const localCandidate = matrix.find(
      (entry) => entry.modelId === "local/phi-4-mini"
    );
    expect(localCandidate).toBeDefined();
    expect(localCandidate?.providerId).toBe("openai_compatible");
    expect(localCandidate?.sourceReason).toBe("local_connector_pool");
    expect(localCandidate?.firewallAllowed).toBe(true);
  });
});
