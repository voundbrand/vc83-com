/**
 * API V1: WORKFLOW INTERNAL HANDLERS
 *
 * Internal mutations/queries/actions for MCP workflow management.
 * These handle CRUD operations for workflows without requiring sessionId authentication.
 *
 * NOTE: The existing workflowsInternal.ts handles workflow execution.
 * This file adds CRUD operations for MCP/AI skill usage.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { checkResourceLimit, getLicenseInternal } from "../../licensing/helpers";
import { ConvexError } from "convex/values";

// Helper function for tier upgrade path
function getNextTier(
  currentTier: "free" | "starter" | "professional" | "agency" | "enterprise"
): string {
  const tierUpgradePath: Record<string, string> = {
    free: "Starter (€199/month)",
    starter: "Professional (€399/month)",
    professional: "Agency (€599/month)",
    agency: "Enterprise (€1,500+/month)",
    enterprise: "Enterprise (contact sales)",
  };
  return tierUpgradePath[currentTier] || "a higher tier";
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WorkflowObject {
  objectId: Id<"objects">;
  objectType: string;
  role: string;
  config?: Record<string, unknown>;
}

interface BehaviorTriggers {
  inputTypes?: string[];
  objectTypes?: string[];
  workflows?: string[];
}

interface BehaviorDefinition {
  id: string;
  type: string;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
  triggers?: BehaviorTriggers;
  metadata: {
    createdAt: number;
    createdBy: Id<"users">;
    lastModified?: number;
    lastModifiedBy?: Id<"users">;
  };
}

interface WorkflowExecution {
  triggerOn: string;
  requiredInputs?: string[];
  outputActions?: string[];
  errorHandling: "rollback" | "continue" | "notify";
}

interface WorkflowVisualData {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    behaviorId?: string;
    objectId?: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: string;
  }>;
}

interface WorkflowCustomProperties {
  objects: WorkflowObject[];
  behaviors: BehaviorDefinition[];
  execution: WorkflowExecution;
  visualData?: WorkflowVisualData;
}

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * LIST WORKFLOWS (Internal)
 * Returns all workflows for an organization with optional filtering
 */
export const listWorkflowsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()),
    status: v.optional(v.string()),
    triggerOn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let workflows = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "workflow")
      )
      .collect();

    // Apply filters
    if (args.subtype) {
      workflows = workflows.filter((w) => w.subtype === args.subtype);
    }

    if (args.status) {
      workflows = workflows.filter((w) => w.status === args.status);
    }

    if (args.triggerOn) {
      workflows = workflows.filter((w) => {
        const customProps = w.customProperties as WorkflowCustomProperties | undefined;
        return customProps?.execution?.triggerOn === args.triggerOn;
      });
    }

    return workflows.map((w) => ({
      _id: w._id,
      name: w.name,
      description: w.description,
      subtype: w.subtype,
      status: w.status,
      triggerOn: (w.customProperties as WorkflowCustomProperties | undefined)?.execution?.triggerOn,
      behaviorCount: (w.customProperties as WorkflowCustomProperties | undefined)?.behaviors?.length || 0,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  },
});

/**
 * GET WORKFLOW (Internal)
 * Returns a specific workflow by ID with full configuration
 */
export const getWorkflowInternal = internalQuery({
  args: {
    workflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow") {
      return null;
    }
    return workflow;
  },
});

/**
 * GET WORKFLOWS BY TRIGGER (Internal)
 * Returns active workflows for a specific trigger
 */
export const getWorkflowsByTriggerInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    triggerOn: v.string(),
  },
  handler: async (ctx, args) => {
    const workflows = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "workflow")
      )
      .collect();

    // Filter by trigger and active status
    return workflows.filter((w) => {
      if (w.status !== "active") return false;
      const customProps = w.customProperties as WorkflowCustomProperties | undefined;
      return customProps?.execution?.triggerOn === args.triggerOn;
    });
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * CREATE WORKFLOW (Internal)
 * Creates a new workflow without sessionId authentication
 */
export const createWorkflowInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    name: v.string(),
    subtype: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    triggerOn: v.string(),
    errorHandling: v.optional(v.string()),
    behaviors: v.optional(v.array(v.object({
      type: v.string(),
      enabled: v.boolean(),
      priority: v.number(),
      config: v.any(),
    }))),
  },
  handler: async (ctx, args): Promise<Id<"objects">> => {
    // Check license limits
    await checkResourceLimit(
      ctx,
      args.organizationId,
      "workflow",
      "maxWorkflows"
    );

    // Build behaviors with metadata
    const behaviors: BehaviorDefinition[] = (args.behaviors || []).map((b) => ({
      id: `bhv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: b.type,
      enabled: b.enabled,
      priority: b.priority,
      config: b.config as Record<string, unknown>,
      metadata: {
        createdAt: Date.now(),
        createdBy: args.userId,
      },
    }));

    // Check behavior limits
    const license = await getLicenseInternal(ctx, args.organizationId);
    const limit = license.limits.maxBehaviorsPerWorkflow;

    if (limit !== -1 && behaviors.length > limit) {
      throw new ConvexError({
        code: "LIMIT_EXCEEDED",
        message: `You've reached your maxBehaviorsPerWorkflow limit (${limit}). ` +
          `Upgrade to ${getNextTier(license.planTier)} for more capacity.`,
        limitKey: "maxBehaviorsPerWorkflow",
        currentCount: behaviors.length,
        limit,
        planTier: license.planTier,
        nextTier: getNextTier(license.planTier),
        isNested: true,
      });
    }

    // Create workflow object
    const workflowId = await ctx.db.insert("objects", {
      type: "workflow",
      subtype: args.subtype,
      organizationId: args.organizationId,
      name: args.name,
      description: args.description,
      status: args.status || "draft",
      customProperties: {
        objects: [],
        behaviors,
        execution: {
          triggerOn: args.triggerOn,
          errorHandling: (args.errorHandling || "continue") as "rollback" | "continue" | "notify",
        },
      },
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: workflowId,
      actionType: "workflow_created",
      actionData: {
        workflowType: args.subtype,
        triggerOn: args.triggerOn,
        behaviorCount: behaviors.length,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return workflowId;
  },
});

/**
 * UPDATE WORKFLOW (Internal)
 * Updates an existing workflow
 */
export const updateWorkflowInternal = internalMutation({
  args: {
    workflowId: v.id("objects"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    triggerOn: v.optional(v.string()),
    errorHandling: v.optional(v.string()),
    behaviors: v.optional(v.array(v.object({
      id: v.optional(v.string()),
      type: v.string(),
      enabled: v.boolean(),
      priority: v.number(),
      config: v.any(),
    }))),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow") {
      throw new Error("Workflow not found");
    }

    const existingProps = workflow.customProperties as WorkflowCustomProperties;

    // Handle behavior updates with metadata preservation
    let updatedBehaviors = existingProps.behaviors;
    if (args.behaviors) {
      // Check behavior limits
      const license = await getLicenseInternal(ctx, workflow.organizationId);
      const limit = license.limits.maxBehaviorsPerWorkflow;

      if (limit !== -1 && args.behaviors.length > limit) {
        throw new ConvexError({
          code: "LIMIT_EXCEEDED",
          message: `You've reached your maxBehaviorsPerWorkflow limit (${limit}). ` +
            `Upgrade to ${getNextTier(license.planTier)} for more capacity.`,
          limitKey: "maxBehaviorsPerWorkflow",
          currentCount: args.behaviors.length,
          limit,
          planTier: license.planTier,
          nextTier: getNextTier(license.planTier),
          isNested: true,
        });
      }

      updatedBehaviors = args.behaviors.map((b) => {
        const existing = b.id ? existingProps.behaviors.find((eb) => eb.id === b.id) : null;
        return {
          id: b.id || `bhv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: b.type,
          enabled: b.enabled,
          priority: b.priority,
          config: b.config as Record<string, unknown>,
          metadata: existing
            ? {
                ...existing.metadata,
                lastModified: Date.now(),
                lastModifiedBy: args.userId,
              }
            : {
                createdAt: Date.now(),
                createdBy: args.userId,
              },
        };
      });
    }

    // Build updated execution config
    const updatedExecution: WorkflowExecution = {
      ...existingProps.execution,
      ...(args.triggerOn && { triggerOn: args.triggerOn }),
      ...(args.errorHandling && { errorHandling: args.errorHandling as "rollback" | "continue" | "notify" }),
    };

    // Update workflow
    await ctx.db.patch(args.workflowId, {
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.status && { status: args.status }),
      customProperties: {
        ...existingProps,
        behaviors: updatedBehaviors,
        execution: updatedExecution,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: workflow.organizationId,
      objectId: args.workflowId,
      actionType: "workflow_updated",
      actionData: {
        updatedFields: Object.keys(args).filter((k) => k !== "workflowId" && k !== "userId"),
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE WORKFLOW (Internal)
 * Soft-deletes or hard-deletes a workflow
 */
export const deleteWorkflowInternal = internalMutation({
  args: {
    workflowId: v.id("objects"),
    userId: v.id("users"),
    hardDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow") {
      throw new Error("Workflow not found");
    }

    if (args.hardDelete) {
      // Hard delete
      await ctx.db.delete(args.workflowId);

      await ctx.db.insert("objectActions", {
        organizationId: workflow.organizationId,
        objectId: args.workflowId,
        actionType: "workflow_permanently_deleted",
        actionData: {
          workflowName: workflow.name,
          source: "mcp",
        },
        performedBy: args.userId,
        performedAt: Date.now(),
      });
    } else {
      // Soft delete (archive)
      await ctx.db.patch(args.workflowId, {
        status: "archived",
        updatedAt: Date.now(),
      });

      await ctx.db.insert("objectActions", {
        organizationId: workflow.organizationId,
        objectId: args.workflowId,
        actionType: "workflow_archived",
        actionData: {
          workflowName: workflow.name,
          source: "mcp",
        },
        performedBy: args.userId,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * ACTIVATE WORKFLOW (Internal)
 * Sets workflow status to active
 */
export const activateWorkflowInternal = internalMutation({
  args: {
    workflowId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow") {
      throw new Error("Workflow not found");
    }

    await ctx.db.patch(args.workflowId, {
      status: "active",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: workflow.organizationId,
      objectId: args.workflowId,
      actionType: "workflow_activated",
      actionData: {
        previousStatus: workflow.status,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DEACTIVATE WORKFLOW (Internal)
 * Sets workflow status to draft (inactive)
 */
export const deactivateWorkflowInternal = internalMutation({
  args: {
    workflowId: v.id("objects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow") {
      throw new Error("Workflow not found");
    }

    await ctx.db.patch(args.workflowId, {
      status: "draft",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: workflow.organizationId,
      objectId: args.workflowId,
      actionType: "workflow_deactivated",
      actionData: {
        previousStatus: workflow.status,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * ADD BEHAVIOR TO WORKFLOW (Internal)
 * Adds a single behavior to an existing workflow
 */
export const addBehaviorToWorkflowInternal = internalMutation({
  args: {
    workflowId: v.id("objects"),
    userId: v.id("users"),
    behavior: v.object({
      type: v.string(),
      enabled: v.boolean(),
      priority: v.number(),
      config: v.any(),
    }),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow") {
      throw new Error("Workflow not found");
    }

    const existingProps = workflow.customProperties as WorkflowCustomProperties;

    // Check behavior limits
    const license = await getLicenseInternal(ctx, workflow.organizationId);
    const limit = license.limits.maxBehaviorsPerWorkflow;
    const newCount = existingProps.behaviors.length + 1;

    if (limit !== -1 && newCount > limit) {
      throw new ConvexError({
        code: "LIMIT_EXCEEDED",
        message: `You've reached your maxBehaviorsPerWorkflow limit (${limit}). ` +
          `Upgrade to ${getNextTier(license.planTier)} for more capacity.`,
        limitKey: "maxBehaviorsPerWorkflow",
        currentCount: newCount,
        limit,
        planTier: license.planTier,
        nextTier: getNextTier(license.planTier),
        isNested: true,
      });
    }

    const newBehavior: BehaviorDefinition = {
      id: `bhv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: args.behavior.type,
      enabled: args.behavior.enabled,
      priority: args.behavior.priority,
      config: args.behavior.config as Record<string, unknown>,
      metadata: {
        createdAt: Date.now(),
        createdBy: args.userId,
      },
    };

    await ctx.db.patch(args.workflowId, {
      customProperties: {
        ...existingProps,
        behaviors: [...existingProps.behaviors, newBehavior],
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: workflow.organizationId,
      objectId: args.workflowId,
      actionType: "behavior_added",
      actionData: {
        behaviorId: newBehavior.id,
        behaviorType: newBehavior.type,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { behaviorId: newBehavior.id };
  },
});

/**
 * REMOVE BEHAVIOR FROM WORKFLOW (Internal)
 * Removes a behavior from an existing workflow
 */
export const removeBehaviorFromWorkflowInternal = internalMutation({
  args: {
    workflowId: v.id("objects"),
    userId: v.id("users"),
    behaviorId: v.string(),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow") {
      throw new Error("Workflow not found");
    }

    const existingProps = workflow.customProperties as WorkflowCustomProperties;
    const behaviorToRemove = existingProps.behaviors.find((b) => b.id === args.behaviorId);

    if (!behaviorToRemove) {
      throw new Error("Behavior not found in workflow");
    }

    await ctx.db.patch(args.workflowId, {
      customProperties: {
        ...existingProps,
        behaviors: existingProps.behaviors.filter((b) => b.id !== args.behaviorId),
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: workflow.organizationId,
      objectId: args.workflowId,
      actionType: "behavior_removed",
      actionData: {
        behaviorId: args.behaviorId,
        behaviorType: behaviorToRemove.type,
        source: "mcp",
      },
      performedBy: args.userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});
