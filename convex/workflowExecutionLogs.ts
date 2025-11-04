/**
 * WORKFLOW EXECUTION LOGS
 *
 * Track workflow execution progress in real-time for UI display.
 * Stores console logs and progress updates in the database.
 */

import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

/**
 * Create a new workflow execution log entry (INTERNAL - called from workflow actions)
 */
export const createExecutionLog = internalMutation({
  args: {
    sessionId: v.string(),
    workflowId: v.id("objects"),
    workflowName: v.string(),
  },
  handler: async (ctx, args) => {
    const executionId = await ctx.db.insert("workflowExecutionLogs", {
      workflowId: args.workflowId,
      workflowName: args.workflowName,
      status: "running",
      logs: [],
      startedAt: Date.now(),
      completedAt: undefined,
      error: undefined,
      result: undefined,
    });

    return executionId;
  },
});

/**
 * Add a log entry to an execution (INTERNAL - called from workflow)
 */
export const addLogEntry = internalMutation({
  args: {
    executionId: v.id("workflowExecutionLogs"),
    level: v.union(v.literal("info"), v.literal("success"), v.literal("error"), v.literal("warning")),
    message: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error("Execution not found");
    }

    const newLog = {
      timestamp: Date.now(),
      level: args.level,
      message: args.message,
      data: args.data,
    };

    await ctx.db.patch(args.executionId, {
      logs: [...execution.logs, newLog],
    });
  },
});

/**
 * Mark execution as completed
 */
export const completeExecution = internalMutation({
  args: {
    executionId: v.id("workflowExecutionLogs"),
    status: v.union(v.literal("success"), v.literal("failed")),
    error: v.optional(v.string()),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: args.status,
      completedAt: Date.now(),
      error: args.error,
      result: args.result,
    });
  },
});

/**
 * Get execution logs (real-time subscription for UI)
 */
export const getExecutionLogs = query({
  args: {
    executionId: v.id("workflowExecutionLogs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.executionId);
  },
});

/**
 * Get recent executions for a workflow
 */
export const getWorkflowExecutions = query({
  args: {
    workflowId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const executions = await ctx.db
      .query("workflowExecutionLogs")
      .withIndex("by_workflow", (q) => q.eq("workflowId", args.workflowId))
      .order("desc")
      .take(args.limit || 10);

    return executions;
  },
});
