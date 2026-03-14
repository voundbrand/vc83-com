/**
 * AI Conversations Management
 *
 * Queries and mutations for managing AI conversations and messages
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, mutation, query, type QueryCtx } from "../_generated/server";

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

async function getLayerWorkflowTitle(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  layerWorkflowId?: Id<"objects">
): Promise<string | undefined> {
  if (!layerWorkflowId) {
    return undefined;
  }

  const workflow = await ctx.db.get(layerWorkflowId);
  if (!workflow || workflow.organizationId !== organizationId) {
    return undefined;
  }

  return workflow.name;
}

interface ConversationModelResolution {
  requestedModel?: string;
  selectedModel: string;
  usedModel?: string;
  selectedAuthProfileId?: string;
  usedAuthProfileId?: string;
  selectionSource: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

export interface ConversationRoutingPin {
  modelId?: string;
  authProfileId?: string;
  pinReason: string;
  pinnedAt: number;
  updatedAt: number;
  unlockReason?: string;
  unlockedAt?: number;
}

export const CONVERSATION_CONTINUITY_CONTRACT_VERSION =
  "yai_conversation_continuity_v1" as const;

export type ConversationIngressSurface =
  | "chat"
  | "desktop"
  | "iphone"
  | "android"
  | "webchat"
  | "voice"
  | "camera";

export type ConversationIdempotencyIntentType =
  | "ingress"
  | "orchestration"
  | "proposal"
  | "commit";

export type ConversationIdempotencyReplayOutcome =
  | "accepted"
  | "duplicate_acknowledged"
  | "replay_previous_result"
  | "conflict_commit_in_progress";

interface ConversationCollaborationTelemetryInput {
  threadType?: "group_thread" | "dm_thread";
  threadId?: string;
  groupThreadId?: string;
  dmThreadId?: string;
  lineageId?: string;
  correlationId?: string;
  workflowKey?: string;
  authorityIntentType?: string;
}

export interface ConversationContinuityTelemetryInput {
  conversationId: string;
  organizationId: string;
  userId: string;
  ingressSurface: ConversationIngressSurface;
  previousIngressSurface?: ConversationIngressSurface;
  occurredAt?: number;
  collaboration?: ConversationCollaborationTelemetryInput;
  idempotencyKey: string;
  idempotencyContract?: {
    scopeKey?: string;
    payloadHash?: string;
    intentType?: string;
    replayOutcome?: string;
  };
}

export interface ConversationContinuityTelemetry {
  contractVersion: typeof CONVERSATION_CONTINUITY_CONTRACT_VERSION;
  organizationId: string;
  userId: string;
  conversationId: string;
  continuityKey: string;
  occurredAt: number;
  ingressSurface: ConversationIngressSurface;
  previousIngressSurface?: ConversationIngressSurface;
  crossChannelContinuation: boolean;
  sessionThreadType: "group_thread" | "dm_thread";
  sessionThreadId: string;
  groupThreadId: string;
  dmThreadId?: string;
  lineageId?: string;
  correlationId?: string;
  workflowKey?: string;
  authorityIntentType?: string;
  idempotency: {
    key: string;
    scopeKey: string;
    payloadHash?: string;
    intentType: ConversationIdempotencyIntentType;
    replayOutcome: ConversationIdempotencyReplayOutcome;
    isReplay: boolean;
  };
}

const CONVERSATION_IDEMPOTENCY_REPLAY_OUTCOMES = new Set<
  ConversationIdempotencyReplayOutcome
>([
  "accepted",
  "duplicate_acknowledged",
  "replay_previous_result",
  "conflict_commit_in_progress",
]);

const CONVERSATION_IDEMPOTENCY_REPLAY_ONLY_OUTCOMES = new Set<
  ConversationIdempotencyReplayOutcome
>([
  "duplicate_acknowledged",
  "replay_previous_result",
  "conflict_commit_in_progress",
]);

const CONVERSATION_IDEMPOTENCY_INTENT_TYPES = new Set<
  ConversationIdempotencyIntentType
>([
  "ingress",
  "orchestration",
  "proposal",
  "commit",
]);

function normalizeConversationIdempotencyReplayOutcome(
  value: unknown
): ConversationIdempotencyReplayOutcome {
  const normalized = normalizeNonEmptyString(value);
  if (
    normalized &&
    CONVERSATION_IDEMPOTENCY_REPLAY_OUTCOMES.has(
      normalized as ConversationIdempotencyReplayOutcome
    )
  ) {
    return normalized as ConversationIdempotencyReplayOutcome;
  }
  return "accepted";
}

function normalizeConversationIdempotencyIntentType(
  value: unknown
): ConversationIdempotencyIntentType {
  const normalized = normalizeNonEmptyString(value);
  if (
    normalized &&
    CONVERSATION_IDEMPOTENCY_INTENT_TYPES.has(
      normalized as ConversationIdempotencyIntentType
    )
  ) {
    return normalized as ConversationIdempotencyIntentType;
  }
  return "ingress";
}

/**
 * Build deterministic continuity telemetry for chat-first parity across desktop/mobile.
 * Contract aligns conversation-level routing pins with collaboration kernel identities.
 */
export function buildConversationContinuityTelemetry(
  input: ConversationContinuityTelemetryInput
): ConversationContinuityTelemetry {
  const conversationId = normalizeNonEmptyString(input.conversationId);
  const organizationId = normalizeNonEmptyString(input.organizationId);
  const userId = normalizeNonEmptyString(input.userId);
  const idempotencyKey = normalizeNonEmptyString(input.idempotencyKey);
  if (!conversationId || !organizationId || !userId || !idempotencyKey) {
    throw new Error(
      "Continuity telemetry requires non-empty conversationId, organizationId, userId, and idempotencyKey."
    );
  }

  const collaboration = input.collaboration;
  const groupThreadId =
    normalizeNonEmptyString(collaboration?.groupThreadId) || conversationId;
  const sessionThreadId =
    normalizeNonEmptyString(collaboration?.threadId) || groupThreadId;
  const sessionThreadType: "group_thread" | "dm_thread" =
    collaboration?.threadType === "dm_thread" ? "dm_thread" : "group_thread";
  const lineageId = normalizeNonEmptyString(collaboration?.lineageId);
  const continuityIdentity = lineageId || groupThreadId;
  const continuityKey = [
    organizationId,
    continuityIdentity,
    sessionThreadId,
  ].join(":");

  const idempotencyIntentType = normalizeConversationIdempotencyIntentType(
    input.idempotencyContract?.intentType || collaboration?.authorityIntentType
  );
  const idempotencyReplayOutcome =
    normalizeConversationIdempotencyReplayOutcome(
      input.idempotencyContract?.replayOutcome
    );
  const idempotencyScopeKey =
    normalizeNonEmptyString(input.idempotencyContract?.scopeKey) ||
    [organizationId, continuityIdentity, idempotencyIntentType].join(":");
  const occurredAt = normalizeOptionalTimestamp(input.occurredAt) ?? Date.now();
  const previousIngressSurface = input.previousIngressSurface;

  return {
    contractVersion: CONVERSATION_CONTINUITY_CONTRACT_VERSION,
    organizationId,
    userId,
    conversationId,
    continuityKey,
    occurredAt,
    ingressSurface: input.ingressSurface,
    previousIngressSurface,
    crossChannelContinuation:
      typeof previousIngressSurface === "string" &&
      previousIngressSurface !== input.ingressSurface,
    sessionThreadType,
    sessionThreadId,
    groupThreadId,
    dmThreadId: normalizeNonEmptyString(collaboration?.dmThreadId),
    lineageId,
    correlationId: normalizeNonEmptyString(collaboration?.correlationId),
    workflowKey: normalizeNonEmptyString(collaboration?.workflowKey),
    authorityIntentType: normalizeNonEmptyString(
      collaboration?.authorityIntentType
    ),
    idempotency: {
      key: idempotencyKey,
      scopeKey: idempotencyScopeKey,
      payloadHash: normalizeNonEmptyString(input.idempotencyContract?.payloadHash),
      intentType: idempotencyIntentType,
      replayOutcome: idempotencyReplayOutcome,
      isReplay: CONVERSATION_IDEMPOTENCY_REPLAY_ONLY_OUTCOMES.has(
        idempotencyReplayOutcome
      ),
    },
  };
}

interface ConversationModelResolutionRecord {
  timestamp: number;
  modelResolution?: ConversationModelResolution;
}

export interface SupportEscalationCriteriaInput {
  requestedHuman: boolean;
  billingDispute: boolean;
  accountSecurityRisk: boolean;
  legalRisk: boolean;
  unresolvedCheckFailures: number;
  frustrationSignals: number;
  unsupportedRequest: boolean;
}

export interface SupportEscalationDecision {
  shouldEscalate: boolean;
  urgency: "low" | "normal" | "high";
  matchedCriteria: string[];
}

/**
 * Deterministic support escalation contract used by support endpoints/workflows.
 * Any matched high-impact criterion forces escalation.
 */
export function evaluateSupportEscalationCriteria(
  input: SupportEscalationCriteriaInput
): SupportEscalationDecision {
  const matchedCriteria: string[] = [];

  if (input.requestedHuman) {
    matchedCriteria.push("explicit_human_request");
  }
  if (input.billingDispute) {
    matchedCriteria.push("billing_dispute_or_refund");
  }
  if (input.accountSecurityRisk) {
    matchedCriteria.push("account_or_security_risk");
  }
  if (input.legalRisk) {
    matchedCriteria.push("legal_or_compliance_risk");
  }
  if (input.unresolvedCheckFailures >= 2) {
    matchedCriteria.push("repeated_unresolved_verification");
  }
  if (input.frustrationSignals >= 2) {
    matchedCriteria.push("high_negative_sentiment");
  }
  if (input.unsupportedRequest) {
    matchedCriteria.push("unsupported_request_path");
  }

  const highUrgencyCriteria = new Set([
    "billing_dispute_or_refund",
    "account_or_security_risk",
    "legal_or_compliance_risk",
  ]);
  const shouldEscalate = matchedCriteria.length > 0;
  const urgency: "low" | "normal" | "high" = matchedCriteria.some((criterion) =>
    highUrgencyCriteria.has(criterion)
  )
    ? "high"
    : shouldEscalate
    ? "normal"
    : "low";

  return {
    shouldEscalate,
    urgency,
    matchedCriteria,
  };
}

async function hydrateMessagesWithAttachments(
  ctx: QueryCtx,
  messages: Array<{
    _id: Id<"aiMessages">;
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    collaboration?: {
      surface: "group" | "dm";
      threadType: "group_thread" | "dm_thread";
      threadId: string;
      groupThreadId: string;
      dmThreadId?: string;
      lineageId?: string;
      correlationId?: string;
      workflowKey?: string;
      authorityIntentType?: string;
      visibilityScope: "group" | "dm" | "operator_only" | "system";
      specialistAgentId?: string;
      specialistLabel?: string;
    };
    timestamp: number;
  }>
) {
  return await Promise.all(
    messages.map(async (message) => {
      const attachments = await ctx.db
        .query("aiMessageAttachments")
        .withIndex("by_message", (q) => q.eq("messageId", message._id))
        .collect();

      if (!attachments || attachments.length === 0) {
        return message;
      }

      const resolvedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          const url = await ctx.storage.getUrl(attachment.storageId);
          return {
            _id: attachment._id,
            kind: attachment.kind,
            storageId: attachment.storageId,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            width: attachment.width,
            height: attachment.height,
            url: url ?? undefined,
          };
        })
      );

      return {
        ...message,
        attachments: resolvedAttachments,
      };
    })
  );
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

function normalizeNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptionalTimestamp(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizeConversationModelResolution(
  value: unknown
): ConversationModelResolution | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const selectedModel = normalizeNonEmptyString(record.selectedModel);
  const selectionSource = normalizeNonEmptyString(record.selectionSource);
  if (!selectedModel || !selectionSource) {
    return null;
  }
  if (typeof record.fallbackUsed !== "boolean") {
    return null;
  }

  return {
    requestedModel: normalizeNonEmptyString(record.requestedModel),
    selectedModel,
    usedModel: normalizeNonEmptyString(record.usedModel),
    selectedAuthProfileId: normalizeNonEmptyString(record.selectedAuthProfileId),
    usedAuthProfileId: normalizeNonEmptyString(record.usedAuthProfileId),
    selectionSource,
    fallbackUsed: record.fallbackUsed,
    fallbackReason: normalizeNonEmptyString(record.fallbackReason),
  };
}

export function normalizeConversationRoutingPin(
  value: unknown
): ConversationRoutingPin | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const modelId = normalizeNonEmptyString(record.modelId);
  const authProfileId = normalizeNonEmptyString(record.authProfileId);
  const pinReason = normalizeNonEmptyString(record.pinReason);
  const pinnedAt = normalizeOptionalTimestamp(record.pinnedAt);
  const updatedAt = normalizeOptionalTimestamp(record.updatedAt);
  if (!pinReason || pinnedAt === undefined || updatedAt === undefined) {
    return null;
  }

  return {
    modelId,
    authProfileId,
    pinReason,
    pinnedAt,
    updatedAt,
    unlockReason: normalizeNonEmptyString(record.unlockReason),
    unlockedAt: normalizeOptionalTimestamp(record.unlockedAt),
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
    const normalized = normalizeConversationModelResolution(record.modelResolution);
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
    layerWorkflowId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Generate slug from title or use a default
    const slug = generateSlug(args.title || "new-conversation");

    return await ctx.db.insert("aiConversations", {
      organizationId: args.organizationId,
      userId: args.userId,
      layerWorkflowId: args.layerWorkflowId,
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

    const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);
    const hydratedMessages = await hydrateMessagesWithAttachments(ctx, sortedMessages);
    const layerWorkflowTitle = await getLayerWorkflowTitle(
      ctx,
      conversation.organizationId,
      conversation.layerWorkflowId
    );

    return {
      ...conversation,
      layerWorkflowTitle,
      messages: hydratedMessages,
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

    const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);
    const hydratedMessages = await hydrateMessagesWithAttachments(ctx, sortedMessages);
    const layerWorkflowTitle = await getLayerWorkflowTitle(
      ctx,
      conversation.organizationId,
      conversation.layerWorkflowId
    );

    return {
      ...conversation,
      layerWorkflowTitle,
      messages: hydratedMessages,
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

    const workflowTitleById = new Map<string, string>();
    const workflowIds = new Set<string>();

    for (const conversation of conversations) {
      if (conversation.layerWorkflowId) {
        workflowIds.add(conversation.layerWorkflowId);
      }
    }

    for (const workflowId of workflowIds) {
      const workflow = await ctx.db.get(workflowId as Id<"objects">);
      if (workflow && workflow.organizationId === args.organizationId) {
        workflowTitleById.set(workflowId, workflow.name);
      }
    }

    return conversations.map((conversation) => ({
      ...conversation,
      layerWorkflowTitle: conversation.layerWorkflowId
        ? workflowTitleById.get(conversation.layerWorkflowId)
        : undefined,
    }));
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
      usedModel: v.optional(v.string()),
      selectedAuthProfileId: v.optional(v.string()),
      usedAuthProfileId: v.optional(v.string()),
      selectionSource: v.string(),
      fallbackUsed: v.boolean(),
      fallbackReason: v.optional(v.string()),
    })),
    collaboration: v.optional(v.object({
      surface: v.union(v.literal("group"), v.literal("dm")),
      threadType: v.union(v.literal("group_thread"), v.literal("dm_thread")),
      threadId: v.string(),
      groupThreadId: v.string(),
      dmThreadId: v.optional(v.string()),
      lineageId: v.optional(v.string()),
      correlationId: v.optional(v.string()),
      workflowKey: v.optional(v.string()),
      authorityIntentType: v.optional(v.string()),
      visibilityScope: v.union(
        v.literal("group"),
        v.literal("dm"),
        v.literal("operator_only"),
        v.literal("system"),
      ),
      specialistAgentId: v.optional(v.string()),
      specialistLabel: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const messageModelId = args.modelResolution?.usedModel ?? args.modelResolution?.selectedModel;
    // Add message
    const messageId = await ctx.db.insert("aiMessages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      timestamp: args.timestamp,
      toolCalls: args.toolCalls,
      modelResolution: args.modelResolution,
      modelId: messageModelId,
      collaboration: args.collaboration,
    });

    // Update conversation timestamp
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation) {
      await ctx.db.patch(args.conversationId, {
        modelId: messageModelId ?? conversation.modelId,
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
 * Upsert conversation-level routing pin metadata (model + auth profile).
 * Mirrors agent session pin payload so desktop chat follows deterministic parity.
 */
export const upsertConversationRoutingPin = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    modelId: v.optional(v.string()),
    authProfileId: v.optional(v.string()),
    pinReason: v.string(),
    unlockReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    const now = Date.now();
    const existingPin = normalizeConversationRoutingPin(
      (conversation as Record<string, unknown>).routingPin
    );
    const nextModelId = args.modelId ?? existingPin?.modelId;

    await ctx.db.patch(args.conversationId, {
      routingPin: {
        modelId: nextModelId,
        authProfileId: args.authProfileId ?? existingPin?.authProfileId,
        pinReason: args.pinReason,
        pinnedAt: existingPin?.pinnedAt ?? now,
        updatedAt: now,
        unlockReason: args.unlockReason,
        unlockedAt: args.unlockReason ? now : undefined,
      },
      modelId: nextModelId ?? conversation.modelId,
      updatedAt: now,
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
    const now = Date.now();

    for (const message of messages) {
      const attachments = await ctx.db
        .query("aiMessageAttachments")
        .withIndex("by_message", (q) => q.eq("messageId", message._id))
        .collect();
      for (const attachment of attachments) {
        await ctx.db.patch(attachment._id, {
          messageId: undefined,
          status: "orphaned",
          updatedAt: now,
        });
      }
      await ctx.db.delete(message._id);
    }

    // Update conversation timestamp
    await ctx.db.patch(args.conversationId, {
      updatedAt: now,
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
const evalRunEnvelopeMutationValidator = v.object({
  contractVersion: v.literal("wae_eval_run_envelope_v1"),
  runId: v.string(),
  scenarioId: v.optional(v.string()),
  agentId: v.optional(v.string()),
  label: v.optional(v.string()),
  toolCallId: v.optional(v.string()),
  toolCallRound: v.optional(v.number()),
  verdict: v.optional(
    v.union(v.literal("passed"), v.literal("failed"), v.literal("blocked")),
  ),
  artifactPointer: v.optional(v.string()),
  timings: v.object({
    turnStartedAt: v.number(),
    toolStartedAt: v.number(),
    toolCompletedAt: v.number(),
    durationMs: v.number(),
  }),
});

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
    evalEnvelope: v.optional(evalRunEnvelopeMutationValidator),
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
      evalEnvelope: args.evalEnvelope,
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
    evalEnvelope: v.optional(evalRunEnvelopeMutationValidator),
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
      evalEnvelope: args.evalEnvelope,
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

export const listActiveConversationCountsByWorkflow = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    workflowIds: v.array(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const counts = await Promise.all(
      args.workflowIds.map(async (workflowId) => {
        const activeConversations = await ctx.db
          .query("aiConversations")
          .withIndex("by_workflow", (q) => q.eq("layerWorkflowId", workflowId))
          .filter((q) =>
            q.and(
              q.eq(q.field("organizationId"), args.organizationId),
              q.eq(q.field("status"), "active"),
            ),
          )
          .collect();

        return {
          layerWorkflowId: workflowId,
          activeConversationCount: activeConversations.length,
        };
      }),
    );

    return counts;
  },
});
