/**
 * PROJECT FILE SYSTEM — INTERNAL
 *
 * Internal mutations/queries for auto-capture hooks and AI knowledge base.
 * These bypass session-based auth and are called by other Convex functions.
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// HELPERS
// ============================================================================

function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

function normalizePath(path: string): string {
  let p = path.startsWith("/") ? path : "/" + path;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

// ============================================================================
// DEFAULT FOLDER INITIALIZATION
// ============================================================================

/**
 * Create the default folder structure for a new project.
 * Called by projectOntology.ts when a project is created.
 */
export const initializeProjectFolders = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const defaultFolders = [
      { name: "builder", path: "/builder", parentPath: "/" },
      { name: "layers", path: "/layers", parentPath: "/" },
      { name: "notes", path: "/notes", parentPath: "/" },
      { name: "assets", path: "/assets", parentPath: "/" },
    ];

    for (const folder of defaultFolders) {
      // Skip if already exists (idempotent)
      const existing = await ctx.db
        .query("projectFiles")
        .withIndex("by_project_path", (q) =>
          q.eq("projectId", args.projectId).eq("path", folder.path)
        )
        .first();
      if (existing) continue;

      await ctx.db.insert("projectFiles", {
        organizationId: args.organizationId,
        projectId: args.projectId,
        name: folder.name,
        path: folder.path,
        parentPath: folder.parentPath,
        fileKind: "folder",
        source: "migration",
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ============================================================================
// AUTO-CAPTURE HOOKS
// ============================================================================

/**
 * Capture a builder app into a project's file system.
 * Creates or updates a builder_ref entry at /builder/{app-name}.
 */
export const captureBuilderApp = internalMutation({
  args: {
    projectId: v.id("objects"),
    builderAppId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || project.type !== "project") return;

    const app = await ctx.db.get(args.builderAppId);
    if (!app || app.type !== "builder_app") return;

    const safeName = app.name.replace(/[^a-zA-Z0-9_\-. ]/g, "").trim() || "untitled-app";
    const path = normalizePath(`/builder/${safeName}`);
    const now = Date.now();

    // Upsert: check if ref already exists
    const existing = await ctx.db
      .query("projectFiles")
      .withIndex("by_builder_ref", (q) => q.eq("builderAppId", args.builderAppId))
      .collect();

    const existingInProject = existing.find((f) => f.projectId === args.projectId);

    if (existingInProject) {
      // Update name/path if app was renamed
      await ctx.db.patch(existingInProject._id, {
        name: safeName,
        path,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("projectFiles", {
        organizationId: project.organizationId,
        projectId: args.projectId,
        name: safeName,
        path,
        parentPath: "/builder",
        fileKind: "builder_ref",
        builderAppId: args.builderAppId,
        source: "builder_auto",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Ensure objectLink exists: project --[has_builder_app]--> app
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "has_builder_app")
      )
      .collect();

    const linkExists = links.some((l) => l.toObjectId === args.builderAppId);
    if (!linkExists) {
      await ctx.db.insert("objectLinks", {
        organizationId: project.organizationId,
        fromObjectId: args.projectId,
        toObjectId: args.builderAppId,
        linkType: "has_builder_app",
        createdAt: now,
      });
    }
  },
});

/**
 * Capture a layer workflow into a project's file system.
 * Creates or updates a layer_ref entry at /layers/{workflow-name}.
 */
export const captureLayerWorkflow = internalMutation({
  args: {
    projectId: v.id("objects"),
    layerWorkflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || project.type !== "project") return;

    const workflow = await ctx.db.get(args.layerWorkflowId);
    if (!workflow || workflow.type !== "layer_workflow") return;

    const safeName = workflow.name.replace(/[^a-zA-Z0-9_\-. ]/g, "").trim() || "untitled-workflow";
    const path = normalizePath(`/layers/${safeName}`);
    const now = Date.now();

    // Upsert
    const existing = await ctx.db
      .query("projectFiles")
      .withIndex("by_layer_ref", (q) => q.eq("layerWorkflowId", args.layerWorkflowId))
      .collect();

    const existingInProject = existing.find((f) => f.projectId === args.projectId);

    if (existingInProject) {
      await ctx.db.patch(existingInProject._id, {
        name: safeName,
        path,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("projectFiles", {
        organizationId: project.organizationId,
        projectId: args.projectId,
        name: safeName,
        path,
        parentPath: "/layers",
        fileKind: "layer_ref",
        layerWorkflowId: args.layerWorkflowId,
        source: "layers_auto",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Ensure objectLink exists
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "has_layer_workflow")
      )
      .collect();

    const linkExists = links.some((l) => l.toObjectId === args.layerWorkflowId);
    if (!linkExists) {
      await ctx.db.insert("objectLinks", {
        organizationId: project.organizationId,
        fromObjectId: args.projectId,
        toObjectId: args.layerWorkflowId,
        linkType: "has_layer_workflow",
        createdAt: now,
      });
    }
  },
});

/**
 * Remove a builder app capture from a project.
 */
export const removeBuilderCapture = internalMutation({
  args: {
    projectId: v.id("objects"),
    builderAppId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const refs = await ctx.db
      .query("projectFiles")
      .withIndex("by_builder_ref", (q) => q.eq("builderAppId", args.builderAppId))
      .collect();

    for (const ref of refs) {
      if (ref.projectId === args.projectId) {
        await ctx.db.delete(ref._id);
      }
    }

    // Remove objectLink
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "has_builder_app")
      )
      .collect();

    for (const link of links) {
      if (link.toObjectId === args.builderAppId) {
        await ctx.db.delete(link._id);
      }
    }
  },
});

/**
 * Remove a layer workflow capture from a project.
 */
export const removeLayerCapture = internalMutation({
  args: {
    projectId: v.id("objects"),
    layerWorkflowId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const refs = await ctx.db
      .query("projectFiles")
      .withIndex("by_layer_ref", (q) => q.eq("layerWorkflowId", args.layerWorkflowId))
      .collect();

    for (const ref of refs) {
      if (ref.projectId === args.projectId) {
        await ctx.db.delete(ref._id);
      }
    }

    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "has_layer_workflow")
      )
      .collect();

    for (const link of links) {
      if (link.toObjectId === args.layerWorkflowId) {
        await ctx.db.delete(link._id);
      }
    }
  },
});

// ============================================================================
// AI KNOWLEDGE BASE
// ============================================================================

/**
 * Get all project files as AI-readable context.
 * Assembles content from all file kinds into a single knowledge base string.
 *
 * Used by the AI chat system to inject project context into prompts.
 */
export const getProjectKnowledgeBase = internalQuery({
  args: {
    projectId: v.id("objects"),
    filterPaths: v.optional(v.array(v.string())),
    maxChars: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const MAX_CHARS = args.maxChars || 80_000;

    const allFiles = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Filter to content-bearing files (exclude folders)
    let files = allFiles.filter((f) => f.fileKind !== "folder");

    // Apply path filters if provided
    if (args.filterPaths && args.filterPaths.length > 0) {
      const prefixes = args.filterPaths.map(normalizePath);
      files = files.filter((f) =>
        prefixes.some((prefix) => f.path.startsWith(prefix))
      );
    }

    // Sort by path for consistent ordering
    files.sort((a, b) => a.path.localeCompare(b.path));

    const sections: string[] = [];
    let totalChars = 0;

    for (const file of files) {
      let content = "";

      switch (file.fileKind) {
        case "virtual":
          content = file.content || "";
          break;

        case "media_ref":
          if (file.mediaId) {
            const media = await ctx.db.get(file.mediaId);
            if (media) {
              content = media.documentContent || (media as any).extractedText || `[File: ${media.filename}, ${media.mimeType}]`;
            }
          }
          break;

        case "builder_ref":
          if (file.builderAppId) {
            const app = await ctx.db.get(file.builderAppId);
            if (app) {
              // Get file listing for the builder app
              const builderFiles = await ctx.db
                .query("builderFiles")
                .withIndex("by_app", (q) => q.eq("appId", file.builderAppId!))
                .collect();

              const fileList = builderFiles
                .map((bf) => `  ${bf.path} (${bf.language}, ${bf.content.length} chars)`)
                .join("\n");

              content = `Builder App: ${app.name}\nStatus: ${app.status}\nFiles:\n${fileList}`;
            }
          }
          break;

        case "layer_ref":
          if (file.layerWorkflowId) {
            const workflow = await ctx.db.get(file.layerWorkflowId);
            if (workflow) {
              const props = workflow.customProperties as any;
              const nodes = props?.nodes || [];
              const edges = props?.edges || [];
              const nodeList = nodes
                .map((n: any) => `  [${n.type}] ${n.data?.label || n.id}`)
                .join("\n");

              content = `Workflow: ${workflow.name}\nStatus: ${workflow.status}\nNodes (${nodes.length}):\n${nodeList}\nConnections: ${edges.length}`;
            }
          }
          break;
      }

      if (!content) continue;

      const section = `--- ${file.path} ---\n${content}`;
      if (totalChars + section.length > MAX_CHARS) {
        sections.push(`\n[Knowledge base truncated at ${MAX_CHARS} characters]`);
        break;
      }

      sections.push(section);
      totalChars += section.length;
    }

    return {
      content: sections.join("\n\n"),
      fileCount: files.length,
      totalChars,
    };
  },
});

/**
 * Get project files for a specific kind (used by UI to list builder apps, workflows, etc.).
 */
export const getFilesByKind = internalQuery({
  args: {
    projectId: v.id("objects"),
    fileKind: v.union(
      v.literal("virtual"),
      v.literal("uploaded"),
      v.literal("media_ref"),
      v.literal("builder_ref"),
      v.literal("layer_ref"),
      v.literal("folder")
    ),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_kind", (q) =>
        q.eq("projectId", args.projectId).eq("fileKind", args.fileKind)
      )
      .collect();
    return files.filter((f) => f.isDeleted !== true);
  },
});

// ============================================================================
// ORG-LEVEL FOLDER INITIALIZATION
// ============================================================================

/**
 * Create default folder structure for org-level files.
 * Called on first org-scope Finder open.
 */
export const initializeOrgFolders = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const defaultFolders = [
      { name: "Shared", path: "/Shared", parentPath: "/" },
      { name: "Brand Assets", path: "/Brand Assets", parentPath: "/" },
      { name: "Templates", path: "/Templates", parentPath: "/" },
    ];

    for (const folder of defaultFolders) {
      // Check for existing (idempotent)
      const matches = await ctx.db
        .query("projectFiles")
        .withIndex("by_org_path", (q) =>
          q.eq("organizationId", args.organizationId).eq("path", folder.path)
        )
        .collect();

      const existing = matches.find((f) => !f.projectId);
      if (existing) continue;

      await ctx.db.insert("projectFiles", {
        organizationId: args.organizationId,
        name: folder.name,
        path: folder.path,
        parentPath: folder.parentPath,
        fileKind: "folder",
        source: "migration",
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ============================================================================
// TRASH PURGE
// ============================================================================

/**
 * Purge files that have been in trash for 30+ days.
 * Called by daily cron job.
 */
export const purgeExpiredTrash = internalMutation({
  args: {},
  handler: async (ctx) => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - THIRTY_DAYS_MS;

    // Get all orgs that have trashed files
    const allOrgs = await ctx.db.query("organizations").collect();
    let totalPurged = 0;

    for (const org of allOrgs) {
      const trashedFiles = await ctx.db
        .query("projectFiles")
        .withIndex("by_deleted", (q) =>
          q.eq("organizationId", org._id).eq("isDeleted", true)
        )
        .collect();

      for (const file of trashedFiles) {
        if (file.deletedAt && file.deletedAt < cutoff) {
          // Clean up storage for uploaded files
          if (file.fileKind === "uploaded" && file.storageId) {
            await ctx.storage.delete(file.storageId);
          }

          // Clean up bookmarks
          const bookmarks = await ctx.db
            .query("userFileBookmarks")
            .withIndex("by_file", (q) => q.eq("fileId", file._id))
            .collect();
          for (const bm of bookmarks) {
            await ctx.db.delete(bm._id);
          }

          // Clean up recent file entries
          // Note: no by_file index on userRecentFiles, so we skip this for cron perf.
          // Orphaned recents are filtered out when queried.

          await ctx.db.delete(file._id);
          totalPurged++;
        }
      }
    }

    console.log(`[Trash Purge] Permanently deleted ${totalPurged} files older than 30 days`);
    return { purged: totalPurged };
  },
});
