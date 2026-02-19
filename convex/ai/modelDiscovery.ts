/**
 * OPENROUTER MODEL DISCOVERY
 *
 * Dynamically fetches available models from OpenRouter API.
 * This ensures our UI always shows accurate, up-to-date model options
 * based on what's actually available on OpenRouter.
 *
 * Why this approach:
 * - OpenRouter adds/removes models frequently
 * - Model pricing changes over time
 * - No webhooks available from OpenRouter
 * - Server-side caching prevents excessive API calls
 */

import { action, internalMutation, query, internalQuery, internalAction } from "../_generated/server";
import { v } from "convex/values";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");
import {
  normalizeOpenRouterPricingToPerMillion,
} from "./modelPricing";
import { buildEnvApiKeysByProvider } from "./modelAdapters";
import {
  getAllAiProviders,
  resolveOrganizationProviderBindingForProvider,
  resolveOrganizationProviderBindings,
  stripApiKeyFromBinding,
} from "./providerRegistry";
import { aiProviderIdValidator } from "../schemas/coreSchemas";

/**
 * OpenRouter Model Information
 * Based on OpenRouter's /api/v1/models endpoint
 */
export interface OpenRouterModel {
  id: string;                    // "anthropic/claude-3-5-sonnet"
  name: string;                  // "Claude 3.5 Sonnet"
  created: number;               // Unix timestamp
  description?: string;          // Model description
  context_length: number;        // Max tokens (e.g., 200000)
  pricing: {
    prompt: string;              // Cost per 1M input tokens (e.g., "0.000003")
    completion: string;          // Cost per 1M output tokens (e.g., "0.000015")
  };
  top_provider: {
    context_length: number;
    max_completion_tokens?: number;
    is_moderated: boolean;
  };
  architecture?: {
    modality: string;            // "text", "multimodal", etc.
    tokenizer: string;           // "Claude", "GPT-4", etc.
    instruct_type?: string;      // "chat", "completion", etc.
  };
}

type ProviderProbeStatus = "healthy" | "degraded" | "offline";

type ProviderModelCatalogProbeResult = {
  success: boolean;
  status: ProviderProbeStatus;
  checkedAt: number;
  reason?: string;
  modelCount: number;
  modelIds: string[];
  latencyMs?: number;
};

type ProviderTextProbeResult = {
  success: boolean;
  status: ProviderProbeStatus;
  checkedAt: number;
  reason?: string;
  modelId?: string;
  modelCount?: number;
  modelIds?: string[];
  outputCharacters?: number;
  latencyMs?: number;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseJsonSafely(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function extractErrorReason(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const typed = payload as Record<string, unknown>;
  const directMessage = normalizeString(typed.message);
  if (directMessage) {
    return directMessage.slice(0, 180);
  }

  if (typeof typed.error === "string") {
    return typed.error.slice(0, 180);
  }

  if (typeof typed.error === "object" && typed.error !== null) {
    const nested = typed.error as Record<string, unknown>;
    const nestedMessage = normalizeString(nested.message);
    if (nestedMessage) {
      return nestedMessage.slice(0, 180);
    }
  }

  return null;
}

function mapHttpStatusToProbeStatus(statusCode: number): ProviderProbeStatus {
  if (statusCode >= 500 || statusCode === 429) {
    return "degraded";
  }
  return "offline";
}

function normalizeModelIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("models/")) {
    const withoutPrefix = normalizeString(normalized.slice("models/".length));
    return withoutPrefix ?? normalized;
  }

  return normalized;
}

function extractModelIdFromRecord(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const typed = payload as Record<string, unknown>;
  return (
    normalizeModelIdentifier(typed.id) ??
    normalizeModelIdentifier(typed.model) ??
    normalizeModelIdentifier(typed.name) ??
    normalizeModelIdentifier(typed.model_id)
  );
}

function extractModelIdsFromPayload(payload: unknown): string[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const typed = payload as Record<string, unknown>;
  const candidates: unknown[] = [];

  if (Array.isArray(typed.data)) {
    candidates.push(...typed.data);
  }
  if (Array.isArray(typed.models)) {
    candidates.push(...typed.models);
  }
  if (Array.isArray(typed.items)) {
    candidates.push(...typed.items);
  }

  const deduped = new Set<string>();
  for (const candidate of candidates) {
    const modelId = extractModelIdFromRecord(candidate);
    if (!modelId) {
      continue;
    }
    deduped.add(modelId);
  }

  return Array.from(deduped);
}

function buildProviderModelCatalogRequest(args: {
  providerId: string;
  baseUrl: string;
  apiKey: string;
}): {
  url: string;
  headers: Record<string, string>;
} {
  const baseUrl = args.baseUrl.replace(/\/+$/, "");
  if (args.providerId === "gemini") {
    return {
      url: `${baseUrl}/models?key=${encodeURIComponent(args.apiKey)}`,
      headers: {
        accept: "application/json",
      },
    };
  }

  if (args.providerId === "anthropic") {
    return {
      url: `${baseUrl}/models`,
      headers: {
        accept: "application/json",
        "x-api-key": args.apiKey,
        "anthropic-version": "2023-06-01",
      },
    };
  }

  return {
    url: `${baseUrl}/models`,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${args.apiKey}`,
    },
  };
}

async function fetchProviderModelCatalog(args: {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  sampleLimit?: number;
}): Promise<ProviderModelCatalogProbeResult> {
  const checkedAt = Date.now();
  const startedAt = checkedAt;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);

  try {
    const request = buildProviderModelCatalogRequest(args);
    const response = await fetch(request.url, {
      method: "GET",
      headers: request.headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = parseJsonSafely(await response.text());
      return {
        success: false,
        status: mapHttpStatusToProbeStatus(response.status),
        checkedAt,
        reason:
          extractErrorReason(payload) ?? `provider_probe_http_${response.status}`,
        modelCount: 0,
        modelIds: [],
        latencyMs: Date.now() - startedAt,
      };
    }

    const payload = await response.json();
    const modelIds = extractModelIdsFromPayload(payload);
    const sampleLimit = Math.max(1, Math.min(args.sampleLimit ?? 8, 25));

    return {
      success: true,
      status: "healthy",
      checkedAt,
      modelCount: modelIds.length,
      modelIds: modelIds.slice(0, sampleLimit),
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      success: false,
      status: "degraded",
      checkedAt,
      reason:
        error instanceof Error
          ? error.message.slice(0, 180)
          : "provider_probe_failed",
      modelCount: 0,
      modelIds: [],
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getDefaultTextProbeModel(providerId: string): string | null {
  if (providerId === "openrouter") {
    return "openai/gpt-4o-mini";
  }
  if (providerId === "openai" || providerId === "openai_compatible") {
    return "gpt-4o-mini";
  }
  if (providerId === "anthropic") {
    return "claude-3-5-haiku-latest";
  }
  if (providerId === "gemini") {
    return "gemini-2.0-flash";
  }
  if (providerId === "grok") {
    return "grok-2-latest";
  }
  if (providerId === "mistral") {
    return "mistral-small-latest";
  }
  if (providerId === "kimi") {
    return "moonshot-v1-8k";
  }
  return null;
}

function buildProviderTextProbeRequest(args: {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
  prompt: string;
}): {
  url: string;
  headers: Record<string, string>;
  body: string;
} {
  const baseUrl = args.baseUrl.replace(/\/+$/, "");
  if (args.providerId === "anthropic") {
    return {
      url: `${baseUrl}/messages`,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-key": args.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: args.modelId,
        max_tokens: 24,
        temperature: 0,
        messages: [{ role: "user", content: args.prompt }],
      }),
    };
  }

  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    authorization: `Bearer ${args.apiKey}`,
  };

  if (args.providerId === "openrouter") {
    headers["HTTP-Referer"] =
      process.env.OPENROUTER_SITE_URL || "https://app.l4yercak3.com";
    headers["X-Title"] = process.env.OPENROUTER_APP_NAME || "l4yercak3 Platform";
  }

  return {
    url: `${baseUrl}/chat/completions`,
    headers,
    body: JSON.stringify({
      model: args.modelId,
      messages: [{ role: "user", content: args.prompt }],
      max_tokens: 24,
      temperature: 0,
    }),
  };
}

function extractTextProbeOutputLength(payload: unknown): number {
  if (typeof payload !== "object" || payload === null) {
    return 0;
  }

  const typed = payload as Record<string, unknown>;
  if (Array.isArray(typed.content)) {
    const textParts = typed.content
      .map((item) => {
        if (typeof item !== "object" || item === null) {
          return "";
        }
        return normalizeString((item as Record<string, unknown>).text) ?? "";
      })
      .filter((value) => value.length > 0);
    return textParts.join(" ").length;
  }

  if (!Array.isArray(typed.choices) || typed.choices.length === 0) {
    return 0;
  }

  const firstChoice = typed.choices[0];
  if (typeof firstChoice !== "object" || firstChoice === null) {
    return 0;
  }
  const message = (firstChoice as Record<string, unknown>).message;
  if (typeof message !== "object" || message === null) {
    return 0;
  }

  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string") {
    return content.trim().length;
  }
  if (Array.isArray(content)) {
    const textParts = content
      .map((part) => {
        if (typeof part !== "object" || part === null) {
          return "";
        }
        return normalizeString((part as Record<string, unknown>).text) ?? "";
      })
      .filter((value) => value.length > 0);
    return textParts.join(" ").length;
  }

  return 0;
}

export const probeProviderModelCatalog = internalAction({
  args: {
    providerId: aiProviderIdValidator,
    baseUrl: v.string(),
    apiKey: v.string(),
    sampleLimit: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<ProviderModelCatalogProbeResult> => {
    if (args.providerId === "elevenlabs") {
      return {
        success: false,
        status: "offline",
        checkedAt: Date.now(),
        reason: "provider_does_not_expose_model_catalog",
        modelCount: 0,
        modelIds: [],
      };
    }
    return await fetchProviderModelCatalog(args);
  },
});

export const probeProviderTextGeneration = internalAction({
  args: {
    providerId: aiProviderIdValidator,
    baseUrl: v.string(),
    apiKey: v.string(),
    modelId: v.optional(v.string()),
    prompt: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<ProviderTextProbeResult> => {
    const checkedAt = Date.now();
    if (args.providerId === "elevenlabs") {
      return {
        success: false,
        status: "offline",
        checkedAt,
        reason: "provider_does_not_support_text_generation",
      };
    }

    const modelCatalog = await fetchProviderModelCatalog({
      providerId: args.providerId,
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      sampleLimit: 8,
    });
    const modelId =
      normalizeModelIdentifier(args.modelId) ??
      modelCatalog.modelIds[0] ??
      getDefaultTextProbeModel(args.providerId);

    if (!modelId) {
      return {
        success: false,
        status: modelCatalog.status,
        checkedAt,
        reason: modelCatalog.reason ?? "no_text_probe_model_available",
        modelCount: modelCatalog.modelCount,
        modelIds: modelCatalog.modelIds,
        latencyMs: modelCatalog.latencyMs,
      };
    }

    const prompt =
      normalizeString(args.prompt) ??
      "Reply with the single word OK.";
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);

    try {
      const request = buildProviderTextProbeRequest({
        providerId: args.providerId,
        baseUrl: args.baseUrl,
        apiKey: args.apiKey,
        modelId,
        prompt,
      });
      const response = await fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = parseJsonSafely(await response.text());
        return {
          success: false,
          status: mapHttpStatusToProbeStatus(response.status),
          checkedAt,
          reason:
            extractErrorReason(payload) ??
            `provider_text_probe_http_${response.status}`,
          modelId,
          modelCount: modelCatalog.modelCount,
          modelIds: modelCatalog.modelIds,
          latencyMs: Date.now() - startedAt,
        };
      }

      const payload = await response.json();
      return {
        success: true,
        status: "healthy",
        checkedAt,
        modelId,
        modelCount: modelCatalog.modelCount,
        modelIds: modelCatalog.modelIds,
        outputCharacters: extractTextProbeOutputLength(payload),
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        success: false,
        status: "degraded",
        checkedAt,
        reason:
          error instanceof Error
            ? error.message.slice(0, 180)
            : "provider_text_probe_failed",
        modelId,
        modelCount: modelCatalog.modelCount,
        modelIds: modelCatalog.modelIds,
        latencyMs: Date.now() - startedAt,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },
});

export const getOpenRouterDiscoveryBinding = internalQuery({
  args: {},
  handler: async (ctx) => {
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      return null;
    }

    const systemAiSettings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", systemOrg._id)
      )
      .first();

    return resolveOrganizationProviderBindingForProvider({
      llmSettings: systemAiSettings?.llm ?? null,
      providerId: "openrouter",
      defaultBillingSource: systemAiSettings?.billingSource,
      envApiKeysByProvider: buildEnvApiKeysByProvider(process.env),
      envOpenRouterApiKey: process.env.OPENROUTER_API_KEY,
      envOpenAiCompatibleBaseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
    });
  },
});

/**
 * FETCH AVAILABLE MODELS FROM OPENROUTER
 *
 * This is an action that calls the OpenRouter API to get the current list
 * of available models, their pricing, and capabilities.
 *
 * Rate limits: OpenRouter allows reasonable polling (once per hour is fine)
 */
export const fetchAvailableModels = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    models: OpenRouterModel[];
    fetchedAt: number;
  }> => {
    console.log("🔍 Fetching available models from OpenRouter...");

    const openRouterBinding = await (ctx as any).runQuery(
      generatedApi.internal.ai.modelDiscovery.getOpenRouterDiscoveryBinding,
      {}
    );

    if (!openRouterBinding) {
      throw new Error(
        "No OpenRouter provider binding configured for model discovery"
      );
    }

    try {
      // Fetch models from OpenRouter API
      const response = await fetch(`${openRouterBinding.baseUrl}/models`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${openRouterBinding.apiKey}`,
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://app.l4yercak3.com",
          "X-Title": process.env.OPENROUTER_APP_NAME || "l4yercak3 Platform",
        },
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const models = data.data as OpenRouterModel[];

      console.log(`✅ Fetched ${models.length} models from OpenRouter`);

      // Cache the results in our database
      const fetchedAt = Date.now();
      await (ctx as any).runMutation(generatedApi.internal.ai.modelDiscovery.cacheModels, {
        models,
        fetchedAt,
      });

      return {
        models,
        fetchedAt,
      };
    } catch (error) {
      console.error("❌ Failed to fetch models from OpenRouter:", error);
      throw error;
    }
  },
});

/**
 * CACHE MODELS IN DATABASE (Internal)
 *
 * Stores fetched models in BOTH:
 * 1. objects table - for legacy compatibility and quick cache retrieval
 * 2. aiModels table - for platform model management UI
 */
export const cacheModels = internalMutation({
  args: {
    models: v.array(v.any()),  // OpenRouterModel[] (using v.any() to avoid complex schema)
    fetchedAt: v.number(),
  },
  handler: async (ctx, { models, fetchedAt }) => {
    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found");
    }

    // ============================================================================
    // PART 1: Update legacy objects table cache (for backward compatibility)
    // ============================================================================
    const existingCache = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "ai_model_cache")
      )
      .first();

    const expiresAt = fetchedAt + (60 * 60 * 1000); // Cache for 1 hour

    if (existingCache) {
      await ctx.db.patch(existingCache._id, {
        customProperties: {
          models,
          fetchedAt,
          expiresAt,
        },
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "ai_model_cache",
        subtype: "openrouter",
        name: "OpenRouter Available Models",
        description: "Cached list of available models from OpenRouter API",
        status: "active",
        customProperties: {
          models,
          fetchedAt,
          expiresAt,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // ============================================================================
    // PART 2: Populate aiModels table (for platform model management UI)
    // ============================================================================
    console.log(`📦 Updating aiModels table with ${models.length} models...`);

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    let newCount = 0;
    let updatedCount = 0;
    let deprecatedCount = 0;
    const fetchedModelIds = new Set<string>();

    for (const model of models as OpenRouterModel[]) {
      fetchedModelIds.add(model.id);
      // Extract provider from model ID (e.g., "anthropic/claude-3-5-sonnet" -> "anthropic")
      const provider = model.id.split("/")[0];

      // Check if model already exists
      const existing = await ctx.db
        .query("aiModels")
        .withIndex("by_model_id", (q) => q.eq("modelId", model.id))
        .first();

      // Determine capabilities
      const isMultimodal = model.architecture?.modality === "multimodal" ||
                          model.architecture?.modality === "image" ||
                          model.id.includes("vision") ||
                          model.id.includes("multimodal");

      const hasVision = isMultimodal ||
                       model.id.includes("vision") ||
                       model.id.includes("gpt-4o") ||
                       model.id.includes("gemini");

      // Most modern models support tool calling, but some don't
      const supportsToolCalling = !model.id.includes("instruct") &&
                                  !model.id.includes("base") &&
                                  !model.id.includes("embed");

      // Normalize OpenRouter pricing payload to dollars per million tokens.
      const normalizedPricing = normalizeOpenRouterPricingToPerMillion(
        model.pricing
      );
      const promptPerMToken = normalizedPricing.promptPerMToken;
      const completionPerMToken = normalizedPricing.completionPerMToken;

      if (existing) {
        // Update existing model
        await ctx.db.patch(existing._id, {
          name: model.name,
          pricing: {
            promptPerMToken,
            completionPerMToken,
          },
          contextLength: model.context_length,
          capabilities: {
            toolCalling: supportsToolCalling,
            multimodal: isMultimodal,
            vision: hasVision,
          },
          lastSeenAt: fetchedAt,
          isNew: model.created > sevenDaysAgo,
          lifecycleStatus:
            existing.lifecycleStatus === "retired"
              ? "retired"
              : existing.lifecycleStatus ?? "discovered",
          // Keep existing platform/default toggles.
        });
        updatedCount++;
      } else {
        // Insert new model (disabled by default)
        await ctx.db.insert("aiModels", {
          modelId: model.id,
          name: model.name,
          provider,
          pricing: {
            promptPerMToken,
            completionPerMToken,
          },
          contextLength: model.context_length,
          capabilities: {
            toolCalling: supportsToolCalling,
            multimodal: isMultimodal,
            vision: hasVision,
          },
          discoveredAt: fetchedAt,
          lastSeenAt: fetchedAt,
          isNew: model.created > sevenDaysAgo,
          isPlatformEnabled: false, // Disabled by default - super admin must enable
          lifecycleStatus: "discovered",
        });
        newCount++;
      }
    }

    const existingModels = await ctx.db.query("aiModels").collect();
    for (const model of existingModels) {
      if (fetchedModelIds.has(model.modelId)) {
        continue;
      }
      if (model.lifecycleStatus === "retired") {
        continue;
      }

      await ctx.db.patch(model._id, {
        lifecycleStatus: "deprecated",
        deprecatedAt: model.deprecatedAt ?? fetchedAt,
        isPlatformEnabled: false,
        isSystemDefault: false,
        retirementReason:
          model.retirementReason
          ?? "Model no longer present in discovery feed; auto-deprecated for safety",
      });
      deprecatedCount++;
    }

    console.log(
      `✅ Updated model cache: ${newCount} new, ${updatedCount} updated, ${deprecatedCount} auto-deprecated`
    );
  },
});

/**
 * GET CACHED MODELS
 *
 * Retrieves models from cache if available and not expired.
 * If cache is expired or missing, returns null (caller should fetch fresh).
 */
export const getCachedModels = internalQuery({
  args: {},
  handler: async (ctx): Promise<{
    models: OpenRouterModel[];
    fetchedAt: number;
    expiresAt: number;
    isExpired: boolean;
  } | null> => {
    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      return null;
    }

    // Get cached models
    const cache = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", systemOrg._id).eq("type", "ai_model_cache")
      )
      .first();

    if (!cache || !cache.customProperties) {
      return null;
    }

    const models = cache.customProperties.models as OpenRouterModel[];
    const fetchedAt = cache.customProperties.fetchedAt as number;
    const expiresAt = cache.customProperties.expiresAt as number;
    const isExpired = Date.now() > expiresAt;

    return {
      models,
      fetchedAt,
      expiresAt,
      isExpired,
    };
  },
});

/**
 * GET AVAILABLE MODELS (WITH AUTO-REFRESH)
 *
 * Smart getter that:
 * 1. Checks cache first
 * 2. Returns cached data if fresh (< 1 hour old)
 * 3. Returns cached data even if expired (but flags as stale)
 * 4. Frontend can trigger refresh if needed
 *
 * This approach prevents blocking the UI while still keeping data fresh.
 */
export const getAvailableModels = internalQuery({
  args: {},
  handler: async (ctx): Promise<{
    models: OpenRouterModel[];
    isStale: boolean;
    lastFetched: number | null;
  }> => {
    const cached = await (ctx as any).runQuery(generatedApi.internal.ai.modelDiscovery.getCachedModels, {});

    if (!cached) {
      // No cache exists - return empty array and trigger fetch on frontend
      return {
        models: [],
        isStale: true,
        lastFetched: null,
      };
    }

    return {
      models: cached.models,
      isStale: cached.isExpired,
      lastFetched: cached.fetchedAt,
    };
  },
});

/**
 * Resolve canonical AI provider registry metadata.
 *
 * Exposes deterministic provider contract for internal runtime surfaces.
 */
export const getProviderRegistry = internalQuery({
  args: {},
  handler: async (): Promise<ReturnType<typeof getAllAiProviders>> =>
    getAllAiProviders(),
});

/**
 * Resolve org-scoped provider bindings with deterministic
 * priority and fallback metadata. Secrets are redacted.
 */
export const getOrganizationProviderBindings = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    providerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    const bindings = resolveOrganizationProviderBindings({
      llmSettings: settings?.llm ?? null,
      providerId: args.providerId,
      defaultBillingSource: settings?.billingSource,
      envApiKeysByProvider: buildEnvApiKeysByProvider(process.env),
      envOpenRouterApiKey: process.env.OPENROUTER_API_KEY,
      envOpenAiCompatibleBaseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
    });

    return bindings.map(stripApiKeyFromBinding);
  },
});

/**
 * CATEGORIZE MODELS BY PROVIDER
 *
 * Groups models by provider for easier UI display.
 * This helps organize the dropdown menus.
 */
export const getModelsByProvider = query({
  args: {},
  handler: async (ctx): Promise<{
    anthropic: OpenRouterModel[];
    openai: OpenRouterModel[];
    google: OpenRouterModel[];
    meta: OpenRouterModel[];
    other: OpenRouterModel[];
    isStale: boolean;
  }> => {
    const { models, isStale } = await (ctx as any).runQuery(
      generatedApi.internal.ai.modelDiscovery.getAvailableModels,
      {}
    );

    const categorized = {
      anthropic: [] as OpenRouterModel[],
      openai: [] as OpenRouterModel[],
      google: [] as OpenRouterModel[],
      meta: [] as OpenRouterModel[],
      other: [] as OpenRouterModel[],
      isStale,
    };

    for (const model of models) {
      if (model.id.startsWith("anthropic/")) {
        categorized.anthropic.push(model);
      } else if (model.id.startsWith("openai/")) {
        categorized.openai.push(model);
      } else if (model.id.startsWith("google/")) {
        categorized.google.push(model);
      } else if (model.id.startsWith("meta-llama/")) {
        categorized.meta.push(model);
      } else {
        categorized.other.push(model);
      }
    }

    // Sort by name within each category
    type CategoryKey = "anthropic" | "openai" | "google" | "meta" | "other";
    const categoryKeys: CategoryKey[] = ["anthropic", "openai", "google", "meta", "other"];

    for (const category of categoryKeys) {
      categorized[category].sort((a: OpenRouterModel, b: OpenRouterModel) =>
        a.name.localeCompare(b.name)
      );
    }

    return categorized;
  },
});

/**
 * FORMAT MODEL FOR UI DISPLAY
 *
 * Helper function to format model data for dropdown display.
 * Shows name and pricing in a user-friendly way.
 */
export function formatModelForDisplay(model: OpenRouterModel): {
  value: string;
  label: string;
  cost: string;
  contextLength: number;
} {
  // Calculate cost per 1M tokens (average of input and output).
  const normalizedPricing = normalizeOpenRouterPricingToPerMillion(
    model.pricing
  );
  const promptCost = normalizedPricing.promptPerMToken;
  const completionCost = normalizedPricing.completionPerMToken;
  const avgCost = (promptCost + completionCost) / 2;

  // Format cost
  let costString: string;
  if (avgCost < 0.01) {
    costString = `< $0.01/1M tokens`;
  } else if (avgCost < 1) {
    costString = `$${avgCost.toFixed(2)}/1M tokens`;
  } else {
    costString = `$${avgCost.toFixed(0)}/1M tokens`;
  }

  return {
    value: model.id,
    label: model.name,
    cost: costString,
    contextLength: model.context_length,
  };
}

/**
 * REFRESH MODELS (Frontend-Triggered)
 *
 * Allows frontend to explicitly request a fresh fetch from OpenRouter.
 * This is useful when:
 * - User clicks "Refresh Models" button
 * - Cache is stale and user wants latest data
 * - Initial load and no cache exists
 */
export const refreshModels = action({
  args: {},
  handler: async (ctx): Promise<{models: OpenRouterModel[]; fetchedAt: number}> => {
    console.log("🔄 Manually refreshing models from OpenRouter...");
    return await (ctx as any).runAction(generatedApi.internal.ai.modelDiscovery.fetchAvailableModels, {});
  },
});
