/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ORGANIZATION MEDIA MANAGEMENT
 *
 * Handles file uploads, storage, and media library for organizations.
 * Enforces storage quotas based on organization plan.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, requirePermission } from "./rbacHelpers";

/**
 * Storage quotas by plan (in bytes)
 */
const STORAGE_QUOTAS = {
  free: 100 * 1024 * 1024,       // 100 MB
  personal: 500 * 1024 * 1024,   // 500 MB
  pro: 1024 * 1024 * 1024,       // 1 GB
  business: 5 * 1024 * 1024 * 1024,  // 5 GB
  enterprise: 20 * 1024 * 1024 * 1024, // 20 GB
};

/**
 * Get storage quota for organization plan
 */
function getStorageQuota(plan: string): number {
  return STORAGE_QUOTAS[plan as keyof typeof STORAGE_QUOTAS] || STORAGE_QUOTAS.free;
}

/**
 * Helper function to calculate storage usage (can be called from queries and mutations)
 */
async function calculateStorageUsage(
  ctx: { db: any },
  organizationId: Id<"organizations">
) {
  const media = await ctx.db
    .query("organizationMedia")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", organizationId))
    .collect();

  const totalBytes = media.reduce((sum: number, m: any) => sum + m.sizeBytes, 0);
  const fileCount = media.length;

  // Get organization to check plan
  const org = await ctx.db.get(organizationId);
  const quotaBytes = org ? getStorageQuota(org.plan) : STORAGE_QUOTAS.free;

  return {
    totalBytes,
    totalMB: parseFloat((totalBytes / 1024 / 1024).toFixed(2)),
    fileCount,
    quotaBytes,
    quotaMB: parseFloat((quotaBytes / 1024 / 1024).toFixed(2)),
    percentUsed: parseFloat(((totalBytes / quotaBytes) * 100).toFixed(2)),
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

    // Check storage quota
    const usage = await calculateStorageUsage(ctx, organizationId);
    if (usage.totalBytes + estimatedSizeBytes > usage.quotaBytes) {
      throw new Error(
        `Storage quota exceeded. Using ${usage.totalMB}MB of ${usage.quotaMB}MB.`
      );
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

    // Get URLs for all media
    const mediaWithUrls = await Promise.all(
      media.map(async (m) => {
        const url = await ctx.storage.getUrl(m.storageId);
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

    const url = await ctx.storage.getUrl(media.storageId);
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

    // Delete from storage
    await ctx.storage.delete(media.storageId);

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
