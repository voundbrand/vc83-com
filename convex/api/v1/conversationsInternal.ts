/**
 * INTERNAL: Conversations API queries/mutations
 *
 * Wraps the internal agentSessions functions for the public REST API.
 * These are called by the HTTP action handlers in conversations.ts.
 */

import { v } from "convex/values";
import { internalQuery, internalMutation, query } from "../../_generated/server";
import type { QueryCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import {
  AGENT_LIFECYCLE_CHECKPOINT_VALUES,
  resolveSessionLifecycleState,
} from "../../ai/agentLifecycle";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  validateTrustEventPayload,
} from "../../ai/trustEvents";
import { requireAuthenticatedUser } from "../../rbacHelpers";

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

const TIMELINE_EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const TIMELINE_PHONE_PATTERN = /\b\+?[\d\s\-().]{10,}\b/g;
const DEFAULT_TIMELINE_LIMIT = 20;

export interface OperatorTimelineCard {
  id: string;
  missionId: string;
  attemptId: string;
  bookingId?: string;
  channel: string;
  attemptIndex?: number;
  reasonCode?: string;
  status: string;
  result?: string;
  requestedAt?: number;
  completedAt?: number;
  failureReason?: string;
  telephonyOutcome?: string;
  telephonyDisposition?: string;
  voicemailDetected?: boolean;
  transcriptSnippet?: string;
  redacted: true;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function redactTimelineText(value: string): string {
  return value
    .replace(TIMELINE_EMAIL_PATTERN, "[redacted-email]")
    .replace(TIMELINE_PHONE_PATTERN, "[redacted-phone]")
    .trim();
}

function buildTranscriptSnippet(value: unknown): string | undefined {
  const transcript = normalizeOptionalString(value);
  if (!transcript) {
    return undefined;
  }
  const redacted = redactTimelineText(transcript);
  if (redacted.length <= 180) {
    return redacted;
  }
  return `${redacted.slice(0, 180)}...`;
}

function collectMissionIdsFromValue(
  value: unknown,
  missionIds: Set<string>,
  depth = 0
): void {
  if (depth > 8 || value === null || value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectMissionIdsFromValue(entry, missionIds, depth + 1);
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  const record = value as Record<string, unknown>;
  const missionId = normalizeOptionalString(record.missionId);
  if (missionId) {
    missionIds.add(missionId);
  }
  for (const nested of Object.values(record)) {
    collectMissionIdsFromValue(nested, missionIds, depth + 1);
  }
}

function collectMissionIdsFromMessages(
  messages: Array<{ toolCalls?: unknown }>
): Set<string> {
  const missionIds = new Set<string>();
  for (const message of messages) {
    if (!message || message.toolCalls === undefined) {
      continue;
    }
    collectMissionIdsFromValue(message.toolCalls, missionIds);
  }
  return missionIds;
}

function resolveFailureReason(args: {
  attemptStatus: string;
  attemptResult?: string;
  attemptResultReason?: string;
  attemptError?: string;
  telephonyOutcome?: string;
  telephonyDisposition?: string;
}): string | undefined {
  if (args.attemptResultReason) {
    return args.attemptResultReason;
  }
  if (args.attemptError) {
    return args.attemptError;
  }
  if (args.attemptStatus === "failed") {
    return args.telephonyOutcome || args.telephonyDisposition || "attempt_failed";
  }
  if (args.attemptResult === "failed") {
    return args.telephonyOutcome || args.telephonyDisposition || "attempt_failed";
  }
  if (args.attemptResult === "skipped") {
    return "attempt_skipped";
  }
  return undefined;
}

async function buildOperatorTimelineCards(args: {
  ctx: QueryCtx;
  organizationId: Id<"organizations">;
  messages: Array<{ toolCalls?: unknown }>;
  limit?: number;
}): Promise<OperatorTimelineCard[]> {
  const missionIds = collectMissionIdsFromMessages(args.messages);
  if (missionIds.size === 0) {
    return [];
  }

  const outreachAttempts = await args.ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", args.organizationId).eq("type", "appointment_outreach_attempt")
    )
    .collect();

  const filteredAttempts = outreachAttempts.filter((attempt) => {
    const props = (attempt.customProperties || {}) as Record<string, unknown>;
    const missionId = normalizeOptionalString(props.missionId);
    return Boolean(missionId && missionIds.has(missionId));
  });

  if (filteredAttempts.length === 0) {
    return [];
  }

  const attemptIdSet = new Set<string>(filteredAttempts.map((attempt) => String(attempt._id)));
  const callRecords = await args.ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", args.organizationId).eq("type", "telephony_call_record")
    )
    .collect();

  const filteredCallRecords = callRecords
    .filter((record) => {
      const props = (record.customProperties || {}) as Record<string, unknown>;
      const missionId = normalizeOptionalString(props.missionId);
      const attemptId = normalizeOptionalString(props.attemptId);
      return Boolean(
        (missionId && missionIds.has(missionId))
          || (attemptId && attemptIdSet.has(attemptId))
      );
    })
    .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));

  const callRecordByAttemptId = new Map<string, Record<string, unknown>>();
  const callRecordByMissionId = new Map<string, Record<string, unknown>>();
  for (const record of filteredCallRecords) {
    const props = (record.customProperties || {}) as Record<string, unknown>;
    const attemptId = normalizeOptionalString(props.attemptId);
    const missionId = normalizeOptionalString(props.missionId);
    if (attemptId && !callRecordByAttemptId.has(attemptId)) {
      callRecordByAttemptId.set(attemptId, props);
    }
    if (missionId && !callRecordByMissionId.has(missionId)) {
      callRecordByMissionId.set(missionId, props);
    }
  }

  const timelineCards = filteredAttempts.map((attempt): OperatorTimelineCard => {
    const attemptId = String(attempt._id);
    const attemptProps = (attempt.customProperties || {}) as Record<string, unknown>;
    const missionId = normalizeOptionalString(attemptProps.missionId) || "unknown";
    const linkedCallProps =
      callRecordByAttemptId.get(attemptId) || callRecordByMissionId.get(missionId);

    const telephonyOutcome =
      normalizeOptionalString(attemptProps.telephonyOutcome)
      || normalizeOptionalString(linkedCallProps?.outcome);
    const telephonyDisposition =
      normalizeOptionalString(attemptProps.telephonyDisposition)
      || normalizeOptionalString(linkedCallProps?.disposition);
    const transcriptSnippet = buildTranscriptSnippet(
      linkedCallProps?.transcriptText || attemptProps.transcriptText
    );
    const attemptStatus = normalizeOptionalString(attempt.status) || "unknown";
    const attemptResult = normalizeOptionalString(attemptProps.result);
    const attemptVoicemailDetected = normalizeOptionalBoolean(
      attemptProps.voicemailDetected
    );
    const callVoicemailDetected = normalizeOptionalBoolean(
      linkedCallProps?.voicemailDetected
    );
    const failureReason = resolveFailureReason({
      attemptStatus,
      attemptResult,
      attemptResultReason: normalizeOptionalString(attemptProps.resultReason),
      attemptError: normalizeOptionalString(attemptProps.error),
      telephonyOutcome,
      telephonyDisposition,
    });

    return {
      id: `${missionId}:${attemptId}`,
      missionId,
      attemptId,
      bookingId: normalizeOptionalString(attemptProps.bookingId),
      channel:
        normalizeOptionalString(attemptProps.channel)
        || normalizeOptionalString(attempt.subtype)
        || "unknown",
      attemptIndex: normalizeOptionalNumber(attemptProps.attemptIndex),
      reasonCode: normalizeOptionalString(attemptProps.reasonCode),
      status: attemptStatus,
      result: attemptResult,
      requestedAt: normalizeOptionalNumber(attemptProps.requestedAt),
      completedAt:
        normalizeOptionalNumber(attemptProps.completedAt)
        || normalizeOptionalNumber(linkedCallProps?.endedAt),
      failureReason,
      telephonyOutcome,
      telephonyDisposition,
      voicemailDetected:
        attemptVoicemailDetected !== undefined
          ? attemptVoicemailDetected
          : callVoicemailDetected,
      transcriptSnippet,
      redacted: true,
    };
  });

  timelineCards.sort((left, right) => {
    const leftTime = left.requestedAt || left.completedAt || 0;
    const rightTime = right.requestedAt || right.completedAt || 0;
    return rightTime - leftTime;
  });

  const limit = Math.max(1, Math.min(args.limit || DEFAULT_TIMELINE_LIMIT, 100));
  return timelineCards.slice(0, limit);
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
      escalationState: session.escalationState,
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
    const operatorTimelineCards = await buildOperatorTimelineCards({
      ctx,
      organizationId: args.organizationId,
      messages,
      limit: DEFAULT_TIMELINE_LIMIT,
    });

    return {
      messages: paged.map((m) => ({
        id: m._id,
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        timestamp: m.timestamp,
      })),
      operatorTimelineCards,
      operatorTimelineTotal: operatorTimelineCards.length,
      total: messages.length,
      limit,
      offset,
    };
  },
});

/**
 * GET CONVERSATION TIMELINE CARDS (authenticated UI query)
 *
 * Returns outreach/call attempt cards with redacted transcript snippets.
 */
export const getConversationTimelineCardsAuth = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    agentSessionId: v.id("agentSessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    if (String(auth.organizationId) !== String(args.organizationId)) {
      throw new Error("Unauthorized organization access");
    }

    const session = await ctx.db.get(args.agentSessionId);
    if (!session || String(session.organizationId) !== String(args.organizationId)) {
      return {
        timelineCards: [] as OperatorTimelineCard[],
        total: 0,
      };
    }

    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.agentSessionId))
      .collect();
    messages.sort((a, b) => a.timestamp - b.timestamp);

    const timelineCards = await buildOperatorTimelineCards({
      ctx,
      organizationId: args.organizationId,
      messages,
      limit: args.limit,
    });

    return {
      timelineCards,
      total: timelineCards.length,
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
