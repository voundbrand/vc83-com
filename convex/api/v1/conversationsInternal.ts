/**
 * INTERNAL: Conversations API queries/mutations
 *
 * Wraps the internal agentSessions functions for the public REST API.
 * These are called by the HTTP action handlers in conversations.ts.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";

/**
 * LIST CONVERSATIONS
 *
 * Lists agent sessions for an organization with optional filters.
 */
export const listConversationsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    channel: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let sessions;

    if (args.status) {
      sessions = await ctx.db
        .query("agentSessions")
        .withIndex("by_org_status", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("status", args.status as "active" | "closed" | "handed_off")
        )
        .collect();
    } else {
      // Get all sessions for org by querying each status
      const active = await ctx.db
        .query("agentSessions")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "active")
        )
        .collect();
      const closed = await ctx.db
        .query("agentSessions")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "closed")
        )
        .collect();
      const handedOff = await ctx.db
        .query("agentSessions")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "handed_off")
        )
        .collect();
      sessions = [...active, ...handedOff, ...closed];
    }

    // Filter by channel if specified
    if (args.channel) {
      sessions = sessions.filter((s) => s.channel === args.channel);
    }

    // Sort by lastMessageAt desc
    sessions.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 50, 200);
    const paged = sessions.slice(offset, offset + limit);

    return {
      conversations: paged.map((s) => ({
        id: s._id,
        agentId: s.agentId,
        channel: s.channel,
        status: s.status,
        externalContactIdentifier: s.externalContactIdentifier,
        crmContactId: s.crmContactId,
        handedOffTo: s.handedOffTo,
        messageCount: s.messageCount,
        tokensUsed: s.tokensUsed,
        costUsd: s.costUsd,
        startedAt: s.startedAt,
        lastMessageAt: s.lastMessageAt,
      })),
      total: sessions.length,
      limit,
      offset,
    };
  },
});

/**
 * GET CONVERSATION DETAIL
 *
 * Returns a single session by ID with org ownership check.
 */
export const getConversationInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Verify org ownership
    if (String(session.organizationId) !== String(args.organizationId)) {
      return null;
    }

    return {
      id: session._id,
      agentId: session.agentId,
      channel: session.channel,
      status: session.status,
      externalContactIdentifier: session.externalContactIdentifier,
      crmContactId: session.crmContactId,
      handedOffTo: session.handedOffTo,
      messageCount: session.messageCount,
      tokensUsed: session.tokensUsed,
      costUsd: session.costUsd,
      startedAt: session.startedAt,
      lastMessageAt: session.lastMessageAt,
    };
  },
});

/**
 * GET CONVERSATION MESSAGES
 *
 * Returns message history for a session.
 */
export const getConversationMessagesInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify org ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || String(session.organizationId) !== String(args.organizationId)) {
      return null;
    }

    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Sort by timestamp asc
    messages.sort((a, b) => a.timestamp - b.timestamp);

    const offset = args.offset || 0;
    const limit = Math.min(args.limit || 100, 500);
    const paged = messages.slice(offset, offset + limit);

    return {
      messages: paged.map((m) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        timestamp: m.timestamp,
      })),
      total: messages.length,
      limit,
      offset,
    };
  },
});

/**
 * SEND MESSAGE (Human Takeover)
 *
 * Allows a human agent to inject a message into a conversation.
 */
export const sendMessageInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
    content: v.string(),
    performedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify org ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || String(session.organizationId) !== String(args.organizationId)) {
      throw new Error("Session not found");
    }

    // Only allow messages to active or handed_off sessions
    if (session.status === "closed") {
      throw new Error("Cannot send message to a closed session");
    }

    // Insert the human message
    const messageId = await ctx.db.insert("agentSessionMessages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.content,
      timestamp: Date.now(),
    });

    // Update session stats
    await ctx.db.patch(args.sessionId, {
      messageCount: session.messageCount + 1,
      lastMessageAt: Date.now(),
    });

    return { messageId };
  },
});

/**
 * UPDATE CONVERSATION STATUS
 *
 * Close or hand off a conversation.
 */
export const updateConversationStatusInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.id("agentSessions"),
    status: v.union(v.literal("closed"), v.literal("handed_off"), v.literal("active")),
    handOffToUserId: v.optional(v.string()),
    performedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify org ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || String(session.organizationId) !== String(args.organizationId)) {
      throw new Error("Session not found");
    }

    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "handed_off" && args.handOffToUserId) {
      patch.handedOffTo = args.handOffToUserId;
    }

    await ctx.db.patch(args.sessionId, patch);

    // Log the status change
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: session.agentId,
      actionType: `session_${args.status}`,
      actionData: {
        sessionId: args.sessionId,
        previousStatus: session.status,
        handOffToUserId: args.handOffToUserId,
      },
      performedAt: Date.now(),
    });
  },
});
