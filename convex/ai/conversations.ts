/**
 * AI Conversations Management
 *
 * Queries and mutations for managing AI conversations and messages
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Generate a URL-friendly slug from a title
 * Format: "title-words-here-abc123" where abc123 is a short unique suffix
 */
function generateSlug(title: string): string {
  // Convert to lowercase, replace spaces with hyphens, remove special chars
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-")      // Replace spaces with hyphens
    .replace(/-+/g, "-")       // Replace multiple hyphens with single
    .replace(/^-|-$/g, "")     // Remove leading/trailing hyphens
    .substring(0, 50);         // Limit length

  // Generate a short unique suffix (similar to v0's format)
  // Use base62 encoding of timestamp + random for uniqueness
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const timestamp = Date.now();
  let suffix = "";

  // Encode timestamp portion (last 6 digits for variety)
  let num = timestamp % 1000000;
  while (num > 0 && suffix.length < 5) {
    suffix = chars[num % 62] + suffix;
    num = Math.floor(num / 62);
  }

  // Add 6 random chars for additional uniqueness
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * 62)];
  }

  return baseSlug ? `${baseSlug}-${suffix}` : suffix;
}

interface ConversationModelResolution {
  requestedModel?: string;
  selectedModel: string;
  selectionSource: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

interface ConversationModelResolutionRecord {
  timestamp: number;
  modelResolution?: ConversationModelResolution;
}

export interface ModelFallbackAggregation {
  windowHours: number;
  since: number;
  messagesScanned: number;
  messagesWithModelResolution: number;
  fallbackCount: number;
  fallbackRate: number;
  selectionSources: Array<{ source: string; count: number }>;
  fallbackReasons: Array<{ reason: string; count: number }>;
}

function normalizeModelResolution(
  value: unknown
): ConversationModelResolution | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.selectedModel !== "string") {
    return null;
  }
  if (typeof record.selectionSource !== "string") {
    return null;
  }
  if (typeof record.fallbackUsed !== "boolean") {
    return null;
  }

  return {
    requestedModel:
      typeof record.requestedModel === "string" ? record.requestedModel : undefined,
    selectedModel: record.selectedModel,
    selectionSource: record.selectionSource,
    fallbackUsed: record.fallbackUsed,
    fallbackReason:
      typeof record.fallbackReason === "string" ? record.fallbackReason : undefined,
  };
}

export function aggregateConversationModelFallback(
  records: ConversationModelResolutionRecord[],
  options: { windowHours: number; since: number }
): ModelFallbackAggregation {
  let messagesWithModelResolution = 0;
  let fallbackCount = 0;
  const selectionSourceCounts = new Map<string, number>();
  const fallbackReasonCounts = new Map<string, number>();

  for (const record of records) {
    const normalized = normalizeModelResolution(record.modelResolution);
    if (!normalized) {
      continue;
    }

    messagesWithModelResolution += 1;
    const normalizedSource = normalized.selectionSource.trim().toLowerCase();
    if (normalizedSource) {
      selectionSourceCounts.set(
        normalizedSource,
        (selectionSourceCounts.get(normalizedSource) ?? 0) + 1
      );
    }

    if (!normalized.fallbackUsed) {
      continue;
    }

    fallbackCount += 1;
    const reasonRaw = normalized.fallbackReason ?? normalized.selectionSource;
    const reason = reasonRaw.trim().toLowerCase();
    if (!reason) {
      continue;
    }
    fallbackReasonCounts.set(reason, (fallbackReasonCounts.get(reason) ?? 0) + 1);
  }

  const fallbackRate =
    messagesWithModelResolution > 0
      ? Number((fallbackCount / messagesWithModelResolution).toFixed(4))
      : 0;

  return {
    windowHours: options.windowHours,
    since: options.since,
    messagesScanned: records.length,
    messagesWithModelResolution,
    fallbackCount,
    fallbackRate,
    selectionSources: Array.from(selectionSourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count })),
    fallbackReasons: Array.from(fallbackReasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count })),
  };
}

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

    // Generate slug from title or use a default
    const slug = generateSlug(args.title || "new-conversation");

    return await ctx.db.insert("aiConversations", {
      organizationId: args.organizationId,
      userId: args.userId,
      title: args.title,
      slug,
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
 * Get a conversation by its slug
 * Used for pretty URL resolution
 */
export const getConversationBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("aiConversations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!conversation) {
      return null;
    }

    const messages = await ctx.db
      .query("aiMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
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
    modelResolution: v.optional(v.object({
      requestedModel: v.optional(v.string()),
      selectedModel: v.string(),
      selectionSource: v.string(),
      fallbackUsed: v.boolean(),
      fallbackReason: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Add message
    const messageId = await ctx.db.insert("aiMessages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      timestamp: args.timestamp,
      toolCalls: args.toolCalls,
      modelResolution: args.modelResolution,
      modelId: args.modelResolution?.selectedModel,
    });

    // Update conversation timestamp
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation) {
      await ctx.db.patch(args.conversationId, {
        modelId: args.modelResolution?.selectedModel ?? conversation.modelId,
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
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title,
      modelId: args.modelId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Persist conversation model pin for sticky multi-turn routing.
 */
export const setConversationModel = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      modelId: args.modelId,
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
 * This rejects the current proposal and sends the user's feedback to the AI
 * so it can propose a revised approach
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

    // Get the conversation to find organizationId and userId
    const conversation = await ctx.db.get(execution.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Build context message for the AI with the user's feedback
    const feedbackMessage = `The user reviewed your proposed "${execution.toolName}" action and wants changes:

**Original proposal:** ${execution.proposalMessage || "No description provided"}

**User's feedback:** ${args.instruction}

Please revise your approach based on this feedback and propose again.`;

    // Schedule the AI to process the feedback and respond
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctx.scheduler.runAfter(0, "ai/chat:sendMessage" as any, {
      conversationId: execution.conversationId,
      message: feedbackMessage,
      organizationId: conversation.organizationId,
      userId: conversation.userId,
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

/**
 * Aggregate chat model fallback rate for an organization.
 * Uses assistant aiMessages.modelResolution payloads.
 */
export const getModelFallbackRate = query({
  args: {
    organizationId: v.id("organizations"),
    hours: v.optional(v.number()),
    maxConversations: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const clampedHours = Math.min(Math.max(Math.floor(args.hours ?? 24), 1), 24 * 30);
    const since = Date.now() - clampedHours * 60 * 60 * 1000;
    const clampedConversationLimit = Math.min(
      Math.max(Math.floor(args.maxConversations ?? 250), 1),
      500
    );

    const conversations = await ctx.db
      .query("aiConversations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const recentConversations = conversations
      .filter((conversation) => conversation.updatedAt >= since)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, clampedConversationLimit);

    const records: ConversationModelResolutionRecord[] = [];
    for (const conversation of recentConversations) {
      const messages = await ctx.db
        .query("aiMessages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
        .collect();

      for (const message of messages) {
        if (message.role !== "assistant") {
          continue;
        }
        if (message.timestamp < since) {
          continue;
        }
        records.push({
          timestamp: message.timestamp,
          modelResolution: (message as Record<string, unknown>).modelResolution as
            | ConversationModelResolution
            | undefined,
        });
      }
    }

    const aggregation = aggregateConversationModelFallback(records, {
      windowHours: clampedHours,
      since,
    });

    return {
      source: "chat_conversations",
      scannedConversations: recentConversations.length,
      ...aggregation,
    };
  },
});
