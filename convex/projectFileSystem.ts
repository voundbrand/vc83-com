/**
 * PROJECT FILE SYSTEM
 *
 * Authenticated CRUD operations for the org + project-scoped file system.
 * Files can be org-level (projectId = undefined) or project-scoped.
 *
 * File kinds:
 * - folder      → Directory marker
 * - virtual     → Inline content (markdown, JSON, configs)
 * - uploaded    → Direct upload stored in Convex storage
 * - media_ref   → Reference to organizationMedia (legacy)
 * - builder_ref → Reference to a builder_app object
 * - layer_ref   → Reference to a layer_workflow object
 *
 * Cross-org access: queries check projectShares for non-owner orgs.
 * Soft-delete: files go to trash, auto-purged after 30 days.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser, checkPermission } from "./rbacHelpers";

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

function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return "/";
  return normalized.substring(0, lastSlash);
}

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Check if the user has access to a project's file system.
 */
async function checkProjectAccess(
  ctx: any,
  userId: Id<"users">,
  userOrgId: Id<"organizations">,
  projectId: Id<"objects">,
  requestedPath?: string
): Promise<{ access: "owner" | "viewer" | "editor" | "admin" } | null> {
  const project = await ctx.db.get(projectId);
  if (!project || project.type !== "project") return null;

  if (project.organizationId === userOrgId) {
    const hasPermission = await checkPermission(
      ctx, userId, "media_library.view", userOrgId
    );
    return hasPermission ? { access: "owner" } : null;
  }

  const shares = await ctx.db
    .query("projectShares")
    .withIndex("by_project_target", (q: any) =>
      q.eq("projectId", projectId).eq("targetOrgId", userOrgId)
    )
    .collect();

  const activeShare = shares.find((s: any) => s.status === "active");
  if (!activeShare) return null;

  if (activeShare.shareScope === "subtree" && requestedPath) {
    const normalizedShared = normalizePath(activeShare.sharedPath || "/");
    const normalizedReq = normalizePath(requestedPath);
    if (!normalizedReq.startsWith(normalizedShared)) return null;
  }

  return { access: activeShare.permission };
}

/**
 * Check if user has access to org-level files (no project context).
 */
async function checkOrgAccess(
  ctx: any,
  userId: Id<"users">,
  userOrgId: Id<"organizations">,
  targetOrgId: Id<"organizations">
): Promise<{ access: "owner" } | null> {
  if (userOrgId !== targetOrgId) return null;
  const hasPermission = await checkPermission(
    ctx, userId, "media_library.view", userOrgId
  );
  return hasPermission ? { access: "owner" } : null;
}

/**
 * Unified access check — works for both project-scoped and org-level files.
 */
async function checkFileAccess(
  ctx: any,
  userId: Id<"users">,
  userOrgId: Id<"organizations">,
  organizationId: Id<"organizations">,
  projectId?: Id<"objects">,
  requestedPath?: string
): Promise<{ access: "owner" | "viewer" | "editor" | "admin" } | null> {
  if (projectId) {
    return checkProjectAccess(ctx, userId, userOrgId, projectId, requestedPath);
  }
  return checkOrgAccess(ctx, userId, userOrgId, organizationId);
}

function canWrite(access: string): boolean {
  return access === "owner" || access === "editor" || access === "admin";
}

/**
 * List files at a path, handling both project-scoped and org-scoped queries.
 * Filters out soft-deleted files.
 */
async function queryFilesAtPath(
  ctx: any,
  organizationId: Id<"organizations">,
  projectId: Id<"objects"> | undefined,
  parentPath: string
) {
  let files;
  if (projectId) {
    files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_parent", (q: any) =>
        q.eq("projectId", projectId).eq("parentPath", parentPath)
      )
      .collect();
  } else {
    files = await ctx.db
      .query("projectFiles")
      .withIndex("by_org_parent", (q: any) =>
        q.eq("organizationId", organizationId).eq("parentPath", parentPath)
      )
      .collect();
    // Org-parent index returns all org files at this path; filter to org-level only
    files = files.filter((f: any) => !f.projectId);
  }
  return files.filter((f: any) => f.isDeleted !== true);
}

/**
 * Find file by path, handling both scopes.
 */
async function queryFileByPath(
  ctx: any,
  organizationId: Id<"organizations">,
  projectId: Id<"objects"> | undefined,
  path: string
) {
  if (projectId) {
    return await ctx.db
      .query("projectFiles")
      .withIndex("by_project_path", (q: any) =>
        q.eq("projectId", projectId).eq("path", path)
      )
      .first();
  }
  const matches = await ctx.db
    .query("projectFiles")
    .withIndex("by_org_path", (q: any) =>
      q.eq("organizationId", organizationId).eq("path", path)
    )
    .collect();
  return matches.find((f: any) => !f.projectId) || null;
}

/**
 * Get all files in scope (project or org-level).
 */
async function queryAllFilesInScope(
  ctx: any,
  organizationId: Id<"organizations">,
  projectId: Id<"objects"> | undefined
) {
  if (projectId) {
    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
      .collect();
    return files.filter((f: any) => f.isDeleted !== true);
  }
  const files = await ctx.db
    .query("projectFiles")
    .withIndex("by_org", (q: any) => q.eq("organizationId", organizationId))
    .collect();
  return files.filter((f: any) => !f.projectId && f.isDeleted !== true);
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * LIST FILES in a directory (project-scoped or org-scoped).
 */
export const listFiles = query({
  args: {
    sessionId: v.string(),
    projectId: v.optional(v.id("objects")),
    organizationId: v.optional(v.id("organizations")),
    parentPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const parentPath = normalizePath(args.parentPath || "/");
    const orgId = args.organizationId || userOrgId;

    const access = await checkFileAccess(ctx, userId, userOrgId, orgId, args.projectId, parentPath);
    if (!access) throw new Error("Access denied");

    return await queryFilesAtPath(ctx, orgId, args.projectId, parentPath);
  },
});

/**
 * GET a single file by path.
 */
export const getFile = query({
  args: {
    sessionId: v.string(),
    projectId: v.optional(v.id("objects")),
    organizationId: v.optional(v.id("organizations")),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const path = normalizePath(args.path);
    const orgId = args.organizationId || userOrgId;

    const access = await checkFileAccess(ctx, userId, userOrgId, orgId, args.projectId, path);
    if (!access) throw new Error("Access denied");

    const file = await queryFileByPath(ctx, orgId, args.projectId, path);
    if (file && file.isDeleted) return null;
    return file || null;
  },
});

/**
 * GET the full file tree for a project or org.
 */
export const getFileTree = query({
  args: {
    sessionId: v.string(),
    projectId: v.optional(v.id("objects")),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const orgId = args.organizationId || userOrgId;

    const access = await checkFileAccess(ctx, userId, userOrgId, orgId, args.projectId);
    if (!access) throw new Error("Access denied");

    const allFiles = await queryAllFilesInScope(ctx, orgId, args.projectId);

    // For subtree shares, filter to visible paths
    if (args.projectId && access.access !== "owner") {
      const shares = await ctx.db
        .query("projectShares")
        .withIndex("by_project_target", (q: any) =>
          q.eq("projectId", args.projectId).eq("targetOrgId", userOrgId)
        )
        .collect();

      const activeShare = shares.find((s: any) => s.status === "active");
      if (activeShare?.shareScope === "subtree" && activeShare.sharedPath) {
        const prefix = normalizePath(activeShare.sharedPath);
        return allFiles
          .filter((f: any) => f.path.startsWith(prefix))
          .sort((a: any, b: any) => a.path.localeCompare(b.path));
      }
    }

    return allFiles.sort((a: any, b: any) => a.path.localeCompare(b.path));
  },
});

/**
 * GET breadcrumb segments for a path.
 */
export const getBreadcrumbs = query({
  args: {
    sessionId: v.string(),
    projectId: v.optional(v.id("objects")),
    organizationId: v.optional(v.id("organizations")),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const orgId = args.organizationId || userOrgId;

    const access = await checkFileAccess(ctx, userId, userOrgId, orgId, args.projectId);
    if (!access) throw new Error("Access denied");

    const normalized = normalizePath(args.path);
    const segments = normalized.split("/").filter(Boolean);

    let rootName = "Organization Files";
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      rootName = project?.name || "Project";
    }

    const breadcrumbs = [{ name: rootName, path: "/" }];
    let currentPath = "";
    for (const segment of segments) {
      currentPath += "/" + segment;
      breadcrumbs.push({ name: segment, path: currentPath });
    }

    return breadcrumbs;
  },
});

/**
 * GET file content optimized for editor use.
 */
export const getFileContent = query({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || file.isDeleted) throw new Error("File not found");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId, file.path);
    if (!access) throw new Error("Access denied");

    if (file.fileKind === "virtual") {
      return {
        type: "virtual" as const,
        content: file.content || "",
        mimeType: file.mimeType,
        language: file.language,
      };
    }

    if (file.fileKind === "uploaded" && file.storageId) {
      const url = await ctx.storage.getUrl(file.storageId);
      return {
        type: "uploaded" as const,
        url,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      };
    }

    if (file.fileKind === "media_ref" && file.mediaId) {
      const media = await ctx.db.get(file.mediaId);
      let url: string | null = null;
      if (media?.storageId) {
        url = await ctx.storage.getUrl(media.storageId);
      }
      return {
        type: "media" as const,
        url,
        mimeType: file.mimeType || media?.mimeType,
        sizeBytes: file.sizeBytes || media?.sizeBytes,
      };
    }

    if (file.fileKind === "builder_ref" && file.builderAppId) {
      const app = await ctx.db.get(file.builderAppId);
      return {
        type: "builder_ref" as const,
        appName: app?.name || "Unknown",
        appId: file.builderAppId,
      };
    }

    if (file.fileKind === "layer_ref" && file.layerWorkflowId) {
      const workflow = await ctx.db.get(file.layerWorkflowId);
      return {
        type: "layer_ref" as const,
        workflowName: workflow?.name || "Unknown",
        workflowId: file.layerWorkflowId,
      };
    }

    return { type: "unknown" as const };
  },
});

/**
 * LIST TRASH — all soft-deleted files for an org.
 */
export const listTrash = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const orgId = args.organizationId || userOrgId;

    const access = await checkOrgAccess(ctx, userId, userOrgId, orgId);
    if (!access) throw new Error("Access denied");

    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_deleted", (q: any) =>
        q.eq("organizationId", orgId).eq("isDeleted", true)
      )
      .collect();

    // Sort by deletedAt descending (most recent first)
    return files.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  },
});

/**
 * COUNT of items in trash (for sidebar badge).
 */
export const trashCount = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const orgId = args.organizationId || userOrgId;

    const access = await checkOrgAccess(ctx, userId, userOrgId, orgId);
    if (!access) return 0;

    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_deleted", (q: any) =>
        q.eq("organizationId", orgId).eq("isDeleted", true)
      )
      .collect();

    return files.length;
  },
});

// ============================================================================
// MUTATIONS — FILE CRUD
// ============================================================================

/**
 * CREATE a folder.
 */
export const createFolder = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.optional(v.id("objects")),
    organizationId: v.optional(v.id("organizations")),
    parentPath: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const parentPath = normalizePath(args.parentPath);
    const path = normalizePath(`${parentPath}/${args.name}`);

    let orgId: Id<"organizations">;
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project) throw new Error("Project not found");
      orgId = project.organizationId;
    } else {
      orgId = args.organizationId || userOrgId;
    }

    const access = await checkFileAccess(ctx, userId, userOrgId, orgId, args.projectId, parentPath);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    const existing = await queryFileByPath(ctx, orgId, args.projectId, path);
    if (existing && !existing.isDeleted) throw new Error("A file or folder already exists at this path");

    const now = Date.now();
    return await ctx.db.insert("projectFiles", {
      organizationId: orgId,
      projectId: args.projectId,
      name: args.name,
      path,
      parentPath,
      fileKind: "folder",
      source: "user",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * CREATE a virtual file (markdown note, JSON config, plain text, code file, etc.).
 */
export const createVirtualFile = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.optional(v.id("objects")),
    organizationId: v.optional(v.id("organizations")),
    parentPath: v.string(),
    name: v.string(),
    content: v.string(),
    mimeType: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const parentPath = normalizePath(args.parentPath);
    const path = normalizePath(`${parentPath}/${args.name}`);

    let orgId: Id<"organizations">;
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project) throw new Error("Project not found");
      orgId = project.organizationId;
    } else {
      orgId = args.organizationId || userOrgId;
    }

    const access = await checkFileAccess(ctx, userId, userOrgId, orgId, args.projectId, parentPath);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    const existing = await queryFileByPath(ctx, orgId, args.projectId, path);
    if (existing && !existing.isDeleted) throw new Error("A file already exists at this path");

    const now = Date.now();
    return await ctx.db.insert("projectFiles", {
      organizationId: orgId,
      projectId: args.projectId,
      name: args.name,
      path,
      parentPath,
      fileKind: "virtual",
      content: args.content,
      contentHash: simpleHash(args.content),
      mimeType: args.mimeType || "text/markdown",
      sizeBytes: new TextEncoder().encode(args.content).length,
      language: args.language || "markdown",
      source: "user",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * CREATE a media reference (link org media into project).
 */
export const createMediaRef = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    parentPath: v.string(),
    mediaId: v.id("organizationMedia"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const parentPath = normalizePath(args.parentPath);

    const access = await checkProjectAccess(ctx, userId, organizationId, args.projectId, parentPath);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const media = await ctx.db.get(args.mediaId);
    if (!media) throw new Error("Media not found");

    const path = normalizePath(`${parentPath}/${media.filename}`);

    const now = Date.now();
    return await ctx.db.insert("projectFiles", {
      organizationId: project.organizationId,
      projectId: args.projectId,
      name: media.filename,
      path,
      parentPath,
      fileKind: "media_ref",
      mediaId: args.mediaId,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      source: "user",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * UPDATE virtual file content.
 */
export const updateFileContent = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || file.isDeleted) throw new Error("File not found");
    if (file.fileKind !== "virtual") throw new Error("Only virtual files can be edited");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId, file.path);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    await ctx.db.patch(args.fileId, {
      content: args.content,
      contentHash: simpleHash(args.content),
      sizeBytes: new TextEncoder().encode(args.content).length,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * RENAME a file or folder.
 */
export const renameFile = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || file.isDeleted) throw new Error("File not found");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId, file.path);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    const newPath = normalizePath(`${file.parentPath}/${args.newName}`);

    const existing = await queryFileByPath(ctx, file.organizationId, file.projectId, newPath);
    if (existing && !existing.isDeleted) throw new Error("A file already exists at the target path");

    // If folder, update all children's paths
    if (file.fileKind === "folder") {
      const oldPrefix = file.path;
      const allFiles = await queryAllFilesInScope(ctx, file.organizationId, file.projectId);

      for (const child of allFiles) {
        if (child.path.startsWith(oldPrefix + "/")) {
          const newChildPath = newPath + child.path.substring(oldPrefix.length);
          const newChildParent = getParentPath(newChildPath);
          await ctx.db.patch(child._id, {
            path: newChildPath,
            parentPath: newChildParent,
            updatedAt: Date.now(),
          });
        }
      }
    }

    await ctx.db.patch(args.fileId, {
      name: args.newName,
      path: newPath,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * MOVE a file or folder to a different parent.
 */
export const moveFile = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
    newParentPath: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || file.isDeleted) throw new Error("File not found");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId, file.path);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    const newParent = normalizePath(args.newParentPath);
    const newPath = normalizePath(`${newParent}/${file.name}`);

    const existing = await queryFileByPath(ctx, file.organizationId, file.projectId, newPath);
    if (existing && !existing.isDeleted) throw new Error("A file already exists at the target path");

    if (file.fileKind === "folder") {
      const oldPrefix = file.path;
      const allFiles = await queryAllFilesInScope(ctx, file.organizationId, file.projectId);

      for (const child of allFiles) {
        if (child.path.startsWith(oldPrefix + "/")) {
          const newChildPath = newPath + child.path.substring(oldPrefix.length);
          const newChildParent = getParentPath(newChildPath);
          await ctx.db.patch(child._id, {
            path: newChildPath,
            parentPath: newChildParent,
            updatedAt: Date.now(),
          });
        }
      }
    }

    await ctx.db.patch(args.fileId, {
      path: newPath,
      parentPath: newParent,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * SOFT-DELETE a single file (move to trash).
 */
export const softDeleteFile = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || file.isDeleted) throw new Error("File not found");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId, file.path);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    const now = Date.now();

    // Mark file as deleted
    await ctx.db.patch(args.fileId, {
      isDeleted: true,
      deletedAt: now,
      deletedBy: userId,
      originalPath: file.path,
    });

    // If folder, recursively soft-delete children
    if (file.fileKind === "folder") {
      const allFiles = file.projectId
        ? await ctx.db
            .query("projectFiles")
            .withIndex("by_project", (q: any) => q.eq("projectId", file.projectId))
            .collect()
        : await ctx.db
            .query("projectFiles")
            .withIndex("by_org", (q: any) => q.eq("organizationId", file.organizationId))
            .collect();

      for (const child of allFiles) {
        if (child.path.startsWith(file.path + "/") && !child.isDeleted) {
          // For org-level, skip project-scoped files
          if (!file.projectId && child.projectId) continue;
          await ctx.db.patch(child._id, {
            isDeleted: true,
            deletedAt: now,
            deletedBy: userId,
            originalPath: child.path,
          });
        }
      }
    }

    return { success: true };
  },
});

/**
 * SOFT-DELETE multiple files (batch move to trash).
 * This replaces the old hard-delete `deleteFiles` behavior.
 */
export const deleteFiles = mutation({
  args: {
    sessionId: v.string(),
    fileIds: v.array(v.id("projectFiles")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const now = Date.now();

    for (const fileId of args.fileIds) {
      const file = await ctx.db.get(fileId);
      if (!file || file.isDeleted) continue;

      const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId, file.path);
      if (!access || !canWrite(access.access)) throw new Error("Permission denied");

      await ctx.db.patch(fileId, {
        isDeleted: true,
        deletedAt: now,
        deletedBy: userId,
        originalPath: file.path,
      });

      if (file.fileKind === "folder") {
        const allFiles = file.projectId
          ? await ctx.db
              .query("projectFiles")
              .withIndex("by_project", (q: any) => q.eq("projectId", file.projectId))
              .collect()
          : await ctx.db
              .query("projectFiles")
              .withIndex("by_org", (q: any) => q.eq("organizationId", file.organizationId))
              .collect();

        for (const child of allFiles) {
          if (child.path.startsWith(file.path + "/") && !child.isDeleted) {
            if (!file.projectId && child.projectId) continue;
            await ctx.db.patch(child._id, {
              isDeleted: true,
              deletedAt: now,
              deletedBy: userId,
              originalPath: child.path,
            });
          }
        }
      }
    }

    return { success: true };
  },
});

/**
 * Legacy alias — soft-deletes now instead of hard-deleting.
 */
export const deleteFile = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || file.isDeleted) throw new Error("File not found");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId, file.path);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    const now = Date.now();

    await ctx.db.patch(args.fileId, {
      isDeleted: true,
      deletedAt: now,
      deletedBy: userId,
      originalPath: file.path,
    });

    if (file.fileKind === "folder") {
      const allFiles = file.projectId
        ? await ctx.db
            .query("projectFiles")
            .withIndex("by_project", (q: any) => q.eq("projectId", file.projectId))
            .collect()
        : await ctx.db
            .query("projectFiles")
            .withIndex("by_org", (q: any) => q.eq("organizationId", file.organizationId))
            .collect();

      for (const child of allFiles) {
        if (child.path.startsWith(file.path + "/") && !child.isDeleted) {
          if (!file.projectId && child.projectId) continue;
          await ctx.db.patch(child._id, {
            isDeleted: true,
            deletedAt: now,
            deletedBy: userId,
            originalPath: child.path,
          });
        }
      }
    }

    return { success: true };
  },
});

/**
 * RESTORE a file from trash.
 */
export const restoreFile = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || !file.isDeleted) throw new Error("File not found in trash");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    const restorePath = file.originalPath || file.path;
    const restoreParent = getParentPath(restorePath);

    // Check for conflict at original path
    const conflict = await queryFileByPath(ctx, file.organizationId, file.projectId, restorePath);
    let finalPath = restorePath;
    let finalName = file.name;

    if (conflict && !conflict.isDeleted) {
      // Append " (restored)" to avoid conflict
      const ext = file.name.includes(".") ? "." + file.name.split(".").pop() : "";
      const baseName = ext ? file.name.slice(0, -ext.length) : file.name;
      finalName = `${baseName} (restored)${ext}`;
      finalPath = normalizePath(`${restoreParent}/${finalName}`);
    }

    await ctx.db.patch(args.fileId, {
      isDeleted: undefined,
      deletedAt: undefined,
      deletedBy: undefined,
      originalPath: undefined,
      name: finalName,
      path: finalPath,
      parentPath: restoreParent,
      updatedAt: Date.now(),
    });

    // If folder, restore children
    if (file.fileKind === "folder") {
      const trashedFiles = await ctx.db
        .query("projectFiles")
        .withIndex("by_deleted", (q: any) =>
          q.eq("organizationId", file.organizationId).eq("isDeleted", true)
        )
        .collect();

      for (const child of trashedFiles) {
        if (child.originalPath && child.originalPath.startsWith(restorePath + "/")) {
          if (!file.projectId && child.projectId) continue;
          const childRelative = child.originalPath.substring(restorePath.length);
          const newChildPath = finalPath + childRelative;
          const newChildParent = getParentPath(newChildPath);

          await ctx.db.patch(child._id, {
            isDeleted: undefined,
            deletedAt: undefined,
            deletedBy: undefined,
            originalPath: undefined,
            path: newChildPath,
            parentPath: newChildParent,
            updatedAt: Date.now(),
          });
        }
      }
    }

    return { success: true };
  },
});

/**
 * PERMANENTLY DELETE a file from trash.
 */
export const permanentDeleteFile = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || !file.isDeleted) throw new Error("File not found in trash");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    // Clean up storage for uploaded files
    if (file.fileKind === "uploaded" && file.storageId) {
      await ctx.storage.delete(file.storageId);
    }

    // Clean up bookmarks and recents referencing this file
    const bookmarks = await ctx.db
      .query("userFileBookmarks")
      .withIndex("by_file", (q: any) => q.eq("fileId", args.fileId))
      .collect();
    for (const bm of bookmarks) {
      await ctx.db.delete(bm._id);
    }

    const recents = await ctx.db
      .query("userRecentFiles")
      .withIndex("by_user_file", (q: any) => q.eq("userId", userId).eq("fileId", args.fileId))
      .collect();
    for (const r of recents) {
      await ctx.db.delete(r._id);
    }

    await ctx.db.delete(args.fileId);
    return { success: true };
  },
});

/**
 * EMPTY TRASH — permanently delete all trashed files for an org.
 */
export const emptyTrash = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const orgId = args.organizationId || userOrgId;

    const access = await checkOrgAccess(ctx, userId, userOrgId, orgId);
    if (!access) throw new Error("Access denied");

    const trashedFiles = await ctx.db
      .query("projectFiles")
      .withIndex("by_deleted", (q: any) =>
        q.eq("organizationId", orgId).eq("isDeleted", true)
      )
      .collect();

    let count = 0;
    for (const file of trashedFiles) {
      if (file.fileKind === "uploaded" && file.storageId) {
        await ctx.storage.delete(file.storageId);
      }

      // Clean up bookmarks
      const bookmarks = await ctx.db
        .query("userFileBookmarks")
        .withIndex("by_file", (q: any) => q.eq("fileId", file._id))
        .collect();
      for (const bm of bookmarks) {
        await ctx.db.delete(bm._id);
      }

      await ctx.db.delete(file._id);
      count++;
    }

    return { success: true, deletedCount: count };
  },
});

/**
 * DUPLICATE a file (or folder recursively).
 */
export const duplicateFile = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
    targetParentPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || file.isDeleted) throw new Error("File not found");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId, file.path);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    const targetParent = normalizePath(args.targetParentPath || file.parentPath);
    const copyName = `Copy of ${file.name}`;
    const copyPath = normalizePath(`${targetParent}/${copyName}`);
    const now = Date.now();

    if (file.fileKind === "folder") {
      await ctx.db.insert("projectFiles", {
        organizationId: file.organizationId,
        projectId: file.projectId,
        name: copyName,
        path: copyPath,
        parentPath: targetParent,
        fileKind: "folder",
        source: "user",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const allFiles = await queryAllFilesInScope(ctx, file.organizationId, file.projectId);

      for (const child of allFiles) {
        if (child.path.startsWith(file.path + "/")) {
          const relativePath = child.path.substring(file.path.length);
          const newChildPath = copyPath + relativePath;
          const newChildParent = getParentPath(newChildPath);

          await ctx.db.insert("projectFiles", {
            organizationId: child.organizationId,
            projectId: child.projectId,
            name: child.name,
            path: newChildPath,
            parentPath: newChildParent,
            fileKind: child.fileKind,
            content: child.content,
            contentHash: child.contentHash,
            storageId: child.storageId,
            mediaId: child.mediaId,
            builderAppId: child.builderAppId,
            layerWorkflowId: child.layerWorkflowId,
            mimeType: child.mimeType,
            sizeBytes: child.sizeBytes,
            language: child.language,
            tags: child.tags,
            source: "user",
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    } else {
      await ctx.db.insert("projectFiles", {
        organizationId: file.organizationId,
        projectId: file.projectId,
        name: copyName,
        path: copyPath,
        parentPath: targetParent,
        fileKind: file.fileKind,
        content: file.content,
        contentHash: file.contentHash,
        storageId: file.storageId,
        mediaId: file.mediaId,
        builderAppId: file.builderAppId,
        layerWorkflowId: file.layerWorkflowId,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        language: file.language,
        tags: file.tags,
        source: "user",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// ============================================================================
// MUTATIONS — FILE UPLOAD
// ============================================================================

/**
 * Generate a storage upload URL (with quota checks).
 */
export const generateUploadUrl = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    estimatedSizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const orgId = args.organizationId || userOrgId;

    const access = await checkOrgAccess(ctx, userId, userOrgId, orgId);
    if (!access) throw new Error("Access denied");

    if (args.estimatedSizeBytes > MAX_UPLOAD_BYTES) {
      throw new Error(`File size exceeds maximum upload limit of 100 MB`);
    }

    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save an uploaded file to the file system after upload completes.
 */
export const saveUploadedFile = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    projectId: v.optional(v.id("objects")),
    parentPath: v.string(),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const parentPath = normalizePath(args.parentPath);

    let orgId: Id<"organizations">;
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project) throw new Error("Project not found");
      orgId = project.organizationId;
    } else {
      orgId = args.organizationId || userOrgId;
    }

    const access = await checkFileAccess(ctx, userId, userOrgId, orgId, args.projectId, parentPath);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    // Handle duplicate filename
    let filename = args.filename;
    let path = normalizePath(`${parentPath}/${filename}`);
    const existing = await queryFileByPath(ctx, orgId, args.projectId, path);
    if (existing && !existing.isDeleted) {
      const ext = filename.includes(".") ? "." + filename.split(".").pop() : "";
      const baseName = ext ? filename.slice(0, -ext.length) : filename;
      filename = `${baseName} (1)${ext}`;
      path = normalizePath(`${parentPath}/${filename}`);
    }

    const now = Date.now();
    const fileId = await ctx.db.insert("projectFiles", {
      organizationId: orgId,
      projectId: args.projectId,
      name: filename,
      path,
      parentPath,
      fileKind: "uploaded",
      storageId: args.storageId,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      source: "user",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return { fileId, path };
  },
});

// ============================================================================
// MUTATIONS — BOOKMARKS / FAVORITES
// ============================================================================

/**
 * Toggle a file bookmark (add if not bookmarked, remove if bookmarked).
 */
export const toggleBookmark = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || file.isDeleted) throw new Error("File not found");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId);
    if (!access) throw new Error("Access denied");

    const existing = await ctx.db
      .query("userFileBookmarks")
      .withIndex("by_user_file", (q: any) =>
        q.eq("userId", userId).eq("fileId", args.fileId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    }

    await ctx.db.insert("userFileBookmarks", {
      userId,
      fileId: args.fileId,
      createdAt: Date.now(),
    });

    return { bookmarked: true };
  },
});

/**
 * List all bookmarked files for the current user in an org.
 */
export const listBookmarks = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const orgId = args.organizationId || userOrgId;

    const bookmarks = await ctx.db
      .query("userFileBookmarks")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const results: any[] = [];
    for (const bm of bookmarks) {
      const file = await ctx.db.get(bm.fileId);
      if (file && !file.isDeleted && file.organizationId === orgId) {
        results.push({ ...file, bookmarkedAt: bm.createdAt });
      }
    }

    return results.sort((a, b) => b.bookmarkedAt - a.bookmarkedAt);
  },
});

// ============================================================================
// MUTATIONS — RECENT FILES
// ============================================================================

/**
 * Record a file access (upsert — updates timestamp if exists, inserts if not).
 */
export const recordFileAccess = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || file.isDeleted) return;

    // Upsert
    const existing = await ctx.db
      .query("userRecentFiles")
      .withIndex("by_user_file", (q: any) =>
        q.eq("userId", userId).eq("fileId", args.fileId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastAccessedAt: Date.now() });
    } else {
      await ctx.db.insert("userRecentFiles", {
        userId,
        fileId: args.fileId,
        organizationId: file.organizationId,
        lastAccessedAt: Date.now(),
      });

      // Cap at 50 per user per org
      const allRecents = await ctx.db
        .query("userRecentFiles")
        .withIndex("by_user_org", (q: any) =>
          q.eq("userId", userId).eq("organizationId", file.organizationId)
        )
        .collect();

      if (allRecents.length > 50) {
        allRecents.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
        const toDelete = allRecents.slice(0, allRecents.length - 50);
        for (const old of toDelete) {
          await ctx.db.delete(old._id);
        }
      }
    }
  },
});

/**
 * List recently accessed files for the current user.
 */
export const listRecentFiles = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const orgId = args.organizationId || userOrgId;
    const limit = args.limit || 20;

    const recents = await ctx.db
      .query("userRecentFiles")
      .withIndex("by_user_org", (q: any) =>
        q.eq("userId", userId).eq("organizationId", orgId)
      )
      .collect();

    // Sort by most recent and take limit
    recents.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    const topRecents = recents.slice(0, limit);

    const results: any[] = [];
    for (const r of topRecents) {
      const file = await ctx.db.get(r.fileId);
      if (file && !file.isDeleted) {
        results.push({ ...file, lastAccessedAt: r.lastAccessedAt });
      }
    }

    return results;
  },
});

// ============================================================================
// MUTATIONS — TAGS
// ============================================================================

/**
 * Create a new org-wide tag.
 */
export const createTag = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const orgId = args.organizationId || userOrgId;

    const access = await checkOrgAccess(ctx, userId, userOrgId, orgId);
    if (!access) throw new Error("Access denied");

    // Check uniqueness
    const existing = await ctx.db
      .query("organizationTags")
      .withIndex("by_org_name", (q: any) =>
        q.eq("organizationId", orgId).eq("name", args.name)
      )
      .first();
    if (existing) throw new Error("A tag with this name already exists");

    const now = Date.now();
    return await ctx.db.insert("organizationTags", {
      organizationId: orgId,
      name: args.name,
      color: args.color,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a tag (name and/or color).
 */
export const updateTag = mutation({
  args: {
    sessionId: v.string(),
    tagId: v.id("organizationTags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const tag = await ctx.db.get(args.tagId);
    if (!tag) throw new Error("Tag not found");

    const access = await checkOrgAccess(ctx, userId, organizationId, tag.organizationId);
    if (!access) throw new Error("Access denied");

    const updates: any = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      // Check uniqueness for new name
      if (args.name !== tag.name) {
        const existing = await ctx.db
          .query("organizationTags")
          .withIndex("by_org_name", (q: any) =>
            q.eq("organizationId", tag.organizationId).eq("name", args.name)
          )
          .first();
        if (existing) throw new Error("A tag with this name already exists");
      }
      updates.name = args.name;

      // Rename tag in all files that reference it
      if (args.name !== tag.name) {
        const allFiles = await ctx.db
          .query("projectFiles")
          .withIndex("by_org", (q: any) => q.eq("organizationId", tag.organizationId))
          .collect();

        for (const file of allFiles) {
          if (file.tags && file.tags.includes(tag.name)) {
            const newTags = file.tags.map((t: string) => t === tag.name ? args.name! : t);
            await ctx.db.patch(file._id, { tags: newTags });
          }
        }
      }
    }

    if (args.color !== undefined) {
      updates.color = args.color;
    }

    await ctx.db.patch(args.tagId, updates);
    return { success: true };
  },
});

/**
 * Delete a tag (and remove from all files).
 */
export const deleteTag = mutation({
  args: {
    sessionId: v.string(),
    tagId: v.id("organizationTags"),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const tag = await ctx.db.get(args.tagId);
    if (!tag) throw new Error("Tag not found");

    const access = await checkOrgAccess(ctx, userId, organizationId, tag.organizationId);
    if (!access) throw new Error("Access denied");

    // Remove this tag from all files
    const allFiles = await ctx.db
      .query("projectFiles")
      .withIndex("by_org", (q: any) => q.eq("organizationId", tag.organizationId))
      .collect();

    for (const file of allFiles) {
      if (file.tags && file.tags.includes(tag.name)) {
        const newTags = file.tags.filter((t: string) => t !== tag.name);
        await ctx.db.patch(file._id, { tags: newTags.length > 0 ? newTags : undefined });
      }
    }

    await ctx.db.delete(args.tagId);
    return { success: true };
  },
});

/**
 * List all tags for an organization.
 */
export const listTags = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId: userOrgId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const orgId = args.organizationId || userOrgId;

    return await ctx.db
      .query("organizationTags")
      .withIndex("by_org", (q: any) => q.eq("organizationId", orgId))
      .collect();
  },
});

/**
 * Assign tags to a file (replaces existing tags).
 */
export const assignTags = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || file.isDeleted) throw new Error("File not found");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    await ctx.db.patch(args.fileId, {
      tags: args.tags.length > 0 ? args.tags : undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Remove a single tag from a file.
 */
export const removeTagFromFile = mutation({
  args: {
    sessionId: v.string(),
    fileId: v.id("projectFiles"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const file = await ctx.db.get(args.fileId);
    if (!file || file.isDeleted) throw new Error("File not found");

    const access = await checkFileAccess(ctx, userId, organizationId, file.organizationId, file.projectId);
    if (!access || !canWrite(access.access)) throw new Error("Permission denied");

    const currentTags = file.tags || [];
    const newTags = currentTags.filter((t) => t !== args.tag);

    await ctx.db.patch(args.fileId, {
      tags: newTags.length > 0 ? newTags : undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
