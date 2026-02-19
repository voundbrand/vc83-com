/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ORGANIZATION MEDIA MANAGEMENT
 *
 * Handles file uploads, storage, and media library for organizations.
 * Enforces storage quotas based on organization plan.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, requirePermission, checkPermission } from "./rbacHelpers";
import { getLicenseInternal } from "./licensing/helpers";
import {
  getUtf8ByteLength,
  rankSemanticRetrievalChunks,
  tokenizeSemanticRetrievalText,
} from "./ai/memoryComposer";

/**
 * Get storage quota from licensing system (in bytes)
 * Uses totalStorageGB from tier configs
 */
async function getStorageQuotaFromLicense(
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<number> {
  const license = await getLicenseInternal(ctx, organizationId);
  const totalStorageGB = license.limits.totalStorageGB;
  
  // -1 means unlimited
  if (totalStorageGB === -1) {
    return -1;
  }
  
  // Convert GB to bytes
  return totalStorageGB * 1024 * 1024 * 1024;
}

/**
 * Helper function to calculate storage usage (can be called from queries and mutations)
 * Now uses licensing system for quota limits
 */
async function calculateStorageUsage(
  ctx: QueryCtx,
  organizationId: Id<"organizations">
) {
  const media = await ctx.db
    .query("organizationMedia")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .collect();

  const totalBytes = media.reduce((sum: number, m: any) => sum + m.sizeBytes, 0);
  const fileCount = media.length;

  // Get quota from licensing system
  const quotaBytes = await getStorageQuotaFromLicense(ctx, organizationId);

  // Calculate percentages (skip if unlimited)
  const quotaMB = quotaBytes === -1 ? -1 : parseFloat((quotaBytes / 1024 / 1024).toFixed(2));
  const percentUsed = quotaBytes === -1 ? 0 : parseFloat(((totalBytes / quotaBytes) * 100).toFixed(2));

  return {
    totalBytes,
    totalMB: parseFloat((totalBytes / 1024 / 1024).toFixed(2)),
    totalGB: parseFloat((totalBytes / 1024 / 1024 / 1024).toFixed(2)),
    fileCount,
    quotaBytes,
    quotaMB,
    quotaGB: quotaBytes === -1 ? -1 : parseFloat((quotaBytes / 1024 / 1024 / 1024).toFixed(2)),
    percentUsed,
    isUnlimited: quotaBytes === -1,
  };
}

const KNOWLEDGE_INDEX_VERSION = 1;
const KNOWLEDGE_CHUNK_TARGET_CHARS = 1200;
const KNOWLEDGE_CHUNK_MAX_CHARS = 1600;
const KNOWLEDGE_CHUNK_MIN_CHARS = 300;
const KNOWLEDGE_CHUNK_OVERLAP_CHARS = 180;
const KNOWLEDGE_CHUNK_MAX_COUNT = 64;
const KNOWLEDGE_CHARS_PER_TOKEN_ESTIMATE = 4;

export interface KnowledgeChunkSegment {
  chunkId: string;
  chunkOrdinal: number;
  chunkText: string;
  chunkCharCount: number;
  tokenEstimate: number;
  startOffset: number;
  endOffset: number;
}

export interface KnowledgeItemBridgeDocument {
  knowledgeItemId: string;
  sourceMediaId?: string;
  filename: string;
  description?: string;
  content: string;
  tags: string[];
  source: "knowledge_item_bridge";
  updatedAt: number;
}

interface KnowledgeItemBridgeBuildArgs {
  knowledgeItem: {
    _id: string;
    name: string;
    description?: string;
    status?: string;
    updatedAt: number;
    customProperties?: Record<string, unknown>;
  };
  sourceMedia?: {
    _id: string;
    itemType?: "file" | "layercake_document";
    filename: string;
    mimeType: string;
    description?: string;
    tags?: string[];
    updatedAt: number;
  } | null;
}

function normalizeKnowledgeContent(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

function stableChunkHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function buildKnowledgeChunkId(args: {
  mediaId: string;
  chunkOrdinal: number;
  startOffset: number;
  endOffset: number;
  chunkText: string;
}): string {
  const hash = stableChunkHash(
    `${args.mediaId}:${args.chunkOrdinal}:${args.startOffset}:${args.endOffset}:${args.chunkText}`
  );
  return `${args.mediaId}:${args.chunkOrdinal}:${hash}`;
}

function estimateKnowledgeChunkTokens(chunkText: string): number {
  return Math.max(1, Math.ceil(chunkText.length / KNOWLEDGE_CHARS_PER_TOKEN_ESTIMATE));
}

function maybeFindChunkBreak(
  text: string,
  start: number,
  end: number,
  minChars: number
): number {
  if (end >= text.length) {
    return end;
  }
  const floor = start + minChars;
  const breakpoints = [
    { marker: "\n\n", offset: 2 },
    { marker: "\n", offset: 1 },
    { marker: ". ", offset: 1 },
    { marker: "! ", offset: 1 },
    { marker: "? ", offset: 1 },
    { marker: "; ", offset: 1 },
    { marker: ", ", offset: 1 },
    { marker: " ", offset: 1 },
  ];
  for (const point of breakpoints) {
    const index = text.lastIndexOf(point.marker, end);
    if (index >= floor) {
      return index + point.offset;
    }
  }
  return end;
}

export function splitKnowledgeDocumentIntoChunks(args: {
  mediaId: string;
  content: string;
  targetChars?: number;
  maxChars?: number;
  minChars?: number;
  overlapChars?: number;
  maxChunks?: number;
}): KnowledgeChunkSegment[] {
  const normalized = normalizeKnowledgeContent(args.content);
  if (!normalized) {
    return [];
  }

  const targetChars = Math.max(200, Math.floor(args.targetChars ?? KNOWLEDGE_CHUNK_TARGET_CHARS));
  const maxChars = Math.max(targetChars, Math.floor(args.maxChars ?? KNOWLEDGE_CHUNK_MAX_CHARS));
  const minChars = Math.min(
    targetChars,
    Math.max(120, Math.floor(args.minChars ?? KNOWLEDGE_CHUNK_MIN_CHARS))
  );
  const overlapChars = Math.min(
    Math.floor(targetChars / 2),
    Math.max(0, Math.floor(args.overlapChars ?? KNOWLEDGE_CHUNK_OVERLAP_CHARS))
  );
  const maxChunks = Math.max(1, Math.floor(args.maxChunks ?? KNOWLEDGE_CHUNK_MAX_COUNT));

  const chunks: KnowledgeChunkSegment[] = [];
  let start = 0;

  while (start < normalized.length && chunks.length < maxChunks) {
    const targetEnd = Math.min(normalized.length, start + maxChars);
    const end = maybeFindChunkBreak(normalized, start, targetEnd, minChars);

    const rawSlice = normalized.slice(start, end);
    const trimmed = rawSlice.trim();
    if (!trimmed) {
      start = end;
      continue;
    }

    const leadingWhitespaceCount = rawSlice.length - rawSlice.trimStart().length;
    const trailingWhitespaceCount = rawSlice.length - rawSlice.trimEnd().length;
    const startOffset = start + leadingWhitespaceCount;
    const endOffset = end - trailingWhitespaceCount;
    const chunkOrdinal = chunks.length;

    chunks.push({
      chunkId: buildKnowledgeChunkId({
        mediaId: args.mediaId,
        chunkOrdinal,
        startOffset,
        endOffset,
        chunkText: trimmed,
      }),
      chunkOrdinal,
      chunkText: trimmed,
      chunkCharCount: trimmed.length,
      tokenEstimate: estimateKnowledgeChunkTokens(trimmed),
      startOffset,
      endOffset,
    });

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(start + 1, end - overlapChars);
  }

  return chunks;
}

async function deleteKnowledgeChunksForMedia(
  ctx: MutationCtx,
  mediaId: Id<"organizationMedia">
): Promise<void> {
  const existingChunks = await ctx.db
    .query("organizationKnowledgeChunks")
    .withIndex("by_media", (q) => q.eq("mediaId", mediaId))
    .collect();

  for (const chunk of existingChunks) {
    await ctx.db.delete(chunk._id);
  }
}

async function reindexKnowledgeMediaDocument(
  ctx: MutationCtx,
  media: Doc<"organizationMedia">
): Promise<{ status: string; chunkCount: number }> {
  if (media.itemType !== "layercake_document") {
    await deleteKnowledgeChunksForMedia(ctx, media._id);
    await ctx.db.patch(media._id, {
      knowledgeIndexStatus: "not_indexed",
      knowledgeIndexVersion: KNOWLEDGE_INDEX_VERSION,
      knowledgeChunkCount: 0,
      knowledgeIndexedAt: Date.now(),
      knowledgeIndexError: undefined,
      updatedAt: Date.now(),
    });
    return { status: "not_indexed", chunkCount: 0 };
  }

  const content = typeof media.documentContent === "string" ? media.documentContent : "";
  const chunks = splitKnowledgeDocumentIntoChunks({
    mediaId: media._id,
    content,
  });

  await deleteKnowledgeChunksForMedia(ctx, media._id);

  if (chunks.length === 0) {
    await ctx.db.patch(media._id, {
      knowledgeIndexStatus: "skipped",
      knowledgeIndexVersion: KNOWLEDGE_INDEX_VERSION,
      knowledgeChunkCount: 0,
      knowledgeIndexedAt: Date.now(),
      knowledgeIndexError: undefined,
      updatedAt: Date.now(),
    });
    return { status: "skipped", chunkCount: 0 };
  }

  const indexedAt = Date.now();
  for (const chunk of chunks) {
    await ctx.db.insert("organizationKnowledgeChunks", {
      organizationId: media.organizationId,
      mediaId: media._id,
      chunkId: chunk.chunkId,
      chunkOrdinal: chunk.chunkOrdinal,
      chunkText: chunk.chunkText,
      chunkCharCount: chunk.chunkCharCount,
      tokenEstimate: chunk.tokenEstimate,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      sourceFilename: media.filename,
      sourceDescription: media.description,
      sourceTags: media.tags,
      sourceUpdatedAt: media.updatedAt,
      indexVersion: KNOWLEDGE_INDEX_VERSION,
      indexedAt,
    });
  }

  await ctx.db.patch(media._id, {
    knowledgeIndexStatus: "indexed",
    knowledgeIndexVersion: KNOWLEDGE_INDEX_VERSION,
    knowledgeChunkCount: chunks.length,
    knowledgeIndexedAt: indexedAt,
    knowledgeIndexError: undefined,
    updatedAt: Date.now(),
  });

  return { status: "indexed", chunkCount: chunks.length };
}

/**
 * Calculate storage usage for an organization (Query version for clients)
 */
export const getStorageUsage = query({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, sessionId }) => {
    // RBAC check - user must be authenticated and member of organization
    if (sessionId) {
      const { userId } = await requireAuthenticatedUser(ctx, sessionId);

      // Check organization membership
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", userId).eq("organizationId", organizationId)
        )
        .first();

      if (!membership) {
        throw new Error("Not a member of this organization");
      }
    }

    return await calculateStorageUsage(ctx, organizationId);
  },
});

/**
 * Generate upload URL for file upload
 * Checks storage quota before allowing upload
 * Requires: media_library.upload permission
 */
export const generateUploadUrl = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    estimatedSizeBytes: v.number(),
  },
  handler: async (ctx, { sessionId, organizationId, estimatedSizeBytes }) => {
    // RBAC check - authenticate user first
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);

    // Check media_library.upload permission
    await requirePermission(ctx, userId, "media_library.upload", {
      organizationId,
    });

    // CHECK STORAGE LIMITS: Enforce totalStorageGB and maxFileUploadMB from licensing system
    const license = await getLicenseInternal(ctx, organizationId);
    
    // Check maxFileUploadMB limit
    const maxFileUploadMB = license.limits.maxFileUploadMB;
    const estimatedSizeMB = estimatedSizeBytes / (1024 * 1024);
    if (maxFileUploadMB !== -1 && estimatedSizeMB > maxFileUploadMB) {
      throw new Error(
        `File size (${estimatedSizeMB.toFixed(2)}MB) exceeds maximum allowed (${maxFileUploadMB}MB). ` +
        `Upgrade to a higher tier for larger file uploads.`
      );
    }
    
    // Check total storage quota
    const usage = await calculateStorageUsage(ctx, organizationId);
    const totalStorageGB = license.limits.totalStorageGB;
    
    if (totalStorageGB !== -1) {
      const totalStorageBytes = totalStorageGB * 1024 * 1024 * 1024;
      if (usage.totalBytes + estimatedSizeBytes > totalStorageBytes) {
        const tierNames: Record<string, string> = {
          free: "Starter (€199/month)",
          starter: "Professional (€399/month)",
          professional: "Agency (€599/month)",
          agency: "Enterprise (€1,500+/month)",
          enterprise: "Enterprise",
        };
        const nextTier = tierNames[license.planTier] || "a higher tier";
        
        throw new Error(
          `Storage quota exceeded. Using ${usage.totalGB.toFixed(2)}GB of ${totalStorageGB}GB. ` +
          `Upgrade to ${nextTier} for more storage.`
        );
      }
    }

    // Generate upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save media metadata after upload
 * Requires: media_library.upload permission
 */
export const saveMedia = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    category: v.optional(
      v.union(
        v.literal("template"),
        v.literal("logo"),
        v.literal("avatar"),
        v.literal("general")
      )
    ),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // RBAC check - authenticate user first
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check media_library.upload permission
    await requirePermission(ctx, userId, "media_library.upload", {
      organizationId: args.organizationId,
    });

    // Save media metadata
    const mediaId = await ctx.db.insert("organizationMedia", {
      organizationId: args.organizationId,
      uploadedBy: userId,
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      width: args.width,
      height: args.height,
      category: args.category || "general",
      tags: args.tags,
      description: args.description,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      knowledgeIndexStatus: "not_indexed",
      knowledgeIndexVersion: KNOWLEDGE_INDEX_VERSION,
      knowledgeChunkCount: 0,
      knowledgeIndexedAt: Date.now(),
    });

    // Get the URL for the uploaded file
    const url = await ctx.storage.getUrl(args.storageId);

    return {
      mediaId,
      url,
    };
  },
});

/**
 * List media for an organization
 * Requires: media_library.view permission
 */
export const listMedia = query({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.id("organizations"),
    category: v.optional(
      v.union(
        v.literal("template"),
        v.literal("logo"),
        v.literal("avatar"),
        v.literal("general")
      )
    ),
  },
  handler: async (ctx, { sessionId, organizationId, category }) => {
    // RBAC check - user must be authenticated and member of organization
    if (sessionId) {
      const { userId } = await requireAuthenticatedUser(ctx, sessionId);

      // Check organization membership
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user_and_org", (q) =>
          q.eq("userId", userId).eq("organizationId", organizationId)
        )
        .first();

      if (!membership) {
        throw new Error("Not a member of this organization");
      }
    }
    let mediaQuery = ctx.db
      .query("organizationMedia")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId));

    if (category) {
      mediaQuery = ctx.db
        .query("organizationMedia")
        .withIndex("by_organization_and_category", (q) =>
          q.eq("organizationId", organizationId).eq("category", category)
        );
    }

    const media = await mediaQuery.collect();

    // Get URLs for all media (null for Layer Cake documents)
    const mediaWithUrls = await Promise.all(
      media.map(async (m) => {
        let url = null;
        if (m.storageId) {
          url = await ctx.storage.getUrl(m.storageId);
        }
        return {
          ...m,
          url,
        };
      })
    );

    return mediaWithUrls;
  },
});

/**
 * Get single media item with URL
 */
export const getMedia = query({
  args: { mediaId: v.id("organizationMedia") },
  handler: async (ctx, { mediaId }) => {
    const media = await ctx.db.get(mediaId);
    if (!media) return null;

    // Get URL only for files with storage (not Layer Cake documents)
    let url = null;
    if (media.storageId) {
      url = await ctx.storage.getUrl(media.storageId);
    }

    return {
      ...media,
      url,
    };
  },
});

/**
 * Delete media
 * Requires: media_library.delete permission
 */
export const deleteMedia = mutation({
  args: {
    sessionId: v.string(),
    mediaId: v.id("organizationMedia")
  },
  handler: async (ctx, { sessionId, mediaId }) => {
    // Get media
    const media = await ctx.db.get(mediaId);
    if (!media) {
      throw new Error("Media not found");
    }

    // RBAC check - authenticate user first
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);

    // Check media_library.delete permission
    await requirePermission(ctx, userId, "media_library.delete", {
      organizationId: media.organizationId,
    });

    // Delete from storage (only for files, not Layer Cake documents)
    if (media.storageId) {
      await ctx.storage.delete(media.storageId);
    }

    await deleteKnowledgeChunksForMedia(ctx, mediaId);

    // Delete metadata
    await ctx.db.delete(mediaId);

    return { success: true };
  },
});

/**
 * Update media metadata
 * Requires: media_library.edit permission
 */
export const updateMedia = mutation({
  args: {
    sessionId: v.string(),
    mediaId: v.id("organizationMedia"),
    filename: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("template"),
        v.literal("logo"),
        v.literal("avatar"),
        v.literal("general")
      )
    ),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, mediaId, ...updates }) => {
    // Get media
    const media = await ctx.db.get(mediaId);
    if (!media) {
      throw new Error("Media not found");
    }

    // RBAC check - authenticate user first
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);

    // Check media_library.edit permission
    await requirePermission(ctx, userId, "media_library.edit", {
      organizationId: media.organizationId,
    });

    // Update metadata
    await ctx.db.patch(mediaId, {
      ...updates,
      updatedAt: Date.now(),
    });

    if (media.itemType === "layercake_document") {
      const refreshed = await ctx.db.get(mediaId);
      if (refreshed) {
        await reindexKnowledgeMediaDocument(ctx, refreshed);
      }
    }

    return { success: true };
  },
});

/**
 * Increment usage count when media is used in a template
 */
export const incrementUsage = mutation({
  args: { mediaId: v.id("organizationMedia") },
  handler: async (ctx, { mediaId }) => {
    const media = await ctx.db.get(mediaId);
    if (!media) return;

    await ctx.db.patch(mediaId, {
      usageCount: (media.usageCount || 0) + 1,
      lastUsedAt: Date.now(),
    });
  },
});

/**
 * Star/favorite a media item
 * Requires: media_library.edit permission
 */
export const starMedia = mutation({
  args: {
    sessionId: v.string(),
    mediaId: v.id("organizationMedia"),
  },
  handler: async (ctx, { sessionId, mediaId }) => {
    // Get media
    const media = await ctx.db.get(mediaId);
    if (!media) {
      throw new Error("Media not found");
    }

    // RBAC check
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    await requirePermission(ctx, userId, "media_library.edit", {
      organizationId: media.organizationId,
    });

    // Star the media
    await ctx.db.patch(mediaId, {
      isStarred: true,
      starredAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Unstar/unfavorite a media item
 * Requires: media_library.edit permission
 */
export const unstarMedia = mutation({
  args: {
    sessionId: v.string(),
    mediaId: v.id("organizationMedia"),
  },
  handler: async (ctx, { sessionId, mediaId }) => {
    // Get media
    const media = await ctx.db.get(mediaId);
    if (!media) {
      throw new Error("Media not found");
    }

    // RBAC check
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    await requirePermission(ctx, userId, "media_library.edit", {
      organizationId: media.organizationId,
    });

    // Unstar the media
    await ctx.db.patch(mediaId, {
      isStarred: false,
      starredAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Rename a media item
 * Requires: media_library.edit permission
 */
export const renameMedia = mutation({
  args: {
    sessionId: v.string(),
    mediaId: v.id("organizationMedia"),
    newFilename: v.string(),
  },
  handler: async (ctx, { sessionId, mediaId, newFilename }) => {
    // Get media
    const media = await ctx.db.get(mediaId);
    if (!media) {
      throw new Error("Media not found");
    }

    // RBAC check
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    await requirePermission(ctx, userId, "media_library.edit", {
      organizationId: media.organizationId,
    });

    // Rename the media
    await ctx.db.patch(mediaId, {
      filename: newFilename,
      updatedAt: Date.now(),
    });

    if (media.itemType === "layercake_document") {
      const refreshed = await ctx.db.get(mediaId);
      if (refreshed) {
        await reindexKnowledgeMediaDocument(ctx, refreshed);
      }
    }

    return { success: true };
  },
});

/**
 * Move media item to a folder
 * Requires: media_library.edit permission
 */
export const moveMediaToFolder = mutation({
  args: {
    sessionId: v.string(),
    mediaId: v.id("organizationMedia"),
    folderId: v.optional(v.string()), // null = move to root
  },
  handler: async (ctx, { sessionId, mediaId, folderId }) => {
    // Get media
    const media = await ctx.db.get(mediaId);
    if (!media) {
      throw new Error("Media not found");
    }

    // RBAC check
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    await requirePermission(ctx, userId, "media_library.edit", {
      organizationId: media.organizationId,
    });

    // Validate folder exists if specified
    if (folderId) {
      const folder = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", media.organizationId).eq("type", "media_folder")
        )
        .filter((q) => q.eq(q.field("_id"), folderId as any))
        .first();

      if (!folder) {
        throw new Error("Folder not found");
      }
    }

    // Move the media
    await ctx.db.patch(mediaId, {
      folderId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Create a Layer Cake Document (native markdown document)
 * Requires: media_library.upload permission
 */
export const createLayerCakeDocument = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    filename: v.string(),
    documentContent: v.string(), // Markdown content
    folderId: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // RBAC check
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, userId, "media_library.upload", {
      organizationId: args.organizationId,
    });

    // Calculate size in bytes (approximate)
    const sizeBytes = new Blob([args.documentContent]).size;

    // CHECK STORAGE LIMITS: Enforce totalStorageGB from licensing system
    const license = await getLicenseInternal(ctx, args.organizationId);
    const totalStorageGB = license.limits.totalStorageGB;
    
    if (totalStorageGB !== -1) {
      const usage = await calculateStorageUsage(ctx, args.organizationId);
      const totalStorageBytes = totalStorageGB * 1024 * 1024 * 1024;
      
      if (usage.totalBytes + sizeBytes > totalStorageBytes) {
        const tierNames: Record<string, string> = {
          free: "Starter (€199/month)",
          starter: "Professional (€399/month)",
          professional: "Agency (€599/month)",
          agency: "Enterprise (€1,500+/month)",
          enterprise: "Enterprise",
        };
        const nextTier = tierNames[license.planTier] || "a higher tier";
        
        throw new Error(
          `Storage quota exceeded. Using ${usage.totalGB.toFixed(2)}GB of ${totalStorageGB}GB. ` +
          `Upgrade to ${nextTier} for more storage.`
        );
      }
    }

    // Create Layer Cake document
    const docId = await ctx.db.insert("organizationMedia", {
      organizationId: args.organizationId,
      uploadedBy: userId,
      folderId: args.folderId,
      itemType: "layercake_document",
      documentContent: args.documentContent,
      filename: args.filename.endsWith(".md") ? args.filename : `${args.filename}.md`,
      mimeType: "text/markdown",
      sizeBytes,
      category: "general",
      description: args.description,
      tags: args.tags,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      knowledgeIndexStatus: "pending",
      knowledgeIndexVersion: KNOWLEDGE_INDEX_VERSION,
      knowledgeChunkCount: 0,
      knowledgeIndexedAt: Date.now(),
    });

    const createdDoc = await ctx.db.get(docId);
    if (createdDoc) {
      try {
        await reindexKnowledgeMediaDocument(ctx, createdDoc);
      } catch (error) {
        await ctx.db.patch(docId, {
          knowledgeIndexStatus: "failed",
          knowledgeIndexVersion: KNOWLEDGE_INDEX_VERSION,
          knowledgeChunkCount: 0,
          knowledgeIndexedAt: Date.now(),
          knowledgeIndexError: error instanceof Error ? error.message : "knowledge_index_failed",
          updatedAt: Date.now(),
        });
      }
    }

    return {
      docId,
      success: true,
    };
  },
});

/**
 * Update Layer Cake Document content
 * Requires: media_library.edit permission
 */
export const updateLayerCakeDocument = mutation({
  args: {
    sessionId: v.string(),
    mediaId: v.id("organizationMedia"),
    documentContent: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, mediaId, documentContent, filename }) => {
    // Get document
    const doc = await ctx.db.get(mediaId);
    if (!doc) {
      throw new Error("Document not found");
    }

    if (doc.itemType !== "layercake_document") {
      throw new Error("This is not a Layer Cake document");
    }

    // RBAC check
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);
    await requirePermission(ctx, userId, "media_library.edit", {
      organizationId: doc.organizationId,
    });

    // Calculate new size
    const sizeBytes = new Blob([documentContent]).size;

    // Update document
    await ctx.db.patch(mediaId, {
      documentContent,
      filename: filename ?? doc.filename,
      sizeBytes,
      updatedAt: Date.now(),
      knowledgeIndexStatus: "pending",
      knowledgeIndexVersion: KNOWLEDGE_INDEX_VERSION,
      knowledgeIndexError: undefined,
    });

    const refreshed = await ctx.db.get(mediaId);
    if (refreshed) {
      try {
        await reindexKnowledgeMediaDocument(ctx, refreshed);
      } catch (error) {
        await ctx.db.patch(mediaId, {
          knowledgeIndexStatus: "failed",
          knowledgeIndexVersion: KNOWLEDGE_INDEX_VERSION,
          knowledgeChunkCount: 0,
          knowledgeIndexedAt: Date.now(),
          knowledgeIndexError: error instanceof Error ? error.message : "knowledge_index_failed",
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true };
  },
});

/**
 * Get Layer Cake Documents for an organization
 * Requires: media_library.view permission
 */
export const getLayerCakeDocuments = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const hasAccess = await checkPermission(ctx, userId, "media_library.view", args.organizationId);
    if (!hasAccess) {
      throw new Error("You do not have permission to view documents");
    }

    const docs = await ctx.db
      .query("organizationMedia")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("itemType"), "layercake_document"))
      .collect();

    return docs.map((doc) => ({
      _id: doc._id,
      filename: doc.filename,
      description: doc.description,
      documentContent: doc.documentContent,
      tags: doc.tags,
      sizeBytes: doc.sizeBytes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  },
});

/**
 * Reindex semantic chunks for one media record.
 */
export const reindexKnowledgeDocumentInternal = internalMutation({
  args: {
    mediaId: v.id("organizationMedia"),
  },
  handler: async (ctx, { mediaId }) => {
    const media = await ctx.db.get(mediaId);
    if (!media) {
      return { success: false, status: "media_not_found", chunkCount: 0 };
    }

    try {
      const result = await reindexKnowledgeMediaDocument(ctx, media);
      return {
        success: true,
        status: result.status,
        chunkCount: result.chunkCount,
      };
    } catch (error) {
      await ctx.db.patch(mediaId, {
        knowledgeIndexStatus: "failed",
        knowledgeIndexVersion: KNOWLEDGE_INDEX_VERSION,
        knowledgeChunkCount: 0,
        knowledgeIndexedAt: Date.now(),
        knowledgeIndexError: error instanceof Error ? error.message : "knowledge_index_failed",
        updatedAt: Date.now(),
      });
      return {
        success: false,
        status: "failed",
        chunkCount: 0,
        error: error instanceof Error ? error.message : "knowledge_index_failed",
      };
    }
  },
});

/**
 * Read indexed chunks for semantic retrieval pipeline.
 */
export const getKnowledgeChunksInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    mediaId: v.optional(v.id("organizationMedia")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, mediaId, limit }) => {
    const maxChunks = Math.min(Math.max(limit ?? 200, 1), 500);
    const chunks = mediaId
      ? await ctx.db
          .query("organizationKnowledgeChunks")
          .withIndex("by_org_media", (q) =>
            q.eq("organizationId", organizationId).eq("mediaId", mediaId)
          )
          .take(maxChunks)
      : await ctx.db
          .query("organizationKnowledgeChunks")
          .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
          .take(maxChunks);

    return chunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      mediaId: chunk.mediaId,
      chunkOrdinal: chunk.chunkOrdinal,
      chunkText: chunk.chunkText,
      chunkCharCount: chunk.chunkCharCount,
      tokenEstimate: chunk.tokenEstimate,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      sourceFilename: chunk.sourceFilename,
      sourceDescription: chunk.sourceDescription,
      sourceTags: chunk.sourceTags ?? [],
      sourceUpdatedAt: chunk.sourceUpdatedAt,
      indexVersion: chunk.indexVersion,
      indexedAt: chunk.indexedAt,
    }));
  },
});

function normalizeTagList(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);
}

function matchesNormalizedTagSet(
  normalizedTagSet: Set<string>,
  candidateTags: string[] | undefined
): boolean {
  if (normalizedTagSet.size === 0) {
    return true;
  }
  if (!candidateTags || candidateTags.length === 0) {
    return false;
  }
  const normalizedCandidateTags = new Set(normalizeTagList(candidateTags));
  for (const tag of normalizedTagSet) {
    if (normalizedCandidateTags.has(tag)) {
      return true;
    }
  }
  return false;
}

function getKnowledgeItemCustomProperties(
  knowledgeItem: KnowledgeItemBridgeBuildArgs["knowledgeItem"]
): Record<string, unknown> {
  const raw = knowledgeItem.customProperties;
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw;
}

function uniqueKnowledgeItemBridgeTags(tags: string[]): string[] {
  return Array.from(new Set(normalizeTagList(tags)));
}

function buildKnowledgeItemBridgeContent(args: {
  knowledgeItemName: string;
  knowledgeItemDescription?: string;
  sourceType: string;
  sourceLabel?: string;
  sourceUrl?: string;
  knowledgeKind?: string;
  sourceMedia?: KnowledgeItemBridgeBuildArgs["sourceMedia"];
}): string {
  const sections: string[] = [];

  sections.push(`Knowledge item: ${args.knowledgeItemName}`);
  if (args.knowledgeItemDescription) {
    sections.push(`Summary: ${args.knowledgeItemDescription}`);
  }
  if (args.sourceLabel) {
    sections.push(`Source label: ${args.sourceLabel}`);
  }
  sections.push(`Source type: ${args.sourceType}`);
  if (args.knowledgeKind) {
    sections.push(`Knowledge kind: ${args.knowledgeKind}`);
  }
  if (args.sourceUrl) {
    sections.push(`Source URL: ${args.sourceUrl}`);
  }

  if (args.sourceMedia) {
    sections.push(`Source file: ${args.sourceMedia.filename}`);
    sections.push(`Source MIME type: ${args.sourceMedia.mimeType}`);
    if (args.sourceMedia.description) {
      sections.push(`Source file description: ${args.sourceMedia.description}`);
    }
    if (Array.isArray(args.sourceMedia.tags) && args.sourceMedia.tags.length > 0) {
      sections.push(`Source tags: ${args.sourceMedia.tags.join(", ")}`);
    }
  }

  return sections.join("\n");
}

function inferKnowledgeItemBridgeSourceType(args: {
  customProperties: Record<string, unknown>;
  sourceMedia?: KnowledgeItemBridgeBuildArgs["sourceMedia"];
}): string {
  const explicitSourceType = typeof args.customProperties.sourceType === "string"
    ? args.customProperties.sourceType.trim().toLowerCase()
    : "";
  if (explicitSourceType.length > 0) {
    return explicitSourceType;
  }

  const sourceUrl = typeof args.customProperties.sourceUrl === "string"
    ? args.customProperties.sourceUrl.trim()
    : "";
  if (sourceUrl.length > 0) {
    return "link";
  }

  if (args.sourceMedia) {
    const mimeType = args.sourceMedia.mimeType.trim().toLowerCase();
    const normalizedFilename = args.sourceMedia.filename.trim().toLowerCase();
    if (mimeType.startsWith("audio/")) {
      return "audio";
    }
    if (mimeType === "application/pdf" || normalizedFilename.endsWith(".pdf")) {
      return "pdf";
    }
    if (
      mimeType.startsWith("text/")
      || normalizedFilename.endsWith(".txt")
      || normalizedFilename.endsWith(".md")
      || normalizedFilename.endsWith(".markdown")
    ) {
      return "text";
    }
  }

  const knowledgeKind = typeof args.customProperties.knowledgeKind === "string"
    ? args.customProperties.knowledgeKind.trim().toLowerCase()
    : "";
  if (knowledgeKind.length > 0) {
    return knowledgeKind;
  }

  return "unknown";
}

export function buildKnowledgeItemBridgeDocument(
  args: KnowledgeItemBridgeBuildArgs
): KnowledgeItemBridgeDocument | null {
  if (args.knowledgeItem.status && args.knowledgeItem.status !== "active") {
    return null;
  }

  const customProperties = getKnowledgeItemCustomProperties(args.knowledgeItem);
  const sourceType = inferKnowledgeItemBridgeSourceType({
    customProperties,
    sourceMedia: args.sourceMedia,
  });
  const ingestStatus = typeof customProperties.ingestStatus === "string"
    ? customProperties.ingestStatus.trim().toLowerCase()
    : undefined;
  if (ingestStatus === "failed") {
    return null;
  }

  const sourceMediaId = typeof customProperties.sourceMediaId === "string"
    ? customProperties.sourceMediaId
    : undefined;
  const sourceUrl = typeof customProperties.sourceUrl === "string"
    ? customProperties.sourceUrl
    : undefined;
  const sourceLabel = typeof customProperties.sourceLabel === "string"
    ? customProperties.sourceLabel
    : undefined;
  const knowledgeKind = typeof customProperties.knowledgeKind === "string"
    ? customProperties.knowledgeKind
    : undefined;

  // Layer Cake documents already flow through the primary chunk/index retrieval path.
  if (args.sourceMedia?.itemType === "layercake_document") {
    return null;
  }

  const content = buildKnowledgeItemBridgeContent({
    knowledgeItemName: args.knowledgeItem.name,
    knowledgeItemDescription: args.knowledgeItem.description,
    sourceType,
    sourceLabel,
    sourceUrl,
    knowledgeKind,
    sourceMedia: args.sourceMedia,
  }).trim();
  if (content.length === 0) {
    return null;
  }

  const customSourceTags = Array.isArray(customProperties.sourceTags)
    ? customProperties.sourceTags.filter((value): value is string => typeof value === "string")
    : [];
  const tags = uniqueKnowledgeItemBridgeTags([
    "knowledge_item_bridge",
    "teach",
    sourceType,
    knowledgeKind ?? "",
    ...customSourceTags,
    ...(args.sourceMedia?.tags ?? []),
  ]);

  const updatedAt = Math.max(
    args.knowledgeItem.updatedAt,
    args.sourceMedia?.updatedAt ?? args.knowledgeItem.updatedAt
  );

  return {
    knowledgeItemId: args.knowledgeItem._id,
    sourceMediaId,
    filename: args.sourceMedia?.filename ?? args.knowledgeItem.name,
    description: args.knowledgeItem.description ?? args.sourceMedia?.description,
    content,
    tags,
    source: "knowledge_item_bridge",
    updatedAt,
  };
}

async function listKnowledgeItemBridgeDocuments(
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<KnowledgeItemBridgeDocument[]> {
  const knowledgeItems = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "knowledge_item")
    )
    .collect();

  const sourceMediaIds = Array.from(
    new Set(
      knowledgeItems
        .map((item) => {
          const props = (item.customProperties || {}) as Record<string, unknown>;
          return typeof props.sourceMediaId === "string" ? props.sourceMediaId : null;
        })
        .filter((value): value is string => Boolean(value))
    )
  );

  const sourceMediaEntries = await Promise.all(
    sourceMediaIds.map(async (mediaId) => {
      try {
        const media = await ctx.db.get(mediaId as Id<"organizationMedia">);
        if (!media || media.organizationId !== organizationId) {
          return null;
        }
        return [mediaId, media] as const;
      } catch {
        return null;
      }
    })
  );

  const sourceMediaById = new Map<string, Doc<"organizationMedia">>();
  for (const entry of sourceMediaEntries) {
    if (entry) {
      sourceMediaById.set(entry[0], entry[1]);
    }
  }

  const bridgeDocs = knowledgeItems
    .map((knowledgeItem) => {
      const props = (knowledgeItem.customProperties || {}) as Record<string, unknown>;
      const sourceMediaId = typeof props.sourceMediaId === "string" ? props.sourceMediaId : undefined;
      const sourceMedia = sourceMediaId ? sourceMediaById.get(sourceMediaId) ?? null : null;
      return buildKnowledgeItemBridgeDocument({
        knowledgeItem: {
          _id: knowledgeItem._id,
          name: knowledgeItem.name,
          description: knowledgeItem.description,
          status: knowledgeItem.status,
          updatedAt: knowledgeItem.updatedAt,
          customProperties: props,
        },
        sourceMedia: sourceMedia
          ? {
              _id: sourceMedia._id,
              itemType: sourceMedia.itemType,
              filename: sourceMedia.filename,
              mimeType: sourceMedia.mimeType,
              description: sourceMedia.description,
              tags: sourceMedia.tags,
              updatedAt: sourceMedia.updatedAt,
            }
          : null,
      });
    })
    .filter((doc): doc is KnowledgeItemBridgeDocument => Boolean(doc))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return bridgeDocs;
}

/**
 * Tenant-scoped ranked semantic retrieval over indexed knowledge chunks.
 */
export const searchKnowledgeChunksInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    queryText: v.string(),
    tags: v.optional(v.array(v.string())),
    mediaIds: v.optional(v.array(v.id("organizationMedia"))),
    limit: v.optional(v.number()),
    candidateLimit: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resultLimit = Math.min(Math.max(args.limit ?? 8, 1), 30);
    const candidateLimit = Math.min(Math.max(args.candidateLimit ?? 300, 10), 2000);

    const normalizedTagSet = new Set(
      (args.tags ?? [])
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0)
    );
    const mediaIdSet = new Set((args.mediaIds ?? []).map((mediaId) => mediaId.toString()));

    // Tenant-safe candidate prefilter from org-scoped index.
    const candidateChunks = await ctx.db
      .query("organizationKnowledgeChunks")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .take(candidateLimit);

    const filteredChunkCandidates = candidateChunks.filter((chunk) => {
      if (mediaIdSet.size > 0 && !mediaIdSet.has(chunk.mediaId.toString())) {
        return false;
      }
      return matchesNormalizedTagSet(normalizedTagSet, chunk.sourceTags);
    });

    const bridgeDocs = await listKnowledgeItemBridgeDocuments(ctx, args.organizationId);
    const filteredBridgeDocs = bridgeDocs
      .filter((doc) =>
        mediaIdSet.size === 0
          ? true
          : Boolean(doc.sourceMediaId && mediaIdSet.has(doc.sourceMediaId))
      )
      .filter((doc) => matchesNormalizedTagSet(normalizedTagSet, doc.tags))
      .slice(0, candidateLimit);

    const mergedCandidates = [
      ...filteredChunkCandidates.map((chunk) => ({
        chunkId: chunk.chunkId,
        mediaId: chunk.mediaId,
        chunkOrdinal: chunk.chunkOrdinal,
        chunkText: chunk.chunkText,
        sourceFilename: chunk.sourceFilename,
        sourceDescription: chunk.sourceDescription,
        sourceTags: chunk.sourceTags ?? [],
        sourceUpdatedAt: chunk.sourceUpdatedAt,
      })),
      ...filteredBridgeDocs.map((doc) => ({
        chunkId: `knowledge_item:${doc.knowledgeItemId}`,
        mediaId: doc.sourceMediaId ?? doc.knowledgeItemId,
        chunkOrdinal: 0,
        chunkText: doc.content,
        sourceFilename: doc.filename,
        sourceDescription: doc.description,
        sourceTags: doc.tags,
        sourceUpdatedAt: doc.updatedAt,
      })),
    ];

    const rankedChunks = rankSemanticRetrievalChunks({
      queryText: args.queryText,
      candidates: mergedCandidates,
      limit: resultLimit,
      minScore: args.minScore,
    });

    return {
      queryTokenCount: tokenizeSemanticRetrievalText(args.queryText).length,
      totalCandidates: candidateChunks.length + bridgeDocs.length,
      filteredCandidates: filteredChunkCandidates.length + filteredBridgeDocs.length,
      returned: rankedChunks.length,
      chunks: rankedChunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        mediaId: chunk.mediaId,
        chunkOrdinal: chunk.chunkOrdinal,
        chunkText: chunk.chunkText,
        sourceFilename: chunk.sourceFilename,
        sourceDescription: chunk.sourceDescription,
        sourceTags: chunk.sourceTags ?? [],
        sourceUpdatedAt: chunk.sourceUpdatedAt,
        semanticScore: chunk.semanticScore,
        confidence: chunk.confidence,
        confidenceBand: chunk.confidenceBand,
        matchedTokens: chunk.matchedTokens,
      })),
    };
  },
});

/**
 * Internal knowledge-base retrieval for AI runtimes.
 * Returns Layer Cake markdown documents with optional tag filtering.
 */
export const getKnowledgeBaseDocsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { organizationId, tags, limit }) => {
    const normalizedTagSet = new Set(
      (tags || [])
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0)
    );
    const maxDocs = Math.min(Math.max(limit ?? 20, 1), 50);

    const docs = await ctx.db
      .query("organizationMedia")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("itemType"), "layercake_document"))
      .collect();

    const layercakeDocs = docs
      .filter((doc) => matchesNormalizedTagSet(normalizedTagSet, doc.tags))
      .filter((doc) => typeof doc.documentContent === "string" && doc.documentContent.trim().length > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((doc) => ({
        mediaId: doc._id,
        filename: doc.filename,
        description: doc.description,
        content: doc.documentContent as string,
        tags: doc.tags ?? [],
        sizeBytes: doc.sizeBytes,
        source: "layercake_document" as const,
        updatedAt: doc.updatedAt,
      }));

    const bridgeDocs = await listKnowledgeItemBridgeDocuments(ctx, organizationId);
    const filteredBridgeDocs = bridgeDocs
      .filter((doc) => matchesNormalizedTagSet(normalizedTagSet, doc.tags))
      .map((doc) => ({
        mediaId: doc.sourceMediaId ?? doc.knowledgeItemId,
        filename: doc.filename,
        description: doc.description,
        content: doc.content,
        tags: doc.tags,
        sizeBytes: getUtf8ByteLength(doc.content),
        source: doc.source,
        updatedAt: doc.updatedAt,
      }));

    return [...layercakeDocs, ...filteredBridgeDocs]
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, maxDocs);
  },
});
