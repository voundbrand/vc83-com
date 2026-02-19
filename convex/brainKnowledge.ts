import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthenticatedUser, requirePermission } from "./rbacHelpers";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  validateTrustEventPayload,
  type TrustEventName,
  type TrustEventPayload,
} from "./ai/trustEvents";

type BrainKnowledgeCategory = "content_dna" | "documents" | "links" | "notes";
type BrainTeachSourceType = "pdf" | "audio" | "link" | "text";
type BrainIngestStatus = "submitted" | "processed" | "failed";

interface BrainKnowledgeItem {
  id: string;
  category: BrainKnowledgeCategory;
  title: string;
  description: string;
  source: string;
  createdAt: number;
  linkUrl?: string;
  sourceObjectIds: string[];
}

const EMPTY_COUNTS = {
  all: 0,
  content_dna: 0,
  documents: 0,
  links: 0,
  notes: 0,
} as const;

const BRAIN_TRUST_CHANNEL = "brain_teach";
const BRAIN_CONSENT_PROMPT_VERSION = "brain-teach-ingestion-v1";

function mapSourceTypeToCategory(sourceType: BrainTeachSourceType): BrainKnowledgeCategory {
  switch (sourceType) {
    case "link":
      return "links";
    case "text":
      return "notes";
    default:
      return "documents";
  }
}

function mapSourceTypeToKnowledgeKind(sourceType: BrainTeachSourceType): string {
  switch (sourceType) {
    case "link":
      return "link";
    case "text":
      return "text";
    case "audio":
      return "audio";
    default:
      return "document";
  }
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("A URL is required.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  return parsed.toString();
}

type BrainCtx = QueryCtx | MutationCtx;

function buildExtractedSummary(extractedData: Record<string, unknown> | undefined): string {
  if (!extractedData) {
    return "Interview-derived profile";
  }

  const entries = Object.entries(extractedData)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .slice(0, 3)
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`);

  if (entries.length === 0) {
    return "Interview-derived profile";
  }

  return entries.join(". ");
}

function buildTrustArtifactSummary(
  trustArtifacts: Record<string, unknown> | undefined,
): string {
  if (!trustArtifacts) {
    return "";
  }

  const availableCards: string[] = [];
  const cardKeyToLabel: Record<string, string> = {
    soulCard: "Soul Card",
    guardrailsCard: "Guardrails Card",
    teamCharter: "Team Charter",
    memoryLedger: "Memory Ledger",
  };

  let maxHandoffBoundaries = 0;
  let maxDriftCues = 0;

  for (const [key, label] of Object.entries(cardKeyToLabel)) {
    const card = trustArtifacts[key];
    if (!card || typeof card !== "object") {
      continue;
    }

    availableCards.push(label);
    const cardObject = card as Record<string, unknown>;
    const handoffBoundaries = cardObject.handoffBoundaries;
    const driftCues = cardObject.driftCues;

    if (Array.isArray(handoffBoundaries)) {
      maxHandoffBoundaries = Math.max(maxHandoffBoundaries, handoffBoundaries.length);
    }
    if (Array.isArray(driftCues)) {
      maxDriftCues = Math.max(maxDriftCues, driftCues.length);
    }
  }

  if (availableCards.length === 0) {
    return "";
  }

  const cueSummary: string[] = [];
  if (maxHandoffBoundaries > 0) {
    cueSummary.push(`${maxHandoffBoundaries} handoff boundaries`);
  }
  if (maxDriftCues > 0) {
    cueSummary.push(`${maxDriftCues} drift cues`);
  }

  return cueSummary.length > 0
    ? `Trust artifacts: ${availableCards.join(", ")} (${cueSummary.join(", ")}).`
    : `Trust artifacts: ${availableCards.join(", ")}.`;
}

function normalizeSearchMatch(item: BrainKnowledgeItem, queryText: string): boolean {
  if (!queryText) return true;
  const haystack = `${item.title}\n${item.description}\n${item.source}`.toLowerCase();
  return haystack.includes(queryText);
}

function buildCounts(items: BrainKnowledgeItem[]) {
  return {
    all: items.length,
    content_dna: items.filter((item) => item.category === "content_dna").length,
    documents: items.filter((item) => item.category === "documents").length,
    links: items.filter((item) => item.category === "links").length,
    notes: items.filter((item) => item.category === "notes").length,
  };
}

async function ensureOrgMembership(
  ctx: BrainCtx,
  userId: Id<"users">,
  organizationId: Id<"organizations">,
) {
  return await ctx.db
    .query("organizationMembers")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", userId).eq("organizationId", organizationId)
    )
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();
}

async function requireBrainWriteAccess(
  ctx: MutationCtx,
  sessionId: string,
  organizationId: Id<"organizations">,
) {
  const auth = await getAuthenticatedUser(ctx, sessionId);
  if (!auth) {
    throw new Error("Session expired. Please sign in again.");
  }

  const membership = await ensureOrgMembership(ctx, auth.userId, organizationId);
  if (!membership) {
    throw new Error("You do not have access to this organization.");
  }

  await requirePermission(ctx, auth.userId, "media_library.upload", {
    organizationId,
  });

  return auth;
}

interface KnowledgeTrustEventInput {
  eventName: TrustEventName;
  organizationId: Id<"organizations">;
  sessionId: string;
  actorUserId: Id<"users">;
  knowledgeItemId: string;
  knowledgeKind: string;
  ingestStatus: BrainIngestStatus;
  processorStage: string;
  failureReason: string;
}

async function insertTrustEvent(
  ctx: MutationCtx,
  eventName: TrustEventName,
  payload: TrustEventPayload,
) {
  const validation = validateTrustEventPayload(eventName, payload);
  await ctx.db.insert("aiTrustEvents", {
    event_name: eventName,
    payload: payload as any,
    schema_validation_status: validation.ok ? "passed" : "failed",
    schema_errors: validation.ok ? undefined : validation.errors,
    created_at: Date.now(),
  });
}

async function emitKnowledgeTrustEvent(ctx: MutationCtx, input: KnowledgeTrustEventInput) {
  const occurredAt = Date.now();
  await insertTrustEvent(ctx, input.eventName, {
    event_id: `${input.eventName}:${input.knowledgeItemId}:${occurredAt}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: occurredAt,
    org_id: input.organizationId as any,
    mode: "lifecycle",
    channel: BRAIN_TRUST_CHANNEL,
    session_id: input.sessionId,
    actor_type: "user",
    actor_id: input.actorUserId,
    knowledge_item_id: input.knowledgeItemId,
    knowledge_kind: input.knowledgeKind,
    ingest_status: input.ingestStatus,
    processor_stage: input.processorStage,
    failure_reason: input.failureReason,
    consent_prompt_version: BRAIN_CONSENT_PROMPT_VERSION,
  } as TrustEventPayload);
}

export const listReviewKnowledge = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    category: v.optional(
      v.union(
        v.literal("all"),
        v.literal("content_dna"),
        v.literal("documents"),
        v.literal("links"),
        v.literal("notes"),
      )
    ),
    searchQuery: v.optional(v.string()),
    refreshToken: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await getAuthenticatedUser(ctx, args.sessionId);
    if (!auth) {
      return {
        status: "error" as const,
        error: "Session expired. Please sign in again.",
        items: [] as BrainKnowledgeItem[],
        counts: EMPTY_COUNTS,
      };
    }

    const membership = await ensureOrgMembership(ctx, auth.userId, args.organizationId);
    if (!membership) {
      return {
        status: "error" as const,
        error: "You do not have access to this organization knowledge base.",
        items: [] as BrainKnowledgeItem[],
        counts: EMPTY_COUNTS,
      };
    }

    const [contentProfiles, mediaItems, knowledgeObjects] = await Promise.all([
      ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "content_profile")
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect(),
      ctx.db
        .query("organizationMedia")
        .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
        .collect(),
      ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "knowledge_item")
        )
        .collect(),
    ]);

    const contentDnaItems: BrainKnowledgeItem[] = contentProfiles.map((profile) => {
      const profileProps = (profile.customProperties || {}) as Record<string, unknown>;
      const extractedData = profileProps.extractedData as Record<string, unknown> | undefined;
      const trustArtifacts = profileProps.trustArtifacts as Record<string, unknown> | undefined;
      const sourceSessionId = profileProps.sourceSessionId;
      const sourceTemplateId = profileProps.sourceTemplateId;
      const extractedSummary = buildExtractedSummary(extractedData);
      const trustArtifactSummary = buildTrustArtifactSummary(trustArtifacts);
      return {
        id: profile._id,
        category: "content_dna",
        title: profile.name,
        description: trustArtifactSummary
          ? `${extractedSummary} ${trustArtifactSummary}`
          : extractedSummary,
        source: sourceSessionId
          ? `Interview session ${String(sourceSessionId)}`
          : "Guided interview",
        createdAt: profile.createdAt,
        sourceObjectIds: [sourceSessionId, sourceTemplateId]
          .filter((value): value is string => typeof value === "string"),
      };
    });

    const linkedMediaIds = new Set(
      knowledgeObjects
        .map((knowledge) => {
          const props = (knowledge.customProperties || {}) as Record<string, unknown>;
          return typeof props.sourceMediaId === "string" ? props.sourceMediaId : null;
        })
        .filter((value): value is string => Boolean(value))
    );

    const documentItems: BrainKnowledgeItem[] = mediaItems
      .filter((media) => !linkedMediaIds.has(media._id))
      .map((media) => {
      const description = media.itemType === "layercake_document"
        ? "Layer Cake markdown document"
        : media.description || media.mimeType;
      return {
        id: media._id,
        category: "documents",
        title: media.filename,
        description,
        source: media.itemType === "layercake_document" ? "Teach mode document" : "Uploaded media",
        createdAt: media.createdAt,
        sourceObjectIds: [media._id],
      };
    });

    const structuredKnowledgeItems: BrainKnowledgeItem[] = knowledgeObjects.map((knowledge) => {
      const props = (knowledge.customProperties || {}) as Record<string, unknown>;
      const knowledgeKind = String(props.knowledgeKind || "documents");
      const sourceUrl = typeof props.sourceUrl === "string" ? props.sourceUrl : undefined;
      const category: BrainKnowledgeCategory =
        knowledgeKind === "link"
          ? "links"
          : knowledgeKind === "text"
            ? "notes"
            : "documents";

      return {
        id: knowledge._id,
        category,
        title: knowledge.name,
        description: knowledge.description || "Knowledge item",
        source: typeof props.sourceLabel === "string" ? props.sourceLabel : "Teach mode",
        createdAt: knowledge.createdAt,
        linkUrl: sourceUrl,
        sourceObjectIds: Array.isArray(props.sourceObjectIds)
          ? props.sourceObjectIds
              .filter((value): value is string => typeof value === "string")
          : [knowledge._id],
      };
    });

    const allItems = [...contentDnaItems, ...documentItems, ...structuredKnowledgeItems]
      .sort((a, b) => b.createdAt - a.createdAt);

    const counts = buildCounts(allItems);
    const normalizedSearch = args.searchQuery?.trim().toLowerCase() || "";
    const filteredByCategory = allItems.filter((item) =>
      args.category && args.category !== "all"
        ? item.category === args.category
        : true
    );
    const filteredItems = filteredByCategory.filter((item) =>
      normalizeSearchMatch(item, normalizedSearch)
    );

    return {
      status: "ok" as const,
      items: filteredItems,
      counts,
    };
  },
});

export const registerMediaKnowledgeItem = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    mediaId: v.id("organizationMedia"),
    sourceType: v.union(v.literal("pdf"), v.literal("audio"), v.literal("text")),
  },
  handler: async (ctx, args) => {
    const auth = await requireBrainWriteAccess(ctx, args.sessionId, args.organizationId);
    const media = await ctx.db.get(args.mediaId);
    if (!media || media.organizationId !== args.organizationId) {
      throw new Error("Source media not found for this organization.");
    }

    const knowledgeKind = mapSourceTypeToKnowledgeKind(args.sourceType);
    const sourceCategory = mapSourceTypeToCategory(args.sourceType);
    const sourceMediaId = String(args.mediaId);
    const sourceTags = Array.isArray(media.tags) ? media.tags : [];

    // Prevent duplicate item creation when the same media source is re-processed.
    const existingKnowledgeItems = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "knowledge_item")
      )
      .collect();
    const existing = existingKnowledgeItems.find((item) => {
      const props = (item.customProperties || {}) as Record<string, unknown>;
      return props.sourceMediaId === sourceMediaId;
    });
    if (existing) {
      return {
        knowledgeItemId: existing._id,
        ingestStatus: "processed" as const,
      };
    }

    const now = Date.now();
    const knowledgeItemId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "knowledge_item",
      subtype: "brain_teach",
      name: media.filename,
      description: media.description || `Ingested ${sourceCategory} source`,
      status: "active",
      customProperties: {
        knowledgeKind,
        sourceType: args.sourceType,
        sourceLabel: args.sourceType === "text" ? "Teach mode note" : "Teach mode upload",
        sourceMediaId,
        sourceObjectIds: [sourceMediaId],
        sourceFilename: media.filename,
        sourceMimeType: media.mimeType,
        sourceDescription: media.description,
        sourceTags,
        ingestStatus: "processed",
        processorStage: "indexed",
        failureReason: "none",
        processedAt: now,
      },
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: knowledgeItemId,
      actionType: "knowledge_ingest_processed",
      actionData: {
        sourceType: args.sourceType,
        sourceMediaId,
      },
      performedBy: auth.userId,
      performedAt: now,
    });

    await emitKnowledgeTrustEvent(ctx, {
      eventName: "trust.knowledge.ingest_submitted.v1",
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      actorUserId: auth.userId,
      knowledgeItemId,
      knowledgeKind,
      ingestStatus: "submitted",
      processorStage: "uploaded",
      failureReason: "none",
    });

    await emitKnowledgeTrustEvent(ctx, {
      eventName: "trust.knowledge.ingest_processed.v1",
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      actorUserId: auth.userId,
      knowledgeItemId,
      knowledgeKind,
      ingestStatus: "processed",
      processorStage: "indexed",
      failureReason: "none",
    });

    return {
      knowledgeItemId,
      ingestStatus: "processed" as const,
    };
  },
});

export const ingestLinkKnowledgeItem = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    url: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireBrainWriteAccess(ctx, args.sessionId, args.organizationId);
    const url = normalizeUrl(args.url);
    const now = Date.now();
    let sourceHost = "";
    try {
      sourceHost = new URL(url).hostname.toLowerCase();
    } catch {
      sourceHost = "";
    }

    const knowledgeItemId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "knowledge_item",
      subtype: "brain_teach",
      name: args.title?.trim() || url,
      description: url,
      status: "active",
      customProperties: {
        knowledgeKind: "link",
        sourceType: "link",
        sourceLabel: "Teach mode web link",
        sourceUrl: url,
        sourceObjectIds: [url],
        sourceTags: sourceHost ? ["knowledge_item_bridge", "link", sourceHost] : ["knowledge_item_bridge", "link"],
        ingestStatus: "processed",
        processorStage: "indexed",
        failureReason: "none",
        processedAt: now,
      },
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: knowledgeItemId,
      actionType: "knowledge_ingest_processed",
      actionData: {
        sourceType: "link",
        sourceUrl: url,
      },
      performedBy: auth.userId,
      performedAt: now,
    });

    await emitKnowledgeTrustEvent(ctx, {
      eventName: "trust.knowledge.ingest_submitted.v1",
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      actorUserId: auth.userId,
      knowledgeItemId,
      knowledgeKind: "link",
      ingestStatus: "submitted",
      processorStage: "validated",
      failureReason: "none",
    });

    await emitKnowledgeTrustEvent(ctx, {
      eventName: "trust.knowledge.ingest_processed.v1",
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      actorUserId: auth.userId,
      knowledgeItemId,
      knowledgeKind: "link",
      ingestStatus: "processed",
      processorStage: "indexed",
      failureReason: "none",
    });

    return {
      knowledgeItemId,
      normalizedUrl: url,
      ingestStatus: "processed" as const,
    };
  },
});

export const recordIngestionFailure = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    sourceType: v.union(
      v.literal("pdf"),
      v.literal("audio"),
      v.literal("link"),
      v.literal("text"),
    ),
    sourceName: v.string(),
    sourceUrl: v.optional(v.string()),
    failureReason: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireBrainWriteAccess(ctx, args.sessionId, args.organizationId);
    const now = Date.now();
    const knowledgeKind = mapSourceTypeToKnowledgeKind(args.sourceType);
    const category = mapSourceTypeToCategory(args.sourceType);

    const knowledgeItemId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "knowledge_item",
      subtype: "brain_teach",
      name: args.sourceName,
      description: args.sourceUrl || `${category} ingestion failed`,
      status: "error",
      customProperties: {
        knowledgeKind,
        sourceType: args.sourceType,
        sourceLabel: "Teach mode ingestion failure",
        sourceUrl: args.sourceUrl,
        sourceObjectIds: args.sourceUrl ? [args.sourceUrl] : [],
        ingestStatus: "failed",
        processorStage: "failed",
        failureReason: args.failureReason,
        failedAt: now,
      },
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: knowledgeItemId,
      actionType: "knowledge_ingest_failed",
      actionData: {
        sourceType: args.sourceType,
        failureReason: args.failureReason,
      },
      performedBy: auth.userId,
      performedAt: now,
    });

    await emitKnowledgeTrustEvent(ctx, {
      eventName: "trust.knowledge.ingest_failed.v1",
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      actorUserId: auth.userId,
      knowledgeItemId,
      knowledgeKind,
      ingestStatus: "failed",
      processorStage: "failed",
      failureReason: args.failureReason,
    });

    return {
      knowledgeItemId,
      ingestStatus: "failed" as const,
    };
  },
});
