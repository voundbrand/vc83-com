/**
 * LAYER WORKFLOW ONTOLOGY
 *
 * CRUD operations for Layers workflows stored in the objects table.
 * Uses the universal ontology pattern: type="layer_workflow"
 *
 * Subtypes:
 * - "workflow" (default) - User-created workflows
 * - "template_clone" - Workflows created from templates
 *
 * Status Workflow:
 * - "draft" - Workflow being designed
 * - "ready" - All nodes configured, ready to activate
 * - "active" - Live, processing events
 * - "paused" - Temporarily disabled
 * - "error" - Execution failure, needs attention
 * - "archived" - Soft deleted
 *
 * Data stored in customProperties:
 * - nodes: WorkflowNode[]
 * - edges: WorkflowEdge[]
 * - metadata: { description, templateId, isActive, mode, ... }
 * - triggers: TriggerConfig[]
 * - viewport: { x, y, zoom }
 */

import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
const generatedApi: any = require("../_generated/api");
import { v } from "convex/values";
import { requireAuthenticatedUser, checkPermission } from "../rbacHelpers";
import { checkFeatureAccess } from "../licensing/helpers";
import { Id } from "../_generated/dataModel";
import type { LayerWorkflowData } from "./types";

const OBJECT_TYPE = "layer_workflow";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all workflows for the current organization
 */
export const listWorkflows = query({
  args: {
    sessionId: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflows = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", OBJECT_TYPE)
      )
      .collect();

    // Filter by status if provided
    const filtered = args.status
      ? workflows.filter((w) => w.status === args.status)
      : workflows.filter((w) => w.status !== "archived");

    return filtered.map((w) => ({
      _id: w._id,
      name: w.name,
      description: w.description,
      status: w.status,
      subtype: w.subtype,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      nodeCount: ((w.customProperties as LayerWorkflowData)?.nodes ?? []).length,
      edgeCount: ((w.customProperties as LayerWorkflowData)?.edges ?? []).length,
      isActive: (w.customProperties as LayerWorkflowData)?.metadata?.isActive ?? false,
      runCount: (w.customProperties as LayerWorkflowData)?.metadata?.runCount ?? 0,
      lastRunAt: (w.customProperties as LayerWorkflowData)?.metadata?.lastRunAt,
      templateId: (w.customProperties as LayerWorkflowData)?.metadata?.templateId,
    }));
  },
});

/**
 * Get a single workflow with full data
 */
export const getWorkflow = query({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      throw new Error("Workflow not found");
    }
    if (workflow.organizationId !== organizationId) {
      throw new Error("Access denied");
    }

    return workflow;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new workflow
 */
export const createWorkflow = mutation({
  args: {
    sessionId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    templateId: v.optional(v.string()),
    projectId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const initialData: LayerWorkflowData = {
      nodes: [],
      edges: [],
      metadata: {
        description: args.description,
        templateId: args.templateId,
        isActive: false,
        mode: "design",
        runCount: 0,
        version: 1,
      },
      triggers: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      projectId: args.projectId,
    };

    const now = Date.now();
    const workflowId = await ctx.db.insert("objects", {
      organizationId,
      type: OBJECT_TYPE,
      subtype: args.templateId ? "template_clone" : "workflow",
      name: args.name,
      description: args.description,
      status: "draft",
      customProperties: initialData as unknown as Record<string, unknown>,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit action
    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: workflowId,
      actionType: "create",
      actionData: { source: "layers", templateId: args.templateId },
      performedBy: userId,
      performedAt: now,
    });

    // Auto-capture into project file system if projectId is set
    if (args.projectId) {
      await (ctx as any).runMutation(generatedApi.internal.projectFileSystemInternal.captureLayerWorkflow, {
        projectId: args.projectId,
        layerWorkflowId: workflowId,
      });
    }

    return workflowId;
  },
});

/**
 * Save workflow canvas state (nodes, edges, viewport)
 */
export const saveWorkflow = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    nodes: v.any(),    // WorkflowNode[] - flexible for canvas data
    edges: v.any(),    // WorkflowEdge[] - flexible for canvas data
    triggers: v.optional(v.any()), // TriggerConfig[]
    viewport: v.optional(v.object({
      x: v.number(),
      y: v.number(),
      zoom: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      throw new Error("Workflow not found");
    }
    if (workflow.organizationId !== organizationId) {
      throw new Error("Access denied");
    }

    const existingData = (workflow.customProperties ?? {}) as unknown as LayerWorkflowData;
    const now = Date.now();

    const updatedData: LayerWorkflowData = {
      ...existingData,
      nodes: args.nodes,
      edges: args.edges,
      triggers: args.triggers ?? existingData.triggers,
      viewport: args.viewport ?? existingData.viewport,
      metadata: {
        ...existingData.metadata,
        description: args.description ?? existingData.metadata?.description,
        version: (existingData.metadata?.version ?? 0) + 1,
      },
    };

    await ctx.db.patch(args.workflowId, {
      ...(args.name ? { name: args.name } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      customProperties: updatedData as unknown as Record<string, unknown>,
      updatedAt: now,
    });

    // Auto-capture into project file system if projectId is set
    const projectId = existingData.projectId;
    if (projectId) {
      await (ctx as any).runMutation(generatedApi.internal.projectFileSystemInternal.captureLayerWorkflow, {
        projectId: projectId as Id<"objects">,
        layerWorkflowId: args.workflowId,
      });
    }

    return { success: true, version: updatedData.metadata.version };
  },
});

/**
 * Assign or change the project associated with a workflow.
 * Updates customProperties.projectId and triggers file system capture.
 */
export const setWorkflowProject = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    projectId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      throw new Error("Workflow not found");
    }
    if (workflow.organizationId !== organizationId) {
      throw new Error("Access denied");
    }

    const existingData = (workflow.customProperties ?? {}) as unknown as LayerWorkflowData;
    const oldProjectId = existingData.projectId;
    const now = Date.now();

    const updatedData: LayerWorkflowData = {
      ...existingData,
      projectId: args.projectId ?? undefined,
    };

    await ctx.db.patch(args.workflowId, {
      customProperties: updatedData as unknown as Record<string, unknown>,
      updatedAt: now,
    });

    // Remove capture from old project if changing
    if (oldProjectId && oldProjectId !== args.projectId) {
      await (ctx as any).runMutation(generatedApi.internal.projectFileSystemInternal.removeLayerCapture, {
        projectId: oldProjectId as Id<"objects">,
        layerWorkflowId: args.workflowId,
      });
    }

    // Capture into new project
    if (args.projectId) {
      await (ctx as any).runMutation(generatedApi.internal.projectFileSystemInternal.captureLayerWorkflow, {
        projectId: args.projectId,
        layerWorkflowId: args.workflowId,
      });
    }

    return { success: true };
  },
});

/**
 * Update workflow status (activate, pause, archive)
 */
export const updateWorkflowStatus = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    status: v.union(
      v.literal("draft"),
      v.literal("ready"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("error"),
      v.literal("archived"),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      throw new Error("Workflow not found");
    }
    if (workflow.organizationId !== organizationId) {
      throw new Error("Access denied");
    }

    const existingData = (workflow.customProperties ?? {}) as unknown as LayerWorkflowData;
    const now = Date.now();

    const isActive = args.status === "active";

    await ctx.db.patch(args.workflowId, {
      status: args.status,
      customProperties: {
        ...existingData,
        metadata: {
          ...existingData.metadata,
          isActive,
          mode: isActive ? "live" : "design",
        },
      } as unknown as Record<string, unknown>,
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: args.workflowId,
      actionType: `workflow_${args.status}`,
      actionData: { previousStatus: workflow.status },
      performedBy: userId,
      performedAt: now,
    });

    return { success: true };
  },
});

/**
 * Delete a workflow (soft delete via archive)
 */
export const deleteWorkflow = mutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      throw new Error("Workflow not found");
    }
    if (workflow.organizationId !== organizationId) {
      throw new Error("Access denied");
    }

    const now = Date.now();
    await ctx.db.patch(args.workflowId, {
      status: "archived",
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId,
      objectId: args.workflowId,
      actionType: "workflow_archived",
      performedBy: userId,
      performedAt: now,
    });

    return { success: true };
  },
});

/**
 * Clone a workflow (for template application or duplication)
 */
export const cloneWorkflow = mutation({
  args: {
    sessionId: v.string(),
    sourceWorkflowId: v.id("objects"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const source = await ctx.db.get(args.sourceWorkflowId);
    if (!source || source.type !== OBJECT_TYPE) {
      throw new Error("Source workflow not found");
    }

    const sourceData = (source.customProperties ?? {}) as unknown as LayerWorkflowData;
    const now = Date.now();

    const cloneData: LayerWorkflowData = {
      ...sourceData,
      metadata: {
        ...sourceData.metadata,
        isActive: false,
        mode: "design",
        runCount: 0,
        lastRunAt: undefined,
        version: 1,
        templateId: source._id.toString(),
      },
    };

    const cloneId = await ctx.db.insert("objects", {
      organizationId,
      type: OBJECT_TYPE,
      subtype: "template_clone",
      name: args.newName,
      description: source.description,
      status: "draft",
      customProperties: cloneData as unknown as Record<string, unknown>,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Link clone to source
    await ctx.db.insert("objectLinks", {
      organizationId,
      fromObjectId: cloneId,
      toObjectId: args.sourceWorkflowId,
      linkType: "cloned_from",
      createdBy: userId,
      createdAt: now,
    });

    return cloneId;
  },
});

// ============================================================================
// INTERNAL QUERIES (for execution engine)
// ============================================================================

/**
 * Internal: get workflow for execution (no auth check)
 */
export const internalGetWorkflow = internalQuery({
  args: { workflowId: v.id("objects") },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) {
      return null;
    }
    return workflow;
  },
});

/**
 * Internal: update run count after execution
 */
export const internalUpdateRunStats = internalMutation({
  args: {
    workflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow || workflow.type !== OBJECT_TYPE) return;

    const data = (workflow.customProperties ?? {}) as unknown as LayerWorkflowData;
    const now = Date.now();

    await ctx.db.patch(args.workflowId, {
      customProperties: {
        ...data,
        metadata: {
          ...data.metadata,
          runCount: (data.metadata?.runCount ?? 0) + 1,
          lastRunAt: now,
        },
      } as unknown as Record<string, unknown>,
      updatedAt: now,
    });
  },
});

// ============================================================================
// UPVOTES
// ============================================================================

/**
 * Upvote an unbuilt integration
 */
export const upvoteIntegration = mutation({
  args: {
    sessionId: v.string(),
    integrationType: v.string(),
    nodeType: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check if already upvoted
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "layer_integration_upvote")
      )
      .collect();

    const alreadyVoted = existing.find((e) => {
      const data = e.customProperties as Record<string, unknown>;
      return data?.nodeType === args.nodeType && e.createdBy === userId;
    });

    if (alreadyVoted) {
      return { success: true, alreadyVoted: true };
    }

    const now = Date.now();
    await ctx.db.insert("objects", {
      organizationId,
      type: "layer_integration_upvote",
      name: `Upvote: ${args.integrationType}`,
      status: "active",
      customProperties: {
        integrationType: args.integrationType,
        nodeType: args.nodeType,
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, alreadyVoted: false };
  },
});

/**
 * Get upvote counts for integrations (for prioritization)
 */
export const getUpvoteCounts = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const upvotes = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "layer_integration_upvote"))
      .collect();

    // Aggregate by nodeType
    const counts: Record<string, { nodeType: string; integrationType: string; count: number }> = {};
    for (const upvote of upvotes) {
      const data = upvote.customProperties as Record<string, unknown>;
      const nodeType = data?.nodeType as string;
      if (!nodeType) continue;

      if (!counts[nodeType]) {
        counts[nodeType] = {
          nodeType,
          integrationType: (data?.integrationType as string) ?? nodeType,
          count: 0,
        };
      }
      counts[nodeType].count++;
    }

    return Object.values(counts).sort((a, b) => b.count - a.count);
  },
});
