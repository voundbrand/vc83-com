/**
 * Platform-Enabled AI Models
 *
 * Queries for models that are enabled platform-wide by super admins.
 * These queries are used by:
 * - AI chat model selector
 * - Organization AI settings UI
 */

import { query } from "../_generated/server";
import { v } from "convex/values";
import {
  normalizeCanonicalProviderId,
  selectFirstPlatformEnabledModel,
  toCanonicalCapabilityMatrix,
} from "./model/modelPolicy";
import { evaluateRoutingCapabilityRequirements } from "./model/modelEnablementGates";
import {
  evaluateModelReleaseGateSnapshot,
  type ModelReleaseGateSnapshot,
} from "./modelReleaseGateAudit";
import { ONBOARDING_DEFAULT_MODEL_ID } from "./model/modelDefaults";

function buildRoutingGates(capabilityMatrix: ReturnType<typeof toCanonicalCapabilityMatrix>) {
  return {
    text: evaluateRoutingCapabilityRequirements({
      capabilityMatrix,
      requiredCapabilities: ["text"],
    }).passed,
    tooling: evaluateRoutingCapabilityRequirements({
      capabilityMatrix,
      requiredCapabilities: ["tools", "json"],
    }).passed,
    vision: evaluateRoutingCapabilityRequirements({
      capabilityMatrix,
      requiredCapabilities: ["vision"],
    }).passed,
    audio_in: evaluateRoutingCapabilityRequirements({
      capabilityMatrix,
      requiredCapabilities: ["audio_in"],
    }).passed,
  };
}

function supportsModelNativeReasoning(model: {
  capabilities?: { nativeReasoning?: boolean } | null;
}): boolean {
  return model.capabilities?.nativeReasoning === true;
}

function toReleaseGateSnapshot(model: {
  modelId: string;
  name: string;
  provider: string;
  lifecycleStatus?: string;
  isPlatformEnabled?: boolean;
  validationStatus?: "not_tested" | "validated" | "failed";
  testResults?: ModelReleaseGateSnapshot["testResults"];
  operationalReviewAcknowledgedAt?: number;
}): ModelReleaseGateSnapshot {
  return {
    modelId: model.modelId,
    name: model.name,
    provider: model.provider,
    lifecycleStatus: model.lifecycleStatus,
    isPlatformEnabled: model.isPlatformEnabled === true,
    validationStatus: model.validationStatus,
    testResults: model.testResults,
    operationalReviewAcknowledgedAt: model.operationalReviewAcknowledgedAt,
  };
}

function isModelReleaseReady(model: {
  modelId: string;
  name: string;
  provider: string;
  lifecycleStatus?: string;
  isPlatformEnabled?: boolean;
  validationStatus?: "not_tested" | "validated" | "failed";
  testResults?: ModelReleaseGateSnapshot["testResults"];
  operationalReviewAcknowledgedAt?: number;
}): boolean {
  return evaluateModelReleaseGateSnapshot({
    snapshot: toReleaseGateSnapshot(model),
  }).releaseReady;
}

function resolveFreeTierLockedModelId(
  releaseReadyModels: Array<{
    modelId: string;
    isFreeTierLocked?: boolean;
  }>
): { modelId: string | null; source: "configured" | "onboarding_default" | "platform_first_enabled" | "none" } {
  const configured = releaseReadyModels.find(
    (model) => model.isFreeTierLocked === true
  );
  if (configured) {
    return { modelId: configured.modelId, source: "configured" };
  }

  const releaseReadyModelIds = releaseReadyModels.map((model) => model.modelId);
  const onboardingDefault = selectFirstPlatformEnabledModel(
    [ONBOARDING_DEFAULT_MODEL_ID],
    releaseReadyModelIds
  );
  if (onboardingDefault) {
    return {
      modelId: onboardingDefault,
      source: "onboarding_default",
    };
  }

  const platformFirstEnabled = releaseReadyModelIds[0] ?? null;
  if (platformFirstEnabled) {
    return {
      modelId: platformFirstEnabled,
      source: "platform_first_enabled",
    };
  }

  return { modelId: null, source: "none" };
}

/**
 * Get all platform-enabled models
 *
 * Returns only models where isPlatformEnabled = true.
 * This is used to populate dropdowns and UI model lists.
 */
export const getEnabledModels = query({
  args: {},
  handler: async (ctx) => {
    const models = await ctx.db
      .query("aiModels")
      .withIndex("by_platform_enabled", (q) => q.eq("isPlatformEnabled", true))
      .collect();

    return models.filter((model) => isModelReleaseReady(model)).map((model) => {
      const capabilityMatrix = toCanonicalCapabilityMatrix({
        toolCalling: model.capabilities.toolCalling,
        multimodal: model.capabilities.multimodal,
        vision: model.capabilities.vision,
      });

      return {
        id: model.modelId,
        name: model.name,
        provider: model.provider,
        providerId: normalizeCanonicalProviderId(model.provider),
        billingSource: "platform" as const,
        pricing: model.pricing,
        contextLength: model.contextLength,
        capabilities: model.capabilities,
        capabilityMatrix,
        routingGates: buildRoutingGates(capabilityMatrix),
        supportsNativeReasoning: supportsModelNativeReasoning(model),
        isNew: model.isNew,
        isSystemDefault: model.isSystemDefault ?? false,
        isFreeTierLocked: model.isFreeTierLocked === true,
      };
    });
  },
});

/**
 * Resolve free-tier pinned model policy from release-ready platform models.
 */
export const getFreeTierModelPolicy = query({
  args: {},
  handler: async (ctx) => {
    const models = await ctx.db
      .query("aiModels")
      .withIndex("by_platform_enabled", (q) => q.eq("isPlatformEnabled", true))
      .collect();
    const releaseReadyModels = models.filter((model) => isModelReleaseReady(model));
    const resolution = resolveFreeTierLockedModelId(
      releaseReadyModels.map((model) => ({
        modelId: model.modelId,
        isFreeTierLocked: model.isFreeTierLocked,
      }))
    );

    return {
      modelId: resolution.modelId,
      source: resolution.source,
      candidateModelIds: releaseReadyModels.map((model) => model.modelId),
    };
  },
});

/**
 * Get all system default models
 *
 * Returns models marked as system defaults (recommended starter models).
 * Used when creating new organizations or as smart defaults.
 */
export const getSystemDefaults = query({
  args: {},
  handler: async (ctx) => {
    const models = await ctx.db
      .query("aiModels")
      .withIndex("by_system_default", (q) => q.eq("isSystemDefault", true))
      .collect();

    return models.map((model) => {
      const capabilityMatrix = toCanonicalCapabilityMatrix({
        toolCalling: model.capabilities.toolCalling,
        multimodal: model.capabilities.multimodal,
        vision: model.capabilities.vision,
      });

      return {
        id: model.modelId,
        name: model.name,
        provider: model.provider,
        providerId: normalizeCanonicalProviderId(model.provider),
        billingSource: "platform" as const,
        pricing: model.pricing,
        contextLength: model.contextLength,
        capabilities: model.capabilities,
        capabilityMatrix,
        routingGates: buildRoutingGates(capabilityMatrix),
        supportsNativeReasoning: supportsModelNativeReasoning(model),
      };
    });
  },
});

/**
 * Get platform-enabled models grouped by provider
 *
 * Returns enabled models organized by provider for easier UI display.
 */
export const getEnabledModelsByProvider = query({
  args: {},
  handler: async (ctx) => {
    const models = await ctx.db
      .query("aiModels")
      .withIndex("by_platform_enabled", (q) => q.eq("isPlatformEnabled", true))
      .collect();
    const releaseReadyModels = models.filter((model) =>
      isModelReleaseReady(model)
    );

    // Group by provider
    const byProvider: Record<string, typeof releaseReadyModels> = {};

    for (const model of releaseReadyModels) {
      if (!byProvider[model.provider]) {
        byProvider[model.provider] = [];
      }
      byProvider[model.provider].push(model);
    }

    // Sort each provider's models by name
    for (const provider in byProvider) {
      byProvider[provider].sort((a, b) => a.name.localeCompare(b.name));
    }

    return byProvider;
  },
});

/**
 * Get platform-enabled models with tool calling support
 *
 * Returns only models that support tool/function calling.
 * Used for AI features that require tool execution.
 */
export const getToolCallingModels = query({
  args: {},
  handler: async (ctx) => {
    const models = await ctx.db
      .query("aiModels")
      .withIndex("by_platform_enabled", (q) => q.eq("isPlatformEnabled", true))
      .collect();

    return models
      .filter((model) => model.capabilities.toolCalling)
      .filter((model) => isModelReleaseReady(model))
      .map((model) => {
        const capabilityMatrix = toCanonicalCapabilityMatrix({
          toolCalling: model.capabilities.toolCalling,
          multimodal: model.capabilities.multimodal,
          vision: model.capabilities.vision,
        });

        return {
          id: model.modelId,
          name: model.name,
          provider: model.provider,
          providerId: normalizeCanonicalProviderId(model.provider),
          billingSource: "platform" as const,
          pricing: model.pricing,
          contextLength: model.contextLength,
          capabilityMatrix,
          routingGates: buildRoutingGates(capabilityMatrix),
          supportsNativeReasoning: supportsModelNativeReasoning(model),
        };
      });
  },
});

/**
 * Check if a specific model is platform-enabled
 *
 * Used to validate model selection before API calls.
 */
export const isModelEnabled = query({
  args: {
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    const isReleaseReady = model ? isModelReleaseReady(model) : false;

    return {
      isEnabled: model?.isPlatformEnabled ?? false,
      isReleaseReady,
      exists: !!model,
    };
  },
});
