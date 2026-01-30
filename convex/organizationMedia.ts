/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ORGANIZATION MEDIA MANAGEMENT
 *
 * Handles file uploads, storage, and media library for organizations.
 * Enforces storage quotas based on organization plan.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, requirePermission, checkPermission } from "./rbacHelpers";
import { getLicenseInternal } from "./licensing/helpers";

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
    });

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
    });

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
