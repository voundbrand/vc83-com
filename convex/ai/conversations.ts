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

    return executions;
  },
});
