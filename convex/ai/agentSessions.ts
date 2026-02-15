/**
 * AGENT SESSION MANAGEMENT
 *
 * Manages conversations between org agents and external contacts.
 * Sessions are keyed by org + channel + external contact identifier.
 *
 * Flow:
 * 1. Inbound message arrives → resolveSession() finds or creates session
 * 2. resolveContact() matches external identifier to CRM contact
 * 3. Messages stored in agentSessionMessages
 * 4. Stats updated after each exchange
 */

import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";

// ============================================================================
// SESSION RESOLUTION (Internal — called by execution pipeline)
// ============================================================================

/**
 * Find or create a session for this org + channel + contact
 */
export const resolveSession = internalMutation({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    // Look for existing active session
    const existing = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_channel_contact", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("channel", args.channel)
          .eq("externalContactIdentifier", args.externalContactIdentifier)
      )
      .first();

    if (existing && existing.status === "active") {
      return existing;
    }

    // Create new session
    const sessionId = await ctx.db.insert("agentSessions", {
      agentId: args.agentId,
      organizationId: args.organizationId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
      status: "active",
      messageCount: 0,
      tokensUsed: 0,
      costUsd: 0,
      startedAt: Date.now(),
      lastMessageAt: Date.now(),
    });

    return await ctx.db.get(sessionId);
  },
});

/**
 * Resolve external identifier to CRM contact
 * Matches by phone (WhatsApp/SMS) or email
 */
export const resolveContact = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    identifier: v.string(),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
      )
      .collect();

    const identifier = args.identifier.toLowerCase().trim();

    // Match by phone for phone-based channels
    if (["whatsapp", "sms"].includes(args.channel)) {
      const match = contacts.find((c) => {
        const props = c.customProperties as Record<string, unknown> | undefined;
        const phone = String(props?.phone || "").replace(/\s+/g, "");
        return phone === identifier.replace(/\s+/g, "");
      });
      if (match) return match;
    }

    // Match by email
    const emailMatch = contacts.find((c) => {
      const props = c.customProperties as Record<string, unknown> | undefined;
      return String(props?.email || "").toLowerCase() === identifier;
    });

    return emailMatch ?? null;
  },
});

/**
 * Link a CRM contact to a session
 */
export const linkContactToSession = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    crmContactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      crmContactId: args.crmContactId,
    });
  },
});

// ============================================================================
// MESSAGE MANAGEMENT (Internal)
// ============================================================================

/**
 * Get conversation history for a session
 */
export const getSessionMessages = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Return most recent N messages, sorted by timestamp
    const sorted = messages.sort((a, b) => a.timestamp - b.timestamp);
    const limit = args.limit || 20;
    return sorted.slice(-limit);
  },
});

/**
 * Add a message to a session
 */
export const addSessionMessage = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    toolCalls: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentSessionMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      toolCalls: args.toolCalls,
      timestamp: Date.now(),
    });
  },
});

// ============================================================================
// SESSION STATS (Internal)
// ============================================================================

/**
 * Update session stats after a message exchange
 */
export const updateSessionStats = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    tokensUsed: v.number(),
    costUsd: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;

    await ctx.db.patch(args.sessionId, {
      messageCount: session.messageCount + 1,
      tokensUsed: session.tokensUsed + args.tokensUsed,
      costUsd: session.costUsd + args.costUsd,
      lastMessageAt: Date.now(),
    });
  },
});

/**
 * Check if agent is within rate limits
 */
export const checkAgentRateLimit = internalQuery({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    maxMessagesPerDay: v.number(),
    maxCostPerDay: v.number(),
  },
  handler: async (ctx, args) => {
    const dayStart = Date.now() - 24 * 60 * 60 * 1000;

    // Get all sessions for this agent today
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    const todaySessions = sessions.filter((s) => s.lastMessageAt >= dayStart);

    const totalMessages = todaySessions.reduce((sum, s) => sum + s.messageCount, 0);
    const totalCost = todaySessions.reduce((sum, s) => sum + s.costUsd, 0);

    if (totalMessages >= args.maxMessagesPerDay) {
      return { allowed: false, message: `Daily message limit reached (${args.maxMessagesPerDay})` };
    }

    if (totalCost >= args.maxCostPerDay) {
      return { allowed: false, message: `Daily cost limit reached ($${args.maxCostPerDay})` };
    }

    return { allowed: true, message: "OK", messagesRemaining: args.maxMessagesPerDay - totalMessages };
  },
});

// ============================================================================
// AUDIT LOGGING (Internal)
// ============================================================================

/**
 * Log an agent action to the objectActions audit trail
 */
export const logAgentAction = internalMutation({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    actionType: v.string(),
    actionData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: args.agentId,
      actionType: args.actionType,
      actionData: args.actionData || {},
      performedBy: args.agentId, // Agent performed the action
      performedAt: Date.now(),
    });
  },
});

// ============================================================================
// SESSION LIFECYCLE (Mix of internal + authenticated)
// ============================================================================

/**
 * Close a session
 */
export const closeSession = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "closed",
    });
  },
});

/**
 * Hand off session to a human user (requires auth)
 */
export const handOffSession = mutation({
  args: {
    sessionId: v.string(),
    agentSessionId: v.id("agentSessions"),
    handOffToUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.agentSessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(args.agentSessionId, {
      status: "handed_off",
      handedOffTo: args.handOffToUserId,
    });

    // Log handoff
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: session.agentId,
      actionType: "session_handed_off",
      actionData: {
        sessionId: args.agentSessionId,
        handedOffTo: args.handOffToUserId,
      },
      performedAt: Date.now(),
    });
  },
});

/**
 * Get active sessions for an org (for UI dashboard)
 */
/**
 * Get recent sessions for an agent (used by soul evolution reflection).
 */
export const getRecentSessionsForAgent = internalQuery({
  args: {
    agentId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit ?? 20);
    return sessions;
  },
});

export const getActiveSessions = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", (args.status || "active") as "active" | "closed" | "handed_off")
      )
      .collect();

    return sessions;
  },
});
