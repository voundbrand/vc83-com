/**
 * FILE SYSTEM ONTOLOGY
 *
 * CRUD operations for the builderFiles table.
 * Provides the Virtual File System (VFS) layer for builder apps.
 *
 * Files are stored individually (one Convex document per file) for:
 * - Per-file reactivity (editing one file doesn't re-render everything)
 * - Granular access (read/update single files without loading all content)
 * - Git-style change tracking via contentHash + lastModifiedBy
 */

import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser, checkPermission } from "./rbacHelpers";

// ============================================================================
// VALIDATORS
// ============================================================================

const modifiedByValidator = v.union(
  v.literal("v0"),
  v.literal("user"),
  v.literal("self-heal"),
  v.literal("scaffold")
);

const fileInputValidator = v.object({
  path: v.string(),
  content: v.string(),
  language: v.string(),
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET FILES BY APP (Authenticated)
 * Returns all files for a builder app. Used by frontend (Files tab).
 */
export const getFilesByApp = query({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied");
    }

    return await ctx.db
      .query("builderFiles")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();
  },
});

/**
 * GET FILES BY APP (Internal)
 * For use by actions (selfHealDeploy, github, etc.) that don't have session context.
 */
export const getFilesByAppInternal = internalQuery({
  args: {
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("builderFiles")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();
  },
});

/**
 * GET SINGLE FILE
 */
export const getFile = query({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    const hasPermission = await checkPermission(
      ctx,
      userId,
      "view_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied");
    }

    const files = await ctx.db
      .query("builderFiles")
      .withIndex("by_app_path", (q) =>
        q.eq("appId", args.appId).eq("path", args.path)
      )
      .collect();

    return files[0] || null;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Simple hash function for content change detection.
 */
function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

/**
 * BULK UPSERT FILES
 * Insert or update multiple files for an app.
 * Used by v0 chat responses and self-heal fixes.
 */
export const bulkUpsertFiles = internalMutation({
  args: {
    appId: v.id("objects"),
    files: v.array(fileInputValidator),
    modifiedBy: modifiedByValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const isScaffold = args.modifiedBy === "scaffold";

    // Get existing files for this app
    const existing = await ctx.db
      .query("builderFiles")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();

    const existingByPath = new Map(existing.map((f) => [f.path, f]));

    for (const file of args.files) {
      const contentHash = simpleHash(file.content);
      const existingFile = existingByPath.get(file.path);

      if (existingFile) {
        // Update if content changed
        if (existingFile.contentHash !== contentHash) {
          await ctx.db.patch(existingFile._id, {
            content: file.content,
            language: file.language,
            contentHash,
            lastModifiedAt: now,
            lastModifiedBy: args.modifiedBy,
          });
        }
      } else {
        // Insert new file
        await ctx.db.insert("builderFiles", {
          appId: args.appId,
          path: file.path,
          content: file.content,
          language: file.language,
          contentHash,
          lastModifiedAt: now,
          lastModifiedBy: args.modifiedBy,
          isScaffold,
        });
      }
    }

    return { upserted: args.files.length };
  },
});

/**
 * BULK UPSERT FILES (Authenticated)
 * Same as above but with session-based auth. Used by frontend mutations.
 */
export const bulkUpsertFilesAuthenticated = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    files: v.array(fileInputValidator),
    modifiedBy: modifiedByValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied");
    }

    const now = Date.now();
    const isScaffold = args.modifiedBy === "scaffold";

    const existing = await ctx.db
      .query("builderFiles")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();

    const existingByPath = new Map(existing.map((f) => [f.path, f]));

    for (const file of args.files) {
      const contentHash = simpleHash(file.content);
      const existingFile = existingByPath.get(file.path);

      if (existingFile) {
        if (existingFile.contentHash !== contentHash) {
          await ctx.db.patch(existingFile._id, {
            content: file.content,
            language: file.language,
            contentHash,
            lastModifiedAt: now,
            lastModifiedBy: args.modifiedBy,
          });
        }
      } else {
        await ctx.db.insert("builderFiles", {
          appId: args.appId,
          path: file.path,
          content: file.content,
          language: file.language,
          contentHash,
          lastModifiedAt: now,
          lastModifiedBy: args.modifiedBy,
          isScaffold,
        });
      }
    }

    return { upserted: args.files.length };
  },
});

/**
 * UPDATE SINGLE FILE CONTENT
 */
export const updateFileContent = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    path: v.string(),
    content: v.string(),
    modifiedBy: modifiedByValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    const hasPermission = await checkPermission(
      ctx,
      userId,
      "edit_published_pages",
      app.organizationId
    );
    if (!hasPermission) {
      throw new Error("Permission denied");
    }

    const files = await ctx.db
      .query("builderFiles")
      .withIndex("by_app_path", (q) =>
        q.eq("appId", args.appId).eq("path", args.path)
      )
      .collect();

    const file = files[0];
    if (!file) {
      throw new Error(`File not found: ${args.path}`);
    }

    const contentHash = simpleHash(args.content);

    await ctx.db.patch(file._id, {
      content: args.content,
      contentHash,
      lastModifiedAt: Date.now(),
      lastModifiedBy: args.modifiedBy,
    });

    return { success: true };
  },
});

/**
 * DELETE ALL FILES FOR AN APP
 */
export const deleteFilesByApp = internalMutation({
  args: {
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("builderFiles")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();

    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    return { deleted: files.length };
  },
});
