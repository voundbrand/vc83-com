/**
 * AI Conversations Management
 *
 * Queries and mutations for managing AI conversations and messages
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Create a new conversation
 */
export const createConversation = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("aiConversations", {
      organizationId: args.organizationId,
      userId: args.userId,
      title: args.title,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Get a conversation with all messages
 */
export const getConversation = query({
  args: {
    conversationId: v.id("aiConversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const messages = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    return {
      ...conversation,
      messages: messages.sort((a, b) => a.timestamp - b.timestamp),
    };
  },
});

/**
 * List conversations for a user
 */
export const listConversations = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("aiConversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .order("desc")
      .take(args.limit ?? 50);

    return conversations;
  },
});

/**
 * Add a message to a conversation
 */
export const addMessage = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    role: v.union(
      v.literal("system"),
      v.literal("user"),
      v.literal("assistant"),
      v.literal("tool"),
    ),
    content: v.string(),
    timestamp: v.number(),
    toolCalls: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      arguments: v.any(),
      result: v.optional(v.any()),
      status: v.union(v.literal("success"), v.literal("failed")),
      error: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    // Add message
    const messageId = await ctx.db.insert("aiMessages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      timestamp: args.timestamp,
      toolCalls: args.toolCalls,
    });

    // Update conversation timestamp
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation) {
      await ctx.db.patch(args.conversationId, {
        updatedAt: Date.now(),
      });
    }

    return messageId;
  },
});

/**
 * Update a conversation
 */
export const updateConversation = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Clear all messages from a conversation (for debugging/testing)
 */
export const clearConversationMessages = mutation({
  args: {
    conversationId: v.id("aiConversations"),
  },
  handler: async (ctx, args) => {
    // Delete all messages in this conversation
    const messages = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Update conversation timestamp
    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
    });

    console.log(`[AI Conversations] Cleared ${messages.length} messages from conversation ${args.conversationId}`);

    return { deletedCount: messages.length };
  },
});

/**
 * Archive a conversation
 */
export const archiveConversation = mutation({
  args: {
    conversationId: v.id("aiConversations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Log tool execution
 */
export const logToolExecution = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    toolName: v.string(),
    parameters: v.any(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    status: v.union(v.literal("success"), v.literal("failed")),
    tokensUsed: v.number(),
    costUsd: v.number(),
    executedAt: v.number(),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiToolExecutions", {
      conversationId: args.conversationId,
      organizationId: args.organizationId,
      userId: args.userId,
      toolName: args.toolName,
      parameters: args.parameters,
      result: args.result,
      error: args.error,
      status: args.status,
      tokensUsed: args.tokensUsed,
      costUsd: args.costUsd,
      executedAt: args.executedAt,
      durationMs: args.durationMs,
    });
  },
});

/**
 * Get tool executions for a conversation
 */
export const getToolExecutions = query({
  args: {
    conversationId: v.id("aiConversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const executions = await ctx.db
      .query("aiToolExecutions")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(args.limit ?? 20);

    // Filter out cancelled and rejected items - they shouldn't appear in the UI anymore
    const activeExecutions = executions.filter(
      (e) => e.status !== "cancelled" && e.status !== "rejected"
    );

    return activeExecutions;
  },
});

// ============================================================================
// TOOL APPROVAL SYSTEM (Human-in-the-Loop)
// ============================================================================

/**
 * Propose a tool execution (requires user approval)
 */
export const proposeToolExecution = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    toolName: v.string(),
    parameters: v.any(),
    proposalMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiToolExecutions", {
      conversationId: args.conversationId,
      organizationId: args.organizationId,
      userId: args.userId,
      toolName: args.toolName,
      parameters: args.parameters,
      proposalMessage: args.proposalMessage,
      status: "proposed",
      tokensUsed: 0,  // No tokens used yet (not executed)
      costUsd: 0,
      executedAt: Date.now(),
      durationMs: 0,
    });
  },
});

/**
 * Get pending tool executions (waiting for approval)
 */
export const getPendingToolExecutions = query({
  args: {
    conversationId: v.id("aiConversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiToolExecutions")
      .withIndex("by_conversation_status", (q) =>
        q.eq("conversationId", args.conversationId).eq("status", "proposed")
      )
      .order("desc")
      .collect();
  },
});

/**
 * Approve a tool execution
 */
export const approveToolExecution = mutation({
  args: {
    executionId: v.id("aiToolExecutions"),
    dontAskAgain: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution || execution.status !== "proposed") {
      throw new Error("Execution not found or not in proposed state");
    }

    // Mark as approved
    await ctx.db.patch(args.executionId, {
      status: "approved",
      userResponse: args.dontAskAgain ? "approve_always" : "approve",
    });

    // Schedule execution via action
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctx.scheduler.runAfter(0, "ai/drafts:executeApprovedTool" as any, {
      executionId: args.executionId,
    });

    return { success: true };
  },
});

/**
 * Reject a tool execution
 */
export const rejectToolExecution = mutation({
  args: {
    executionId: v.id("aiToolExecutions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution || execution.status !== "proposed") {
      throw new Error("Execution not found or not in proposed state");
    }

    await ctx.db.patch(args.executionId, {
      status: "rejected",
      userResponse: "reject",
    });

    return { success: true };
  },
});

/**
 * Cancel/dismiss a tool execution (no feedback to AI)
 * This is different from rejection - it just removes the proposal from the UI
 * without feeding any information back to the AI conversation
 */
export const cancelToolExecution = mutation({
  args: {
    executionId: v.id("aiToolExecutions"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution || execution.status !== "proposed") {
      throw new Error("Execution not found or not in proposed state");
    }

    await ctx.db.patch(args.executionId, {
      status: "cancelled",
      userResponse: "cancel",
    });

    console.log(`[Tool Execution] Cancelled proposal ${args.executionId} without feedback to AI`);

    return { success: true };
  },
});

/**
 * Provide custom instruction for a proposed execution
 */
export const customInstructionForExecution = mutation({
  args: {
    executionId: v.id("aiToolExecutions"),
    instruction: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution || execution.status !== "proposed") {
      throw new Error("Execution not found or not in proposed state");
    }

    await ctx.db.patch(args.executionId, {
      status: "rejected",  // Mark as rejected, user wants different approach
      userResponse: "custom",
      customInstruction: args.instruction,
    });

    return { success: true, instruction: args.instruction };
  },
});

/**
 * Minimize a tool execution item in the UI
 */
export const minimizeToolExecution = mutation({
  args: {
    executionId: v.id("aiToolExecutions"),
    isMinimized: v.boolean(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution) {
      throw new Error("Execution not found");
    }

    await ctx.db.patch(args.executionId, {
      isMinimized: args.isMinimized,
    });

    return { success: true };
  },
});

/**
 * Get a single tool execution by ID
 */
export const getToolExecution = query({
  args: {
    executionId: v.id("aiToolExecutions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.executionId);
  },
});

/**
 * Update tool execution parameters (before approval)
 * Allows users to edit AI-proposed parameters before execution
 */
export const updateToolExecutionParameters = mutation({
  args: {
    executionId: v.id("aiToolExecutions"),
    parameters: v.any(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId);
    if (!execution || execution.status !== "proposed") {
      throw new Error("Can only update parameters for proposed executions");
    }

    await ctx.db.patch(args.executionId, {
      parameters: args.parameters,
    });

    return { success: true };
  },
});
