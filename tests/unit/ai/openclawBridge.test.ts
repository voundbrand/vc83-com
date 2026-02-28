import { describe, expect, it } from "vitest";
import {
  buildOpenClawBridgeImportPlan,
  buildOpenClawNativeFallbackPlan,
  resolveOpenClawCompatibilityAdapter,
  validateOpenClawCompatibilityAdapterDecision,
  type OpenClawCompatibilityAdapterDecision,
} from "../../../convex/ai/openclawBridge";
import { OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG } from "../../../convex/ai/modelPolicy";

describe("openclaw bridge import plan", () => {
  it("maps allowed auth profiles and private model definitions", () => {
    const now = 1_739_000_000_000;
    const plan = buildOpenClawBridgeImportPlan({
      now,
      authProfiles: [
        {
          profileId: "OpenAI Main",
          provider: "openai",
          apiKey: "openai-secret",
          enabled: true,
        },
        {
          profileId: "voice-default",
          provider: "elevenlabs",
          token: "elevenlabs-secret",
          defaultVoiceId: "voice_123",
        },
      ],
      privateModels: [
        {
          modelId: "my-private-model",
          provider: "openai_compatible",
          setAsDefault: true,
        },
      ],
    });

    expect(plan.importedAuthProfiles).toHaveLength(2);
    expect(plan.importedAuthProfiles[0]?.providerId).toBe("openai");
    expect(plan.importedAuthProfiles[1]?.providerId).toBe("elevenlabs");
    expect(plan.importedAuthProfiles[1]?.metadata).toMatchObject({
      source: "openclaw_bridge_import",
      importedAt: now,
      defaultVoiceId: "voice_123",
    });

    expect(plan.importedPrivateModels).toEqual([
      {
        modelId: "openai_compatible/my-private-model",
        isDefault: true,
        enabledAt: now,
      },
    ]);
  });

  it("throws when provider is outside the allowlist", () => {
    expect(() =>
      buildOpenClawBridgeImportPlan({
        authProfiles: [
          {
            profileId: "blocked",
            provider: "bedrock",
            apiKey: "secret",
          },
        ],
      })
    ).toThrow(/allowlist/i);
  });

  it("deduplicates imported private models deterministically", () => {
    const plan = buildOpenClawBridgeImportPlan({
      authProfiles: [],
      privateModels: [
        {
          modelId: "openai_compatible/my-private-model",
          provider: "openai_compatible",
          label: "Primary",
          setAsDefault: false,
        },
        {
          modelId: "my-private-model",
          provider: "openai_compatible",
          setAsDefault: true,
        },
      ],
    });

    expect(plan.importedPrivateModels).toHaveLength(1);
    expect(plan.importedPrivateModels[0]?.modelId).toBe(
      "openai_compatible/my-private-model"
    );
    expect(plan.importedPrivateModels[0]?.isDefault).toBe(true);
    expect(plan.importedPrivateModels[0]?.customLabel).toBe("Primary");
  });

  it("falls back to native mode when compatibility feature flag is disabled", () => {
    const adapterDecision = resolveOpenClawCompatibilityAdapter({
      organizationFeatureFlags: {},
      adapterRequested: true,
    });
    const fallbackPlan = buildOpenClawNativeFallbackPlan({ adapterDecision });

    expect(adapterDecision.enabled).toBe(false);
    expect(adapterDecision.mode).toBe("native");
    expect(adapterDecision.fallbackReason).toBe("org_feature_flag_disabled");
    expect(adapterDecision.directMutationBypassAllowed).toBe(false);
    expect(adapterDecision.trustApprovalRequiredForActionableIntent).toBe(true);
    expect(fallbackPlan.importedAuthProfiles).toHaveLength(0);
    expect(fallbackPlan.importedPrivateModels).toHaveLength(0);
    expect(fallbackPlan.warnings[0]).toContain("native vc83 runtime path");
  });

  it("enables compatibility adapter only with explicit org feature flag", () => {
    const adapterDecision = resolveOpenClawCompatibilityAdapter({
      organizationFeatureFlags: {
        [OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG]: true,
      },
      adapterRequested: true,
    });

    expect(adapterDecision.enabled).toBe(true);
    expect(adapterDecision.mode).toBe("openclaw_adapter");
    expect(adapterDecision.fallbackToNative).toBe(false);
    expect(adapterDecision.fallbackReason).toBeNull();
    expect(adapterDecision.warning).toBeNull();
  });

  it("returns deterministic native fallback contract on adapter failure", () => {
    const adapterDecision = resolveOpenClawCompatibilityAdapter({
      organizationFeatureFlags: {
        [OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG]: true,
      },
      adapterRequested: true,
      adapterFailed: true,
      adapterFailureDetail: "provider payload parse failed",
    });
    const fallbackPlan = buildOpenClawNativeFallbackPlan({ adapterDecision });

    expect(adapterDecision.enabled).toBe(false);
    expect(adapterDecision.fallbackReason).toBe("adapter_failure");
    expect(fallbackPlan.warnings[0]).toContain("provider payload parse failed");
    expect(adapterDecision.nativePolicyPrecedence).toBe("vc83_runtime_policy");
  });

  it("validates authority invariants for compatibility adapter decisions", () => {
    const adapterDecision = resolveOpenClawCompatibilityAdapter({
      organizationFeatureFlags: {
        [OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG]: true,
      },
      adapterRequested: true,
    });

    expect(validateOpenClawCompatibilityAdapterDecision(adapterDecision)).toEqual({
      valid: true,
      violations: [],
    });
  });

  it("flags direct mutation bypass as a validation failure", () => {
    const adapterDecision = resolveOpenClawCompatibilityAdapter({
      organizationFeatureFlags: {
        [OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG]: true,
      },
      adapterRequested: true,
    });
    const invalidDecision = {
      ...adapterDecision,
      directMutationBypassAllowed: true,
    } as unknown as OpenClawCompatibilityAdapterDecision;

    const validation = validateOpenClawCompatibilityAdapterDecision(
      invalidDecision
    );
    expect(validation.valid).toBe(false);
    expect(validation.violations).toContain("direct_mutation_bypass_not_allowed");
  });

  it("requires explicit org feature flag when adapter mode is enabled", () => {
    const adapterDecision = resolveOpenClawCompatibilityAdapter({
      organizationFeatureFlags: {
        [OPENCLAW_COMPATIBILITY_ORG_FEATURE_FLAG]: true,
      },
      adapterRequested: true,
    });
    const invalidDecision = {
      ...adapterDecision,
      featureFlagEnabled: false,
    } as unknown as OpenClawCompatibilityAdapterDecision;

    const validation = validateOpenClawCompatibilityAdapterDecision(
      invalidDecision
    );
    expect(validation.valid).toBe(false);
    expect(validation.violations).toContain(
      "feature_flag_required_for_compatibility_mode"
    );
  });

  it("enforces deterministic fallback contract when adapter is disabled", () => {
    const adapterDecision = resolveOpenClawCompatibilityAdapter({
      organizationFeatureFlags: {},
      adapterRequested: true,
    });
    const invalidDecision = {
      ...adapterDecision,
      fallbackToNative: false,
    } as unknown as OpenClawCompatibilityAdapterDecision;

    const validation = validateOpenClawCompatibilityAdapterDecision(
      invalidDecision
    );
    expect(validation.valid).toBe(false);
    expect(validation.violations).toContain("fallback_contract_mismatch");
  });
});
