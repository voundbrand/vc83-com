/**
 * WORKFLOW ONTOLOGY - STANDALONE WORKFLOWS
 *
 * CRUD operations for standalone workflow objects in the objects table.
 * Workflows orchestrate multiple objects (products, forms, checkouts, CRM orgs)
 * through configured behaviors.
 *
 * Architecture:
 * - Workflows are stored as objects with type: "workflow"
 * - Each workflow references multiple objects it orchestrates
 * - Behaviors are configured within the workflow
 * - Workflows can be visually designed in the UI
 * - Workflows execute when triggered by context (e.g., checkout_start)
 */

import { query, mutation, action } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, requirePermission, checkPermission } from "../rbacHelpers";
import { Id } from "../_generated/dataModel";
import { validateWorkflowConfig, validateObjectReferences } from "./workflowValidation";
import { api, internal } from "../_generated/api";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Object reference within a workflow
 */
export interface WorkflowObject {
  objectId: Id<"objects">;
  objectType: string; // "product", "form", "checkout", "crm_organization", etc.
  role: string; // "primary", "input-source", "payment-processor", etc.
  config?: Record<string, unknown>; // Object-specific configuration
}

/**
 * Behavior trigger configuration
 */
export interface BehaviorTriggers {
  inputTypes?: string[]; // ["form", "api", etc.]
  objectTypes?: string[]; // ["product", "checkout", etc.]
  workflows?: string[]; // ["checkout", "registration", etc.]
}

/**
 * Behavior definition within a workflow
 */
export interface BehaviorDefinition {
  id: string;
  type: string; // "employer-detection", "invoice-mapping", etc.
  enabled: boolean;
  priority: number; // Higher = executes first
  config: Record<string, unknown>; // Behavior-specific config
  triggers?: BehaviorTriggers;
  metadata: {
    createdAt: number;
    createdBy: Id<"users">;
    lastModified?: number;
    lastModifiedBy?: Id<"users">;
  };
}

/**
 * Workflow execution settings
 */
export interface WorkflowExecution {
  triggerOn: string; // "checkout_start", "form_submit", etc.
  requiredInputs?: string[]; // ["form_responses", "product_selection"]
  outputActions?: string[]; // ["create_invoice", "skip_payment_step"]
  errorHandling: "rollback" | "continue" | "notify";
}

/**
 * Visual workflow builder data (for UI)
 */
export interface WorkflowVisualData {
  nodes: Array<{
    id: string;
    type: string; // "form", "product", "behavior", etc.
    position: { x: number; y: number };
    behaviorId?: string;
    objectId?: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: string; // "data-flow", "action", etc.
  }>;
}

/**
 * Complete workflow custom properties structure
 */
export interface WorkflowCustomProperties {
  objects: WorkflowObject[];
  behaviors: BehaviorDefinition[];
  execution: WorkflowExecution;
  visualData?: WorkflowVisualData;
}

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * LIST WORKFLOWS
 * Returns all workflows for an organization with optional filtering
 */
export const listWorkflows = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    subtype: v.optional(v.string()), // Filter by workflow subtype
    status: v.optional(v.string()), // Filter by status
    objectType: v.optional(v.string()), // Filter by object types involved
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_workflows",
      args.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: view_workflows required");
    }

    // Query workflows
    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "workflow")
      );

    let workflows = await q.collect();

    // Apply filters
    if (args.subtype) {
      workflows = workflows.filter((w) => w.subtype === args.subtype);
    }

    if (args.status) {
      workflows = workflows.filter((w) => w.status === args.status);
    }

    if (args.objectType) {
      workflows = workflows.filter((w) => {
        const customProps = w.customProperties as WorkflowCustomProperties | undefined;
        return customProps?.objects?.some((obj) => obj.objectType === args.objectType);
      });
    }

    return workflows;
  },
});

/**
 * GET WORKFLOW
 * Returns a specific workflow by ID with full configuration
 */
export const getWorkflow = query({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow") {
      throw new Error("Workflow not found");
    }

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_workflows",
      workflow.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: view_workflows required");
    }

    return workflow;
  },
});

/**
 * GET WORKFLOWS BY TRIGGER
 * Returns workflows that should execute for a specific trigger
 */
export const getWorkflowsByTrigger = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    triggerOn: v.string(), // "checkout_start", "form_submit", etc.
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission
    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_workflows",
      args.organizationId
    );

    if (!hasPermission) {
      throw new Error("Permission denied: view_workflows required");
    }

    // Query active workflows
    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "workflow")
      );

    let workflows = await q.collect();

    // Filter by trigger and active status
    workflows = workflows.filter((w) => {
      if (w.status !== "active") return false;
      const customProps = w.customProperties as WorkflowCustomProperties | undefined;
      return customProps?.execution?.triggerOn === args.triggerOn;
    });

    return workflows;
  },
});

/**
 * GET WORKFLOWS BY TRIGGER (PUBLIC)
 * Public query for loading workflows without authentication
 * Used for checkout flows where users are not logged in
 */
export const getWorkflowsByTriggerPublic = query({
  args: {
    organizationId: v.id("organizations"),
    triggerOn: v.string(), // "checkout_start", "form_submit", etc.
  },
  handler: async (ctx, args) => {
    // Query active workflows (no auth required for checkout)
    const q = ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "workflow")
      );

    let workflows = await q.collect();

    // Filter by trigger and active status
    workflows = workflows.filter((w) => {
      if (w.status !== "active") return false;
      const customProps = w.customProperties as WorkflowCustomProperties | undefined;
      return customProps?.execution?.triggerOn === args.triggerOn;
    });

    return workflows;
  },
});

// ============================================================================
// MUTATION OPERATIONS
// ============================================================================

/**
 * CREATE WORKFLOW
 * Creates a new standalone workflow object
 */
export const createWorkflow = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    workflow: v.object({
      name: v.string(),
      subtype: v.string(), // "checkout-flow", "form-processing", etc.
      description: v.optional(v.string()),
      status: v.optional(v.string()), // "active" | "draft" | "archived"
      objects: v.optional(v.array(
        v.object({
          objectId: v.id("objects"),
          objectType: v.string(),
          role: v.string(),
          config: v.optional(v.any()), // Object-specific config - intentionally flexible
        })
      )),
      behaviors: v.array(
        v.object({
          type: v.string(),
          enabled: v.boolean(),
          priority: v.number(),
          config: v.any(), // Behavior-specific config - intentionally flexible
          triggers: v.optional(
            v.object({
              inputTypes: v.optional(v.array(v.string())),
              objectTypes: v.optional(v.array(v.string())),
              workflows: v.optional(v.array(v.string())),
            })
          ),
        })
      ),
      execution: v.object({
        triggerOn: v.string(),
        requiredInputs: v.optional(v.array(v.string())),
        outputActions: v.optional(v.array(v.string())),
        errorHandling: v.string(),
      }),
      visualData: v.optional(v.any()), // Visual workflow data - intentionally flexible for UI
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check permission
    await requirePermission(ctx, userId, "manage_workflows", {
      organizationId: args.organizationId,
    });

    // Validate object references exist (if objects are provided)
    if (args.workflow.objects && args.workflow.objects.length > 0) {
      const objectErrors = await validateObjectReferences(ctx, args.workflow.objects);
      if (objectErrors.length > 0) {
        throw new Error(`Invalid object references: ${objectErrors.join(", ")}`);
      }
    }

    // Validate behavior configurations
    const behaviorErrors = validateWorkflowConfig(args.workflow.behaviors);
    if (behaviorErrors.length > 0) {
      throw new Error(`Invalid behavior configurations: ${behaviorErrors.join(", ")}`);
    }

    // Build behaviors with metadata
    const behaviors: BehaviorDefinition[] = args.workflow.behaviors.map((b) => ({
      id: `bhv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: b.type,
      enabled: b.enabled,
      priority: b.priority,
      config: b.config,
      triggers: b.triggers,
      metadata: {
        createdAt: Date.now(),
        createdBy: userId,
      },
    }));

    // Create workflow object
    const workflowId = await ctx.db.insert("objects", {
      type: "workflow",
      subtype: args.workflow.subtype,
      organizationId: args.organizationId,
      name: args.workflow.name,
      description: args.workflow.description,
      status: args.workflow.status || "draft",
      customProperties: {
        objects: args.workflow.objects,
        behaviors,
        execution: args.workflow.execution,
        visualData: args.workflow.visualData,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: workflowId,
      actionType: "workflow_created",
      actionData: {
        workflowType: args.workflow.subtype,
        objectCount: args.workflow.objects?.length || 0,
        behaviorCount: behaviors.length,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return workflowId;
  },
});

/**
 * UPDATE WORKFLOW
 * Updates an existing workflow
 */
export const updateWorkflow = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      objects: v.optional(
        v.array(
          v.object({
            objectId: v.id("objects"),
            objectType: v.string(),
            role: v.string(),
            config: v.optional(v.any()), // Object-specific config - intentionally flexible
          })
        )
      ),
      behaviors: v.optional(
        v.array(
          v.object({
            id: v.optional(v.string()), // If provided, updates existing behavior
            type: v.string(),
            enabled: v.boolean(),
            priority: v.number(),
            config: v.any(), // Behavior-specific config - intentionally flexible
            triggers: v.optional(
              v.object({
                inputTypes: v.optional(v.array(v.string())),
                objectTypes: v.optional(v.array(v.string())),
                workflows: v.optional(v.array(v.string())),
              })
            ),
          })
        )
      ),
      execution: v.optional(
        v.object({
          triggerOn: v.string(),
          requiredInputs: v.optional(v.array(v.string())),
          outputActions: v.optional(v.array(v.string())),
          errorHandling: v.string(),
        })
      ),
      visualData: v.optional(v.any()), // Visual workflow data - intentionally flexible for UI
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow") {
      throw new Error("Workflow not found");
    }

    // Check permission
    await requirePermission(ctx, userId, "manage_workflows", {
      organizationId: workflow.organizationId,
    });

    // Validate object references if provided
    if (args.updates.objects) {
      const objectErrors = await validateObjectReferences(ctx, args.updates.objects);
      if (objectErrors.length > 0) {
        throw new Error(`Invalid object references: ${objectErrors.join(", ")}`);
      }
    }

    // Validate behavior configurations if provided
    if (args.updates.behaviors) {
      const behaviorErrors = validateWorkflowConfig(args.updates.behaviors);
      if (behaviorErrors.length > 0) {
        throw new Error(`Invalid behavior configurations: ${behaviorErrors.join(", ")}`);
      }
    }

    const existingProps = workflow.customProperties as WorkflowCustomProperties;

    // Handle behavior updates with metadata preservation
    let updatedBehaviors = existingProps.behaviors;
    if (args.updates.behaviors) {
      updatedBehaviors = args.updates.behaviors.map((b) => {
        const existing = b.id ? existingProps.behaviors.find((eb) => eb.id === b.id) : null;
        return {
          id: b.id || `bhv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: b.type,
          enabled: b.enabled,
          priority: b.priority,
          config: b.config,
          triggers: b.triggers,
          metadata: existing
            ? {
                ...existing.metadata,
                lastModified: Date.now(),
                lastModifiedBy: userId,
              }
            : {
                createdAt: Date.now(),
                createdBy: userId,
              },
        };
      });
    }

    // Update workflow
    await ctx.db.patch(args.workflowId, {
      name: args.updates.name ?? workflow.name,
      description: args.updates.description ?? workflow.description,
      status: args.updates.status ?? workflow.status,
      customProperties: {
        objects: args.updates.objects ?? existingProps.objects,
        behaviors: updatedBehaviors,
        execution: args.updates.execution ?? existingProps.execution,
        visualData: args.updates.visualData ?? existingProps.visualData,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: workflow.organizationId,
      objectId: args.workflowId,
      actionType: "workflow_updated",
      actionData: {
        updatedFields: Object.keys(args.updates),
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return args.workflowId;
  },
});

/**
 * DELETE WORKFLOW
 * Soft-deletes a workflow (sets status to "archived")
 */
export const deleteWorkflow = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    hardDelete: v.optional(v.boolean()), // If true, permanently delete; if false/undefined, archive
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow") {
      throw new Error("Workflow not found");
    }

    // Check permission
    await requirePermission(ctx, userId, "manage_workflows", {
      organizationId: workflow.organizationId,
    });

    if (args.hardDelete) {
      // Hard delete - permanently remove from database
      await ctx.db.delete(args.workflowId);

      // Log action
      await ctx.db.insert("objectActions", {
        organizationId: workflow.organizationId,
        objectId: args.workflowId,
        actionType: "workflow_permanently_deleted",
        actionData: {
          workflowName: workflow.name,
        },
        performedBy: userId,
        performedAt: Date.now(),
      });
    } else {
      // Soft delete - archive
      await ctx.db.patch(args.workflowId, {
        status: "archived",
        updatedAt: Date.now(),
      });

      // Log action
      await ctx.db.insert("objectActions", {
        organizationId: workflow.organizationId,
        objectId: args.workflowId,
        actionType: "workflow_archived",
        actionData: {
          workflowName: workflow.name,
        },
        performedBy: userId,
        performedAt: Date.now(),
      });
    }
  },
});

/**
 * DUPLICATE WORKFLOW
 * Creates a copy of an existing workflow with a new name
 */
export const duplicateWorkflow = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== "workflow") {
      throw new Error("Workflow not found");
    }

    // Check permission
    await requirePermission(ctx, userId, "manage_workflows", {
      organizationId: workflow.organizationId,
    });

    const customProps = workflow.customProperties as WorkflowCustomProperties;

    // Create new workflow with new IDs for behaviors
    const newBehaviors = customProps.behaviors.map((b) => ({
      ...b,
      id: `bhv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        createdAt: Date.now(),
        createdBy: userId,
      },
    }));

    const newWorkflowId = await ctx.db.insert("objects", {
      type: "workflow",
      subtype: workflow.subtype,
      organizationId: workflow.organizationId,
      name: args.newName,
      description: workflow.description,
      status: "draft", // Always create as draft
      customProperties: {
        ...customProps,
        behaviors: newBehaviors,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      organizationId: workflow.organizationId,
      objectId: newWorkflowId,
      actionType: "workflow_duplicated",
      actionData: {
        originalWorkflowId: args.workflowId,
        originalWorkflowName: workflow.name,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return newWorkflowId;
  },
});

/**
 * EXECUTE WORKFLOW (Manual Trigger)
 *
 * Manually trigger workflow execution with provided context.
 * Used for testing workflows or manual invoice generation.
 *
 * NOTE: This is an action (not mutation) because it needs to call behavior actions.
 */
export const executeWorkflow = action({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    manualTrigger: v.optional(v.boolean()),
    contextData: v.optional(v.any()), // Optional context overrides - intentionally flexible
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    behaviorResults?: Array<{
      behaviorType: string;
      success: boolean;
      error?: string;
      message?: string;
      data?: unknown;
      executionId?: Id<"workflowExecutionLogs">;
    }>;
    executedCount?: number;
    totalCount?: number;
    executionId?: Id<"workflowExecutionLogs">;
  }> => {
    console.log("🚀 Executing workflow manually:", args.workflowId);

    // Get authenticated user (using internal query)
    const authResult = await ctx.runQuery(
      internal.rbacHelpers.requireAuthenticatedUserQuery,
      {
        sessionId: args.sessionId,
      }
    ) as { userId: Id<"users"> };

    const userId = authResult.userId;

    // Get workflow (using public query)
    const workflow = await ctx.runQuery(api.ontologyHelpers.getObject, {
      objectId: args.workflowId,
    }) as { type: string; organizationId: Id<"organizations">; customProperties: WorkflowCustomProperties; name: string } | null;

    if (!workflow || workflow.type !== "workflow") {
      throw new Error("Workflow not found");
    }

    // Check permission (using internal mutation)
    await ctx.runMutation(internal.rbacHelpers.requirePermissionMutation, {
      userId: userId,
      permission: "manage_workflows",
      organizationId: workflow.organizationId,
    });

    const customProps = workflow.customProperties;

    // Build execution context
    const context: Record<string, unknown> = {
      organizationId: workflow.organizationId,
      sessionId: args.sessionId,
      workflow: customProps.execution.triggerOn.replace("_start", ""),
      objects: customProps.objects || [],
      inputs: [],
      actor: {
        type: "user" as const,
        id: userId,
      },
      workflowData: args.contextData || {},
      behaviorData: {},
      capabilities: {},
      metadata: {
        manualTrigger: args.manualTrigger || true,
        triggeredAt: Date.now(),
        triggeredBy: userId,
      },
    };

    try {
      // Execute behaviors using the behavior executor (no dynamic imports!)
      const result = await ctx.runAction(api.workflows.behaviorExecutor.executeBehaviors, {
        sessionId: args.sessionId,
        organizationId: workflow.organizationId,
        behaviors: customProps.behaviors.map((b) => ({
          type: b.type,
          config: b.config,
          priority: b.priority,
        })),
        context,
        continueOnError: customProps.execution.errorHandling !== "rollback",
        workflowId: args.workflowId,
        workflowName: workflow.name,
      });

      // Log successful execution (using internal mutation)
      await ctx.runMutation(internal.rbacHelpers.logObjectActionMutation, {
        organizationId: workflow.organizationId,
        objectId: args.workflowId,
        actionType: "workflow_executed",
        actionData: {
          success: result.success,
          behaviorCount: result.executedCount || 0,
          totalBehaviors: result.totalCount || 0,
          manualTrigger: args.manualTrigger || false,
        },
        performedBy: userId,
        performedAt: Date.now(),
      });

      return {
        success: result.success,
        message: result.success
          ? `Workflow "${workflow.name}" executed successfully. ${result.executedCount} of ${result.totalCount} behaviors completed.`
          : `Workflow execution completed with errors. ${result.executedCount} of ${result.totalCount} behaviors completed.`,
        behaviorResults: result.results.map((r: {
          behaviorType: string;
          success: boolean;
          error?: string;
          message?: string;
          data?: unknown;
        }) => ({
          ...r,
          executionId: result.executionId,
        })),
        executedCount: result.executedCount,
        totalCount: result.totalCount,
        executionId: result.executionId,
      };
    } catch (error) {
      console.error("Workflow execution failed:", error);

      // Log failed execution (using internal mutation)
      await ctx.runMutation(internal.rbacHelpers.logObjectActionMutation, {
        organizationId: workflow.organizationId,
        objectId: args.workflowId,
        actionType: "workflow_execution_failed",
        actionData: {
          error: error instanceof Error ? error.message : "Unknown error",
          manualTrigger: args.manualTrigger || false,
        },
        performedBy: userId,
        performedAt: Date.now(),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        message: `Failed to execute workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
