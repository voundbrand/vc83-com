/**
 * AI Settings Management
 *
 * Queries and mutations for managing organization AI configuration
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Get AI settings for an organization
 */
export const getAISettings = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    return settings;
  },
});

/**
 * Create or update AI settings for an organization
 *
 * Supports both legacy (single model) and new (multi-select) formats
 */
export const upsertAISettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    enabled: v.boolean(),
    billingMode: v.union(
      v.literal("platform"),
      v.literal("byok"),
    ),
    tier: v.optional(v.union(
      v.literal("standard"),
      v.literal("privacy-enhanced"),
      v.literal("private-llm")
    )),
    llm: v.object({
      // NEW: Multi-select model configuration
      enabledModels: v.optional(v.array(v.object({
        modelId: v.string(),
        isDefault: v.boolean(),
        customLabel: v.optional(v.string()),
        enabledAt: v.number(),
      }))),
      defaultModelId: v.optional(v.string()),

      // OLD: Legacy fields (for backward compatibility)
      provider: v.optional(v.string()),
      model: v.optional(v.string()),

      // Shared settings
      temperature: v.number(),
      maxTokens: v.number(),
      openrouterApiKey: v.optional(v.string()),
    }),
    embedding: v.object({
      provider: v.union(
        v.literal("openai"),
        v.literal("voyage"),
        v.literal("cohere"),
        v.literal("none"),
      ),
      model: v.string(),
      dimensions: v.number(),
      apiKey: v.optional(v.string()),
    }),
    monthlyBudgetUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Auto-populate system defaults if no models provided
    let llmConfig = args.llm;
    if (!llmConfig.enabledModels || llmConfig.enabledModels.length === 0) {
      // Get system default models (models marked by super admin as recommended)
      const systemDefaults = await ctx.db
        .query("aiModels")
        .withIndex("by_system_default", (q) => q.eq("isSystemDefault", true))
        .collect();

      // Auto-enable system defaults
      if (systemDefaults.length > 0) {
        const now = Date.now();
        llmConfig = {
          ...llmConfig,
          enabledModels: systemDefaults.map((model, index) => ({
            modelId: model.modelId,
            isDefault: index === 0, // First system default is the default
            enabledAt: now,
          })),
          defaultModelId: systemDefaults[0].modelId,
        };
      }
    }

    // Validate multi-select configuration if provided
    if (llmConfig.enabledModels) {
      // Ensure at least one model is enabled
      if (llmConfig.enabledModels.length === 0) {
        throw new Error("At least one model must be enabled");
      }

      // Ensure exactly one model is marked as default
      const defaultModels = llmConfig.enabledModels.filter(m => m.isDefault);
      if (defaultModels.length !== 1) {
        throw new Error("Exactly one model must be set as default");
      }

      // Ensure defaultModelId matches the default model
      const defaultModel = defaultModels[0];
      if (llmConfig.defaultModelId && llmConfig.defaultModelId !== defaultModel.modelId) {
        throw new Error("defaultModelId must match the model marked as default");
      }

      // If defaultModelId not provided, set it
      if (!llmConfig.defaultModelId) {
        llmConfig.defaultModelId = defaultModel.modelId;
      }
    }

    const existing = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        billingMode: args.billingMode,
        tier: args.tier,
        llm: llmConfig,
        embedding: args.embedding,
        monthlyBudgetUsd: args.monthlyBudgetUsd,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("organizationAiSettings", {
      organizationId: args.organizationId,
      enabled: args.enabled,
      billingMode: args.billingMode,
      tier: args.tier,
      llm: llmConfig,
      embedding: args.embedding,
      monthlyBudgetUsd: args.monthlyBudgetUsd,
      currentMonthSpend: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update monthly spend for an organization
 */
export const updateMonthlySpend = mutation({
  args: {
    organizationId: v.id("organizations"),
    costUsd: v.number(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (!settings) return;

    // Check if we're in a new month
    const now = new Date();
    const lastUpdate = new Date(settings.updatedAt);
    const isNewMonth =
      now.getMonth() !== lastUpdate.getMonth() ||
      now.getFullYear() !== lastUpdate.getFullYear();

    if (isNewMonth) {
      // Reset monthly spend
      await ctx.db.patch(settings._id, {
        currentMonthSpend: args.costUsd,
        updatedAt: Date.now(),
      });
    } else {
      // Add to current month
      await ctx.db.patch(settings._id, {
        currentMonthSpend: settings.currentMonthSpend + args.costUsd,
        updatedAt: Date.now(),
      });
    }

    // Check if over budget
    if (settings.monthlyBudgetUsd) {
      const newSpend = isNewMonth
        ? args.costUsd
        : settings.currentMonthSpend + args.costUsd;

      if (newSpend > settings.monthlyBudgetUsd) {
        // TODO: Send alert or disable AI
        console.warn(
          `Organization ${args.organizationId} exceeded monthly AI budget: $${newSpend} > $${settings.monthlyBudgetUsd}`
        );
      }
    }
  },
});

/**
 * Check rate limit for an organization
 */
export const checkRateLimit = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentExecutions = await ctx.db
      .query("aiToolExecutions")
      .withIndex("by_org_time", (q) =>
        q.eq("organizationId", args.organizationId).gte("executedAt", oneHourAgo)
      )
      .collect();

    const limit = 100; // 100 requests per hour
    return {
      remaining: Math.max(0, limit - recentExecutions.length),
      limit,
      exceeded: recentExecutions.length >= limit,
    };
  },
});
