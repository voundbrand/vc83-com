/**
 * INTERNAL: Conversations API queries/mutations
 *
 * Wraps the internal agentSessions functions for the public REST API.
 * These are called by the HTTP action handlers in conversations.ts.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../../_generated/server";
import {
  AGENT_LIFECYCLE_CHECKPOINT_VALUES,
  resolveSessionLifecycleState,
} from "../../ai/agentLifecycle";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  validateTrustEventPayload,
} from "../../ai/trustEvents";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

const LIFECYCLE_CHECKPOINT_SET = new Set<string>(AGENT_LIFECYCLE_CHECKPOINT_VALUES);

function resolveOperatorReplyReason(reason?: string): string {
  if (typeof reason !== "string") {
    return "operator_reply_in_stream";
  }
  const normalized = reason.trim();
  return normalized.length > 0 ? normalized : "operator_reply_in_stream";
}

function resolveLifecycleCheckpoint(checkpoint?: unknown): string {
  if (typeof checkpoint === "string" && LIFECYCLE_CHECKPOINT_SET.has(checkpoint)) {
    return checkpoint;
  }
  return "escalation_taken_over";
}

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
    reason: v.optional(v.string()),
    note: v.optional(v.string()),
    providerConversationId: v.optional(v.string()),
    performedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify org ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || String(session.organizationId) !== String(args.organizationId)) {
      throw new Error("Session not found");
    }

    if (session.status !== "handed_off") {
      throw new Error("reply_in_stream requires handed_off session status");
    }

    const content = args.content.trim();
    if (content.length === 0) {
      throw new Error("Message content cannot be empty");
    }

    const now = Date.now();
    const reason = resolveOperatorReplyReason(args.reason);
    const actorId = args.performedBy?.trim() || "operator_api";
    const lifecycleState = resolveSessionLifecycleState(session);
    const lifecycleCheckpoint = resolveLifecycleCheckpoint(session.lifecycleCheckpoint);

    const deliveryResult = await (ctx as any).runAction(
      generatedApi.internal.channels.router.sendMessage,
      {
        organizationId: args.organizationId,
        channel: session.channel,
        recipientIdentifier: session.externalContactIdentifier,
        content,
        providerConversationId: args.providerConversationId,
      }
    ) as {
      success?: boolean;
      error?: string;
      providerMessageId?: string;
    };

    if (!deliveryResult?.success) {
      const deliveryError = deliveryResult?.error || "channel_delivery_failed";

      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: session.agentId,
        actionType: "session_reply_in_stream_failed",
        actionData: {
          sessionId: args.sessionId,
          threadId: args.sessionId,
          channel: session.channel,
          externalContactIdentifier: session.externalContactIdentifier,
          lifecycleState,
          lifecycleCheckpoint,
          reason,
          note: args.note,
          deliveryError,
          providerConversationId: args.providerConversationId,
        },
        performedAt: now,
      });

      throw new Error(`Failed to deliver operator reply: ${deliveryError}`);
    }

    // Persist delivered operator reply as outbound assistant turn.
    const messageId = await ctx.db.insert("agentSessionMessages", {
      sessionId: args.sessionId,
      role: "assistant",
      content,
      timestamp: now,
    });

    const escalationState = session.escalationState;
    if (escalationState?.status === "taken_over") {
      await ctx.db.patch(args.sessionId, {
        messageCount: session.messageCount + 1,
        lastMessageAt: now,
        escalationState: {
          ...escalationState,
          status: "taken_over",
          humanMessages: [
            ...(escalationState.humanMessages || []),
            content,
          ],
        },
      });
    } else {
      await ctx.db.patch(args.sessionId, {
        messageCount: session.messageCount + 1,
        lastMessageAt: now,
      });
    }

    const trustEventPayload = {
      event_id: `trust.lifecycle.operator_reply_in_stream.v1:${args.sessionId}:${messageId}:${now}`,
      event_version: TRUST_EVENT_TAXONOMY_VERSION,
      occurred_at: now,
      org_id: args.organizationId,
      mode: "lifecycle" as const,
      channel: session.channel || "runtime",
      session_id: String(args.sessionId),
      actor_type: "user" as const,
      actor_id: actorId,
      lifecycle_state_from: lifecycleState,
      lifecycle_state_to: lifecycleState,
      lifecycle_checkpoint: lifecycleCheckpoint,
      lifecycle_transition_actor: "operator",
      lifecycle_transition_reason: reason,
    };

    const trustValidation = validateTrustEventPayload(
      "trust.lifecycle.operator_reply_in_stream.v1",
      trustEventPayload,
    );

    await ctx.db.insert("aiTrustEvents", {
      event_name: "trust.lifecycle.operator_reply_in_stream.v1",
      payload: trustEventPayload,
      schema_validation_status: trustValidation.ok ? "passed" : "failed",
      schema_errors: trustValidation.ok ? undefined : trustValidation.errors,
      created_at: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: session.agentId,
      actionType: "session_reply_in_stream",
      actionData: {
        sessionId: args.sessionId,
        threadId: args.sessionId,
        channel: session.channel,
        externalContactIdentifier: session.externalContactIdentifier,
        lifecycleState,
        lifecycleCheckpoint,
        reason,
        note: args.note,
        providerConversationId: args.providerConversationId,
        providerMessageId: deliveryResult.providerMessageId,
        trustEventName: "trust.lifecycle.operator_reply_in_stream.v1",
        trustEventId: trustEventPayload.event_id,
      },
      performedAt: now,
    });

    return {
      messageId,
      providerMessageId: deliveryResult.providerMessageId,
      trustEventId: trustEventPayload.event_id,
    };
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
