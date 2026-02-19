import { query } from "../_generated/server";
import { v } from "convex/values";
import type { AiProviderId } from "../channels/types";
import { detectProvider } from "./modelAdapters";
import type {
  AiProviderBindingSource,
  ProviderBindingFallbackMetadata,
  ResolvedAiProviderBinding,
} from "./providerRegistry";

export interface ModelPricingRates {
  promptPerMToken: number;
  completionPerMToken: number;
}

export interface ResolvedModelPricing extends ModelPricingRates {
  modelId: string;
  providerId: AiProviderId;
  source: "aiModels" | "fallback";
  usedFallback: boolean;
  bindingMetadata: {
    source: AiProviderBindingSource | "model_provider";
    profileId: string | null;
    priority: number | null;
    fallbackMetadata: ProviderBindingFallbackMetadata;
  };
  warning?: string;
}

export interface OpenRouterPricingShape {
  prompt?: string | number | null;
  completion?: string | number | null;
}

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

export const CREDITS_PER_USD = 100;
export const DEFAULT_AGENT_USAGE_ESTIMATE: TokenUsage = {
  prompt_tokens: 2000,
  completion_tokens: 1000,
};

export const DEFAULT_MODEL_PRICING_RATES: ModelPricingRates = {
  promptPerMToken: 3,
  completionPerMToken: 15,
};

function buildBindingMetadata(args: {
  source: AiProviderBindingSource | "model_provider";
  profileId?: string | null;
  priority?: number | null;
  fallbackMetadata?: ProviderBindingFallbackMetadata;
}): ResolvedModelPricing["bindingMetadata"] {
  return {
    source: args.source,
    profileId: args.profileId ?? null,
    priority:
      typeof args.priority === "number" && Number.isFinite(args.priority)
        ? args.priority
        : null,
    fallbackMetadata: args.fallbackMetadata ?? {
      usedFallback: false,
      reasons: [],
    },
  };
}

function parseFiniteNonNegative(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function normalizeOpenRouterPricingToPerMillion(
  pricing: OpenRouterPricingShape,
  fallbackRates: ModelPricingRates = DEFAULT_MODEL_PRICING_RATES
): ResolvedModelPricing {
  const promptPerToken = parseFiniteNonNegative(pricing.prompt);
  const completionPerToken = parseFiniteNonNegative(pricing.completion);
  const hasValidPrompt = promptPerToken !== null;
  const hasValidCompletion = completionPerToken !== null;

  if (hasValidPrompt && hasValidCompletion) {
    return {
      modelId: "openrouter:model",
      providerId: "openrouter",
      promptPerMToken: promptPerToken * 1_000_000,
      completionPerMToken: completionPerToken * 1_000_000,
      source: "aiModels",
      usedFallback: false,
      bindingMetadata: buildBindingMetadata({
        source: "model_provider",
      }),
    };
  }

  return {
    modelId: "openrouter:model",
    providerId: "openrouter",
    promptPerMToken: fallbackRates.promptPerMToken,
    completionPerMToken: fallbackRates.completionPerMToken,
    source: "fallback",
    usedFallback: true,
    bindingMetadata: buildBindingMetadata({
      source: "model_provider",
      fallbackMetadata: {
        usedFallback: true,
        reasons: ["openrouter_pricing_payload_invalid"],
      },
    }),
    warning: "OpenRouter model pricing payload was missing or invalid; fallback rates applied",
  };
}

export function resolveModelPricingFromRecord(
  modelId: string,
  pricing: Partial<ModelPricingRates> | null | undefined,
  fallbackRates: ModelPricingRates = DEFAULT_MODEL_PRICING_RATES
): ResolvedModelPricing {
  const providerId = detectProvider(modelId, "openrouter");
  const promptPerMToken = parseFiniteNonNegative(pricing?.promptPerMToken);
  const completionPerMToken = parseFiniteNonNegative(pricing?.completionPerMToken);

  if (promptPerMToken !== null && completionPerMToken !== null) {
    return {
      modelId,
      providerId,
      promptPerMToken,
      completionPerMToken,
      source: "aiModels",
      usedFallback: false,
      bindingMetadata: buildBindingMetadata({
        source: "model_provider",
      }),
    };
  }

  return {
    modelId,
    providerId,
    promptPerMToken: fallbackRates.promptPerMToken,
    completionPerMToken: fallbackRates.completionPerMToken,
    source: "fallback",
    usedFallback: true,
    bindingMetadata: buildBindingMetadata({
      source: "model_provider",
      fallbackMetadata: {
        usedFallback: true,
        reasons: ["model_pricing_fallback"],
      },
    }),
    warning: `Missing or invalid aiModels pricing for ${modelId}; fallback rates applied`,
  };
}

export function resolveModelPricingForProviderBinding(args: {
  modelId: string;
  pricing: Partial<ModelPricingRates> | null | undefined;
  binding?: Pick<
    ResolvedAiProviderBinding,
    "providerId" | "profileId" | "priority" | "source" | "fallbackMetadata"
  > | null;
  fallbackRates?: ModelPricingRates;
}): ResolvedModelPricing {
  const resolved = resolveModelPricingFromRecord(
    args.modelId,
    args.pricing,
    args.fallbackRates
  );
  const binding = args.binding;
  if (!binding) {
    return resolved;
  }

  return {
    ...resolved,
    providerId: binding.providerId,
    bindingMetadata: buildBindingMetadata({
      source: binding.source,
      profileId: binding.profileId,
      priority: binding.priority,
      fallbackMetadata: binding.fallbackMetadata,
    }),
  };
}

export function calculateCostFromUsage(
  usage: TokenUsage | null | undefined,
  pricing: ModelPricingRates = DEFAULT_MODEL_PRICING_RATES
): number {
  if (!usage) {
    return 0;
  }

  const promptTokens = Math.max(0, usage.prompt_tokens ?? 0);
  const completionTokens = Math.max(0, usage.completion_tokens ?? 0);

  const inputCost = (promptTokens * pricing.promptPerMToken) / 1_000_000;
  const outputCost = (completionTokens * pricing.completionPerMToken) / 1_000_000;

  return inputCost + outputCost;
}

export function convertUsdToCredits(
  costUsd: number,
  minimumCredits = 1
): number {
  const normalizedCost = Number.isFinite(costUsd) && costUsd > 0 ? costUsd : 0;
  return Math.max(minimumCredits, Math.ceil(normalizedCost * CREDITS_PER_USD));
}

export function estimateCreditsFromPricing(
  pricing: ModelPricingRates = DEFAULT_MODEL_PRICING_RATES,
  usageEstimate: TokenUsage = DEFAULT_AGENT_USAGE_ESTIMATE
): number {
  return convertUsdToCredits(calculateCostFromUsage(usageEstimate, pricing));
}

export const getModelPricing = query({
  args: {
    modelId: v.string(),
  },
  handler: async (ctx, args): Promise<ResolvedModelPricing> => {
    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    return resolveModelPricingFromRecord(args.modelId, model?.pricing);
  },
});
