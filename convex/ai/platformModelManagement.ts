/**
 * Platform AI Model Management
 *
 * Super admin functions for managing which AI models are available platform-wide.
 * Models auto-discovered by the daily cron job can be enabled/disabled here.
 */

import { v } from "convex/values";
import { mutation, query, action, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireAuthenticatedUser, getUserContext } from "../rbacHelpers";
import { evaluateModelEnablementReleaseGates } from "./modelEnablementGates";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

export type ModelLifecycleStatus =
  | "discovered"
  | "enabled"
  | "default"
  | "deprecated"
  | "retired";

export function deriveLifecycleState(args: {
  isPlatformEnabled: boolean;
  isSystemDefault: boolean;
  deprecatedAt?: number;
  retiredAt?: number;
}): ModelLifecycleStatus {
  if (typeof args.retiredAt === "number") {
    return "retired";
  }
  if (typeof args.deprecatedAt === "number") {
    return "deprecated";
  }
  if (args.isSystemDefault) {
    return "default";
  }
  if (args.isPlatformEnabled) {
    return "enabled";
  }
  return "discovered";
}

export function validateRetirementSafety(args: {
  modelId: string;
  isSystemDefault: boolean;
  replacementModel: {
    modelId: string;
    isPlatformEnabled: boolean;
    lifecycleStatus?: string;
  } | null;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (args.isSystemDefault && !args.replacementModel) {
    reasons.push(
      `Default model ${args.modelId} requires a replacement model before retirement.`
    );
  }

  if (args.replacementModel) {
    if (!args.replacementModel.isPlatformEnabled) {
      reasons.push(
        `Replacement model ${args.replacementModel.modelId} must be platform-enabled.`
      );
    }
    if (args.replacementModel.lifecycleStatus === "retired") {
      reasons.push(
        `Replacement model ${args.replacementModel.modelId} cannot be retired.`
      );
    }
  }

  return { ok: reasons.length === 0, reasons };
}

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
        lifecycleStatus:
          model.lifecycleStatus
          ?? deriveLifecycleState({
            isPlatformEnabled: model.isPlatformEnabled ?? false,
            isSystemDefault: model.isSystemDefault ?? false,
            deprecatedAt: model.deprecatedAt,
            retiredAt: model.retiredAt,
          }),
        deprecatedAt: model.deprecatedAt,
        retiredAt: model.retiredAt,
        replacementModelId: model.replacementModelId,
        retirementReason: model.retirementReason,
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
    operationalReviewAcknowledged: v.boolean(),
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
    if (model.lifecycleStatus === "retired") {
      throw new Error(
        `Model ${args.modelId} is retired and cannot be re-enabled without lifecycle override.`
      );
    }

    const releaseGateResult = evaluateModelEnablementReleaseGates({
      model: {
        modelId: model.modelId,
        validationStatus: model.validationStatus,
        testResults: model.testResults,
      },
      operationalReviewAcknowledged: args.operationalReviewAcknowledged,
    });

    if (!releaseGateResult.passed) {
      throw new Error(
        `Release gate check failed for ${args.modelId}: ${releaseGateResult.reasons.join(" ")}`
      );
    }

    // Enable the model
    const lifecycleStatus = deriveLifecycleState({
      isPlatformEnabled: true,
      isSystemDefault: model.isSystemDefault ?? false,
      deprecatedAt: model.deprecatedAt,
      retiredAt: undefined,
    });
    await ctx.db.patch(model._id, {
      isPlatformEnabled: true,
      lifecycleStatus,
      retiredAt: undefined,
      retirementReason: undefined,
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
    const lifecycleStatus =
      model.lifecycleStatus === "retired"
        ? "retired"
        : deriveLifecycleState({
          isPlatformEnabled: false,
          isSystemDefault: false,
          deprecatedAt: model.deprecatedAt,
          retiredAt: model.retiredAt,
        });
    await ctx.db.patch(model._id, {
      isPlatformEnabled: false,
      isSystemDefault: false,
      lifecycleStatus,
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
    operationalReviewAcknowledged: v.boolean(),
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
    const missingModels: string[] = [];
    const blockedModels: Array<{ modelId: string; reasons: string[] }> = [];
    const modelsToEnable: Array<{ _id: Id<"aiModels">; modelId: string }> = [];

    for (const modelId of args.modelIds) {
      const model = await ctx.db
        .query("aiModels")
        .withIndex("by_model_id", (q) => q.eq("modelId", modelId))
        .first();

      if (!model) {
        missingModels.push(modelId);
        continue;
      }
      if (model.lifecycleStatus === "retired") {
        blockedModels.push({
          modelId: model.modelId,
          reasons: ["retired models cannot be batch-enabled"],
        });
        continue;
      }

      const releaseGateResult = evaluateModelEnablementReleaseGates({
        model: {
          modelId: model.modelId,
          validationStatus: model.validationStatus,
          testResults: model.testResults,
        },
        operationalReviewAcknowledged: args.operationalReviewAcknowledged,
      });

      if (!releaseGateResult.passed) {
        blockedModels.push({
          modelId: model.modelId,
          reasons: releaseGateResult.reasons,
        });
        continue;
      }

      modelsToEnable.push({
        _id: model._id,
        modelId: model.modelId,
      });
    }

    if (missingModels.length > 0) {
      throw new Error(
        `Batch enable aborted; unknown model IDs: ${missingModels.join(", ")}`
      );
    }

    if (blockedModels.length > 0) {
      const summary = blockedModels
        .map(({ modelId, reasons }) => `${modelId} (${reasons.join(" ")})`)
        .join("; ");
      throw new Error(
        `Batch enable blocked by release gates for ${blockedModels.length} model(s): ${summary}`
      );
    }

    for (const model of modelsToEnable) {
      const existing = await ctx.db.get(model._id);
      const lifecycleStatus = deriveLifecycleState({
        isPlatformEnabled: true,
        isSystemDefault: existing?.isSystemDefault ?? false,
        deprecatedAt: existing?.deprecatedAt,
        retiredAt: undefined,
      });
      await ctx.db.patch(model._id, {
        isPlatformEnabled: true,
        lifecycleStatus,
        retiredAt: undefined,
        retirementReason: undefined,
      });
      enabledCount++;
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
    if (
      args.isDefault
      && (model.lifecycleStatus === "retired" || model.lifecycleStatus === "deprecated")
    ) {
      throw new Error("Deprecated or retired models cannot be system defaults");
    }

    // Update the model
    const lifecycleStatus = deriveLifecycleState({
      isPlatformEnabled: model.isPlatformEnabled ?? false,
      isSystemDefault: args.isDefault,
      deprecatedAt: model.deprecatedAt,
      retiredAt: model.retiredAt,
    });
    await ctx.db.patch(model._id, {
      isSystemDefault: args.isDefault,
      lifecycleStatus,
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
 * Mark a model as deprecated while optionally guiding operators to a replacement.
 */
export const deprecatePlatformModel = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
    replacementModelId: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }
    if (model.lifecycleStatus === "retired") {
      throw new Error(`Model ${args.modelId} is retired and cannot be deprecated`);
    }

    let replacementModel = null as
      | {
          _id: Id<"aiModels">;
          modelId: string;
          isPlatformEnabled?: boolean;
          lifecycleStatus?: string;
          deprecatedAt?: number;
        }
      | null;
    if (args.replacementModelId) {
      replacementModel = await ctx.db
        .query("aiModels")
        .withIndex("by_model_id", (q) => q.eq("modelId", args.replacementModelId!))
        .first();
      if (!replacementModel) {
        throw new Error(`Replacement model ${args.replacementModelId} not found`);
      }
      if (!replacementModel.isPlatformEnabled) {
        throw new Error("Replacement model must be platform-enabled before deprecation");
      }
      if (replacementModel.lifecycleStatus === "retired") {
        throw new Error("Replacement model cannot be retired");
      }
    }

    const now = Date.now();
    await ctx.db.patch(model._id, {
      lifecycleStatus: "deprecated",
      deprecatedAt: model.deprecatedAt ?? now,
      replacementModelId: args.replacementModelId,
      retirementReason: args.reason,
      isSystemDefault:
        args.replacementModelId && model.isSystemDefault ? false : model.isSystemDefault,
    });

    if (replacementModel && model.isSystemDefault) {
      const replacementLifecycleStatus = deriveLifecycleState({
        isPlatformEnabled: replacementModel.isPlatformEnabled ?? false,
        isSystemDefault: true,
        deprecatedAt: replacementModel.lifecycleStatus === "deprecated"
          ? replacementModel.deprecatedAt
          : undefined,
        retiredAt: undefined,
      });
      await ctx.db.patch(replacementModel._id, {
        isSystemDefault: true,
        lifecycleStatus: replacementLifecycleStatus,
      });
    }

    return {
      success: true,
      message: `Model ${model.name} marked as deprecated`,
    };
  },
});

/**
 * Retire a model from platform use with optional replacement safety checks.
 */
export const retirePlatformModel = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
    replacementModelId: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }
    if (model.lifecycleStatus === "retired") {
      throw new Error(`Model ${args.modelId} is already retired`);
    }

    let replacementModel = null as
      | {
          _id: Id<"aiModels">;
          modelId: string;
          isPlatformEnabled?: boolean;
          lifecycleStatus?: string;
          deprecatedAt?: number;
        }
      | null;
    if (args.replacementModelId) {
      replacementModel = await ctx.db
        .query("aiModels")
        .withIndex("by_model_id", (q) => q.eq("modelId", args.replacementModelId!))
        .first();
      if (!replacementModel) {
        throw new Error(`Replacement model ${args.replacementModelId} not found`);
      }
    }

    const retirementSafety = validateRetirementSafety({
      modelId: model.modelId,
      isSystemDefault: model.isSystemDefault ?? false,
      replacementModel: replacementModel
        ? {
            modelId: replacementModel.modelId,
            isPlatformEnabled: replacementModel.isPlatformEnabled ?? false,
            lifecycleStatus: replacementModel.lifecycleStatus,
          }
        : null,
    });
    if (!retirementSafety.ok) {
      throw new Error(retirementSafety.reasons.join(" "));
    }

    const now = Date.now();
    await ctx.db.patch(model._id, {
      isPlatformEnabled: false,
      isSystemDefault: false,
      lifecycleStatus: "retired",
      deprecatedAt: model.deprecatedAt ?? now,
      retiredAt: now,
      replacementModelId: args.replacementModelId,
      retirementReason: args.reason ?? "retired_by_operator",
    });

    if (replacementModel && model.isSystemDefault) {
      const replacementLifecycleStatus = deriveLifecycleState({
        isPlatformEnabled: replacementModel.isPlatformEnabled ?? false,
        isSystemDefault: true,
        deprecatedAt: replacementModel.lifecycleStatus === "deprecated"
          ? replacementModel.deprecatedAt
          : undefined,
        retiredAt: undefined,
      });
      await ctx.db.patch(replacementModel._id, {
        isSystemDefault: true,
        lifecycleStatus: replacementLifecycleStatus,
      });
    }

    return {
      success: true,
      message: `Model ${model.name} has been retired`,
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
    const userCheck = await (ctx as any).runQuery(generatedApi.internal.ai.platformModelManagement.checkSuperAdmin, {
      sessionId: args.sessionId,
    });

    if (!userCheck.isSuperAdmin) {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Trigger the model discovery
    const result = await (ctx as any).runAction(generatedApi.internal.ai.modelDiscovery.fetchAvailableModels);

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
    } catch {
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
      contractChecks: v.boolean(),
      conformance: v.optional(v.object({
        sampleCount: v.number(),
        toolCallParsing: v.object({
          passed: v.number(),
          total: v.number(),
          rate: v.number(),
        }),
        schemaFidelity: v.object({
          passed: v.number(),
          total: v.number(),
          rate: v.number(),
        }),
        refusalHandling: v.object({
          passed: v.number(),
          total: v.number(),
          rate: v.number(),
        }),
        latencyP95Ms: v.union(v.number(), v.null()),
        costPer1kTokensUsd: v.union(v.number(), v.null()),
        thresholds: v.object({
          minToolCallParseRate: v.number(),
          minSchemaFidelityRate: v.number(),
          minRefusalHandlingRate: v.number(),
          maxLatencyP95Ms: v.number(),
          maxCostPer1kTokensUsd: v.number(),
        }),
        passed: v.boolean(),
        failedMetrics: v.array(v.string()),
      })),
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
