/**
 * MEDIA FOLDER ONTOLOGY HELPERS
 *
 * Helper functions for managing media folders in the ontology system.
 * Supports unlimited depth folder hierarchy with parent/child relationships.
 *
 * Object Types:
 * - media_folder: Folders for organizing media files
 *
 * Relationships:
 * - parentFolder: Links child folder to parent folder (self-referencing)
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, requirePermission } from "./rbacHelpers";

/**
 * GET FOLDER BY ID
 * Retrieves a single folder by its object ID
 */
export const getFolder = query({
  args: {
    folderId: v.string(), // Object ID in ontology
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { folderId, organizationId }) => {
    const folder = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "media_folder")
      )
      .filter(q => q.eq(q.field("_id"), folderId as Id<"objects">))
      .first();

    return folder;
  },
});

/**
 * LIST FOLDERS
 * Lists all folders for an organization, optionally filtered by parent
 */
export const listFolders = query({
  args: {
    organizationId: v.id("organizations"),
    parentFolderId: v.optional(v.string()), // null = root level folders
  },
  handler: async (ctx, { organizationId, parentFolderId }) => {
    const folders = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "media_folder")
      )
      .collect();

    // Filter by parent
    if (parentFolderId === null || parentFolderId === undefined) {
      // Return root level folders (no parent)
      return folders.filter(f =>
        !f.customProperties?.parentFolderId
      );
    } else {
      // Return child folders of specific parent
      return folders.filter(f =>
        f.customProperties?.parentFolderId === parentFolderId
      );
    }
  },
});

/**
 * GET FOLDER TREE
 * Gets the complete folder hierarchy for an organization
 * Returns folders with their children nested
 */
export const getFolderTree = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const allFolders = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "media_folder")
      )
      .collect();

    // Build tree structure
    const buildTree = (parentId: string | null | undefined): typeof allFolders => {
      return allFolders
        .filter(f => f.customProperties?.parentFolderId === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(folder._id),
        }));
    };

    return buildTree(null);
  },
});

/**
 * GET FOLDER PATH
 * Gets the breadcrumb path from root to a specific folder
 */
export const getFolderPath = query({
  args: {
    folderId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { folderId, organizationId }) => {
    const path = [];
    let currentId: string | null | undefined = folderId;

    while (currentId) {
      const folder = await ctx.db
        .query("objects")
        .withIndex("by_org_type", q =>
          q.eq("organizationId", organizationId)
           .eq("type", "media_folder")
        )
        .filter(q => q.eq(q.field("_id"), currentId as Id<"objects">))
        .first();

      if (!folder) break;

      path.unshift({
        _id: folder._id,
        name: folder.name,
      });

      currentId = folder.customProperties?.parentFolderId;
    }

    return path;
  },
});

/**
 * CREATE FOLDER
 * Creates a new media folder
 */
export const createFolder = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    parentFolderId: v.optional(v.string()), // null = root level
  },
  handler: async (ctx, args) => {
    // RBAC check
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, userId, "media_library.upload", {
      organizationId: args.organizationId,
    });

    // Validate parent folder exists if specified
    if (args.parentFolderId) {
      const parentFolder = await ctx.db
        .query("objects")
        .withIndex("by_org_type", q =>
          q.eq("organizationId", args.organizationId)
           .eq("type", "media_folder")
        )
        .filter(q => q.eq(q.field("_id"), args.parentFolderId as Id<"objects">))
        .first();

      if (!parentFolder) {
        throw new Error("Parent folder not found");
      }
    }

    // Create folder object
    const folderId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "media_folder",
      subtype: "folder",
      name: args.name,
      status: "active",
      customProperties: {
        description: args.description,
        color: args.color,
        parentFolderId: args.parentFolderId,
        createdBy: userId,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      objectId: folderId,
      organizationId: args.organizationId,
      performedBy: userId,
      actionType: "created",
      performedAt: Date.now(),
      actionData: {
        folderName: args.name,
      },
    });

    return folderId;
  },
});

/**
 * UPDATE FOLDER
 * Updates folder properties
 */
export const updateFolder = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    folderId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // RBAC check
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, userId, "media_library.edit", {
      organizationId: args.organizationId,
    });

    // Get existing folder
    const folder = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "media_folder")
      )
      .filter(q => q.eq(q.field("_id"), args.folderId as Id<"objects">))
      .first();

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Update folder
    await ctx.db.patch(args.folderId as Id<"objects">, {
      name: args.name ?? folder.name,
      customProperties: {
        ...folder.customProperties,
        description: args.description ?? folder.customProperties?.description,
        color: args.color ?? folder.customProperties?.color,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      objectId: args.folderId as Id<"objects">,
      organizationId: args.organizationId,
      performedBy: userId,
      actionType: "updated",
      performedAt: Date.now(),
      actionData: {
        changes: { name: args.name, description: args.description, color: args.color },
      },
    });

    return { success: true };
  },
});

/**
 * DELETE FOLDER
 * Deletes a folder (must be empty - no files or subfolders)
 */
export const deleteFolder = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    folderId: v.string(),
  },
  handler: async (ctx, args) => {
    // RBAC check
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, userId, "media_library.delete", {
      organizationId: args.organizationId,
    });

    // Check if folder has any files
    const filesInFolder = await ctx.db
      .query("organizationMedia")
      .withIndex("by_folder", q => q.eq("folderId", args.folderId))
      .first();

    if (filesInFolder) {
      throw new Error("Cannot delete folder: contains files. Please move or delete files first.");
    }

    // Check if folder has any subfolders
    const subfolders = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "media_folder")
      )
      .filter(q => q.eq(q.field("customProperties.parentFolderId"), args.folderId))
      .first();

    if (subfolders) {
      throw new Error("Cannot delete folder: contains subfolders. Please delete subfolders first.");
    }

    // Delete folder
    await ctx.db.delete(args.folderId as Id<"objects">);

    // Log action
    await ctx.db.insert("objectActions", {
      objectId: args.folderId as Id<"objects">,
      organizationId: args.organizationId,
      performedBy: userId,
      actionType: "deleted",
      performedAt: Date.now(),
      actionData: {},
    });

    return { success: true };
  },
});

/**
 * MOVE FOLDER
 * Moves a folder to a different parent folder
 */
export const moveFolder = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    folderId: v.string(),
    newParentFolderId: v.optional(v.string()), // null = move to root
  },
  handler: async (ctx, args) => {
    // RBAC check
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, userId, "media_library.edit", {
      organizationId: args.organizationId,
    });

    // Get folder
    const folder = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", args.organizationId)
         .eq("type", "media_folder")
      )
      .filter(q => q.eq(q.field("_id"), args.folderId as Id<"objects">))
      .first();

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Prevent moving folder into itself or its descendants
    if (args.newParentFolderId === args.folderId) {
      throw new Error("Cannot move folder into itself");
    }

    // Validate new parent folder exists if specified
    if (args.newParentFolderId) {
      const newParent = await ctx.db
        .query("objects")
        .withIndex("by_org_type", q =>
          q.eq("organizationId", args.organizationId)
           .eq("type", "media_folder")
        )
        .filter(q => q.eq(q.field("_id"), args.newParentFolderId as Id<"objects">))
        .first();

      if (!newParent) {
        throw new Error("Target folder not found");
      }
    }

    // Update folder parent
    await ctx.db.patch(args.folderId as Id<"objects">, {
      customProperties: {
        ...folder.customProperties,
        parentFolderId: args.newParentFolderId,
      },
      updatedAt: Date.now(),
    });

    // Log action
    await ctx.db.insert("objectActions", {
      objectId: args.folderId as Id<"objects">,
      organizationId: args.organizationId,
      performedBy: userId,
      actionType: "moved",
      performedAt: Date.now(),
      actionData: {
        newParentFolderId: args.newParentFolderId,
      },
    });

    return { success: true };
  },
});
