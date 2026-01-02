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
import { internal } from "../_generated/api";
import { v } from "convex/values";

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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    try {
      // Fetch models from OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
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
      await ctx.runMutation(internal.ai.modelDiscovery.cacheModels, {
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

    for (const model of models as OpenRouterModel[]) {
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

      // Parse pricing (OpenRouter returns strings like "0.000003")
      const promptPerMToken = parseFloat(model.pricing.prompt) * 1_000_000;
      const completionPerMToken = parseFloat(model.pricing.completion) * 1_000_000;

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
          // Keep existing isPlatformEnabled value
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
        });
        newCount++;
      }
    }

    console.log(`✅ Updated model cache: ${newCount} new, ${updatedCount} updated`);
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
    const cached = await ctx.runQuery(internal.ai.modelDiscovery.getCachedModels, {});

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
    const { models, isStale } = await ctx.runQuery(
      internal.ai.modelDiscovery.getAvailableModels,
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
  // Calculate cost per 1M tokens (average of input and output)
  const promptCost = parseFloat(model.pricing.prompt) * 1000000;
  const completionCost = parseFloat(model.pricing.completion) * 1000000;
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
    return await ctx.runAction(internal.ai.modelDiscovery.fetchAvailableModels, {});
  },
});
