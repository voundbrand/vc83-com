/**
 * EXECUTION LOGGER
 *
 * Internal mutations for tracking workflow and node execution state.
 * Used by the graph execution engine to record real-time execution progress.
 * These are all internal (not exposed to the client directly).
 */

import { internalMutation, internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { Id } from "../_generated/dataModel";

// ============================================================================
// INTERNAL MUTATIONS (called by graph engine)
// ============================================================================

/**
 * Create an execution record when a workflow run starts.
 */
export const createExecution = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    workflowId: v.id("objects"),
    workflowName: v.string(),
    mode: v.union(v.literal("live"), v.literal("test"), v.literal("manual")),
    triggerType: v.string(),
    triggerNodeId: v.optional(v.string()),
    triggerData: v.optional(v.any()),
    triggeredBy: v.optional(v.union(v.id("users"), v.id("objects"))),
    totalNodes: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("layerExecutions", {
      organizationId: args.organizationId,
      workflowId: args.workflowId,
      workflowName: args.workflowName,
      status: "running",
      mode: args.mode,
      triggerType: args.triggerType,
      triggerNodeId: args.triggerNodeId,
      triggerData: args.triggerData,
      startedAt: Date.now(),
      nodesExecuted: 0,
      nodesSucceeded: 0,
      nodesFailed: 0,
      nodesSkipped: 0,
      creditsUsed: 0,
      triggeredBy: args.triggeredBy,
    });
  },
});

/**
 * Create a node execution record.
 */
export const createNodeExecution = internalMutation({
  args: {
    executionId: v.id("layerExecutions"),
    organizationId: v.id("organizations"),
    workflowId: v.id("objects"),
    nodeId: v.string(),
    nodeType: v.string(),
    nodeName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("layerNodeExecutions", {
      executionId: args.executionId,
      organizationId: args.organizationId,
      workflowId: args.workflowId,
      nodeId: args.nodeId,
      nodeType: args.nodeType,
      nodeName: args.nodeName,
      status: "pending",
      creditsUsed: 0,
    });
  },
});

/**
 * Update a node execution record (status, data, errors).
 */
export const updateNodeExecution = internalMutation({
  args: {
    executionId: v.id("layerExecutions"),
    nodeId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("skipped"),
      v.literal("retrying"),
    ),
    inputData: v.optional(v.any()),
    outputData: v.optional(v.any()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    activeOutputs: v.optional(v.array(v.string())),
    creditsUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find the node execution record
    const nodeExec = await ctx.db
      .query("layerNodeExecutions")
      .withIndex("by_execution", (q) => q.eq("executionId", args.executionId))
      .collect()
      .then((results) => results.find((r) => r.nodeId === args.nodeId));

    if (!nodeExec) {
      console.error(`[ExecutionLogger] Node execution not found: ${args.nodeId}`);
      return;
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.status === "running") {
      updates.startedAt = now;
    }

    if (args.status === "completed" || args.status === "failed" || args.status === "skipped") {
      updates.completedAt = now;
      if (args.durationMs !== undefined) {
        updates.durationMs = args.durationMs;
      } else if (nodeExec.startedAt) {
        updates.durationMs = now - nodeExec.startedAt;
      }
    }

    if (args.inputData !== undefined) updates.inputData = args.inputData;
    if (args.outputData !== undefined) updates.outputData = args.outputData;
    if (args.error !== undefined) updates.error = args.error;
    if (args.activeOutputs !== undefined) updates.activeOutputs = args.activeOutputs;
    if (args.creditsUsed !== undefined) updates.creditsUsed = args.creditsUsed;

    await ctx.db.patch(nodeExec._id, updates);
  },
});

/**
 * Mark an execution as complete (success or failure).
 */
export const completeExecution = internalMutation({
  args: {
    executionId: v.id("layerExecutions"),
    status: v.union(
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
      v.literal("timed_out"),
    ),
    nodesExecuted: v.number(),
    nodesSucceeded: v.number(),
    nodesFailed: v.number(),
    nodesSkipped: v.number(),
    creditsUsed: v.number(),
    error: v.optional(v.string()),
    errorNodeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) return;

    const now = Date.now();
    await ctx.db.patch(args.executionId, {
      status: args.status,
      completedAt: now,
      durationMs: now - execution.startedAt,
      nodesExecuted: args.nodesExecuted,
      nodesSucceeded: args.nodesSucceeded,
      nodesFailed: args.nodesFailed,
      nodesSkipped: args.nodesSkipped,
      creditsUsed: args.creditsUsed,
      error: args.error,
      errorNodeId: args.errorNodeId,
    });
  },
});

// ============================================================================
// CLIENT-FACING QUERIES
// ============================================================================

/**
 * List recent executions for a workflow.
 */
export const listExecutions = query({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const executions = await ctx.db
      .query("layerExecutions")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .order("desc")
      .take(args.limit ?? 20);

    // Verify org access
    return executions.filter((e) => e.organizationId === organizationId);
  },
});

/**
 * Get execution details including all node executions.
 */
export const getExecutionDetails = query({
  args: {
    sessionId: v.string(),
    executionId: v.id("layerExecutions"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const execution = await ctx.db.get(args.executionId);
    if (!execution || execution.organizationId !== organizationId) {
      throw new Error("Execution not found");
    }

    const nodeExecutions = await ctx.db
      .query("layerNodeExecutions")
      .withIndex("by_execution", (q) => q.eq("executionId", args.executionId))
      .collect();

    return {
      ...execution,
      nodeExecutions,
    };
  },
});
