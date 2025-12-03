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

    return models.map((model) => ({
      id: model.modelId,
      name: model.name,
      provider: model.provider,
      pricing: model.pricing,
      contextLength: model.contextLength,
      capabilities: model.capabilities,
      isNew: model.isNew,
      isSystemDefault: model.isSystemDefault ?? false,
    }));
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

    return models.map((model) => ({
      id: model.modelId,
      name: model.name,
      provider: model.provider,
      pricing: model.pricing,
      contextLength: model.contextLength,
      capabilities: model.capabilities,
    }));
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

    // Group by provider
    const byProvider: Record<string, typeof models> = {};

    for (const model of models) {
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
      .map((model) => ({
        id: model.modelId,
        name: model.name,
        provider: model.provider,
        pricing: model.pricing,
        contextLength: model.contextLength,
      }));
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

    return {
      isEnabled: model?.isPlatformEnabled ?? false,
      exists: !!model,
    };
  },
});
