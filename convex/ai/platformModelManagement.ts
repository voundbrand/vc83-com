/**
 * Platform AI Model Management
 *
 * Super admin functions for managing which AI models are available platform-wide.
 * Models auto-discovered by the daily cron job can be enabled/disabled here.
 */

import { v } from "convex/values";
import { mutation, query, action, internalQuery } from "../_generated/server";
import { requireAuthenticatedUser, getUserContext } from "../rbacHelpers";
import { internal } from "../_generated/api";

/**
 * Get all discovered AI models with their platform availability status
 */
export const getPlatformModels = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can manage platform models
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Get all discovered models
    const models = await ctx.db.query("aiModels").collect();

    return {
      models: models.map((model) => ({
        _id: model._id,
        modelId: model.modelId,
        name: model.name,
        provider: model.provider,
        pricing: model.pricing,
        contextLength: model.contextLength,
        capabilities: model.capabilities,
        discoveredAt: model.discoveredAt,
        lastSeenAt: model.lastSeenAt,
        isNew: model.isNew,
        // Platform availability - default to disabled for new models
        isPlatformEnabled: model.isPlatformEnabled ?? false,
        isSystemDefault: model.isSystemDefault ?? false,
        // Validation tracking
        validationStatus: model.validationStatus,
        testResults: model.testResults,
        testedBy: model.testedBy,
        testedAt: model.testedAt,
        notes: model.notes,
      })),
    };
  },
});

/**
 * Enable a model for platform-wide use
 */
export const enablePlatformModel = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(), // e.g., "anthropic/claude-3-5-sonnet"
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can manage platform models
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Find the model in the database
    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    // Enable the model
    await ctx.db.patch(model._id, {
      isPlatformEnabled: true,
    });

    return {
      success: true,
      message: `Model ${model.name} has been enabled platform-wide`,
    };
  },
});

/**
 * Disable a model from platform-wide use
 */
export const disablePlatformModel = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can manage platform models
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Find the model
    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    // Disable the model
    await ctx.db.patch(model._id, {
      isPlatformEnabled: false,
    });

    return {
      success: true,
      message: `Model ${model.name} has been disabled platform-wide`,
    };
  },
});

/**
 * Batch enable multiple models
 */
export const batchEnableModels = mutation({
  args: {
    sessionId: v.string(),
    modelIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can manage platform models
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    let enabledCount = 0;

    for (const modelId of args.modelIds) {
      const model = await ctx.db
        .query("aiModels")
        .withIndex("by_model_id", (q) => q.eq("modelId", modelId))
        .first();

      if (model) {
        await ctx.db.patch(model._id, {
          isPlatformEnabled: true,
        });
        enabledCount++;
      }
    }

    return {
      success: true,
      message: `Enabled ${enabledCount} models platform-wide`,
      count: enabledCount,
    };
  },
});

/**
 * Toggle a model as a system default
 *
 * System defaults are the recommended "starter" models.
 * Multiple models can be system defaults.
 */
export const toggleSystemDefault = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can manage platform models
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Find the model
    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    // Model must be platform-enabled to be set as default
    if (args.isDefault && !model.isPlatformEnabled) {
      throw new Error("Only platform-enabled models can be set as system default");
    }

    // Update the model
    await ctx.db.patch(model._id, {
      isSystemDefault: args.isDefault,
    });

    return {
      success: true,
      message: args.isDefault
        ? `${model.name} is now a system default`
        : `${model.name} is no longer a system default`,
    };
  },
});

/**
 * Manually refresh models from OpenRouter
 *
 * Triggers the same model discovery that runs daily via cron job.
 * Super admin only.
 */
export const manualRefreshModels = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    count: number;
    fetchedAt: number;
  }> => {
    // Authenticate user (need to use internal query for action context)
    const userCheck = await ctx.runQuery(internal.ai.platformModelManagement.checkSuperAdmin, {
      sessionId: args.sessionId,
    });

    if (!userCheck.isSuperAdmin) {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Trigger the model discovery
    const result = await ctx.runAction(internal.ai.modelDiscovery.fetchAvailableModels);

    return {
      success: true,
      message: `Successfully refreshed models. Found ${result.models.length} models from OpenRouter.`,
      count: result.models.length,
      fetchedAt: result.fetchedAt,
    };
  },
});

/**
 * Internal query to check if user is super admin
 * Used by actions that need authentication
 */
export const checkSuperAdmin = internalQuery({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Authenticate user
      const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

      // Get user context to check super admin status
      const userContext = await getUserContext(ctx, userId);

      return {
        isSuperAdmin: userContext.isGlobal && userContext.roleName === "super_admin",
        userId,
      };
    } catch (error) {
      return {
        isSuperAdmin: false,
        userId: undefined,
      };
    }
  },
});

/**
 * Update model validation status and test results
 *
 * Used by CLI test scripts to save validation results.
 */
export const updateModelValidation = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
    validationStatus: v.union(
      v.literal("not_tested"),
      v.literal("validated"),
      v.literal("failed")
    ),
    testResults: v.object({
      basicChat: v.boolean(),
      toolCalling: v.boolean(),
      complexParams: v.boolean(),
      multiTurn: v.boolean(),
      edgeCases: v.boolean(),
      timestamp: v.number(),
    }),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can update validation status
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Find the model
    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    // Update validation status
    await ctx.db.patch(model._id, {
      validationStatus: args.validationStatus,
      testResults: args.testResults,
      testedBy: userId,
      testedAt: Date.now(),
      notes: args.notes,
    });

    return {
      success: true,
      message: `Validation status updated for ${model.name}`,
    };
  },
});
