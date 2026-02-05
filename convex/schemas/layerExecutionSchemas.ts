/**
 * LAYER EXECUTION SCHEMAS
 *
 * Dedicated tables for Layers execution tracking.
 * Separated from the objects table because execution logs are high-volume
 * and need their own indexes for efficient querying.
 *
 * Tables:
 * - layerExecutions: One record per workflow run
 * - layerNodeExecutions: One record per node execution within a run
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * LAYER EXECUTIONS TABLE
 *
 * Tracks each workflow execution run.
 * Created when a trigger fires or manual execution is started.
 */
export const layerExecutions = defineTable({
  /** Organization that owns the workflow */
  organizationId: v.id("organizations"),
  /** The workflow being executed */
  workflowId: v.id("objects"),
  /** Workflow name at time of execution (denormalized for fast display) */
  workflowName: v.string(),

  /** Execution status */
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled"),
    v.literal("timed_out"),
  ),

  /** Execution mode */
  mode: v.union(
    v.literal("live"),
    v.literal("test"),
    v.literal("manual"),
  ),

  /** Trigger information */
  triggerType: v.string(),
  triggerNodeId: v.optional(v.string()),
  triggerData: v.optional(v.any()),

  /** Execution timing */
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  durationMs: v.optional(v.number()),

  /** Results summary */
  nodesExecuted: v.number(),
  nodesSucceeded: v.number(),
  nodesFailed: v.number(),
  nodesSkipped: v.number(),

  /** Error information (if failed) */
  error: v.optional(v.string()),
  errorNodeId: v.optional(v.string()),

  /** Credits consumed */
  creditsUsed: v.number(),

  /** Who triggered this execution */
  triggeredBy: v.optional(v.union(v.id("users"), v.id("objects"))),
})
  .index("by_workflow", ["workflowId"])
  .index("by_org", ["organizationId"])
  .index("by_org_status", ["organizationId", "status"])
  .index("by_workflow_status", ["workflowId", "status"])
  .index("by_started_at", ["startedAt"]);

/**
 * LAYER NODE EXECUTIONS TABLE
 *
 * Tracks individual node execution within a workflow run.
 * One record per node per execution. Used for:
 * - Real-time execution visualization (flowing particles, status badges)
 * - Debugging (inspect data at each step)
 * - Performance monitoring (per-node timing)
 */
export const layerNodeExecutions = defineTable({
  /** Parent execution record */
  executionId: v.id("layerExecutions"),
  /** Organization (denormalized for index efficiency) */
  organizationId: v.id("organizations"),
  /** Workflow (denormalized) */
  workflowId: v.id("objects"),

  /** Node identification */
  nodeId: v.string(),
  nodeType: v.string(),
  nodeName: v.string(),

  /** Execution status */
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("skipped"),
    v.literal("retrying"),
  ),

  /** Execution timing */
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  durationMs: v.optional(v.number()),

  /** Input data received by this node */
  inputData: v.optional(v.any()),
  /** Output data produced by this node */
  outputData: v.optional(v.any()),

  /** Error information */
  error: v.optional(v.string()),
  retryCount: v.optional(v.number()),
  maxRetries: v.optional(v.number()),

  /** Which output handle was activated (for conditional nodes) */
  activeOutputs: v.optional(v.array(v.string())),

  /** Credits consumed by this node */
  creditsUsed: v.number(),
})
  .index("by_execution", ["executionId"])
  .index("by_workflow_node", ["workflowId", "nodeId"])
  .index("by_org", ["organizationId"]);
