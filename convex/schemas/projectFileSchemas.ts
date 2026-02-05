/**
 * PROJECT FILE SYSTEM SCHEMAS
 *
 * Organization + project-scoped virtual file system + cross-org sharing.
 *
 * Tables:
 * - projectFiles: File/folder entries (org-level when projectId is null, project-scoped otherwise)
 * - projectShares: Cross-organization sharing records
 * - userFileBookmarks: Per-user file favorites
 * - userRecentFiles: Per-user recent file access tracking
 * - organizationTags: Org-wide tag definitions for file labeling
 *
 * File kinds:
 * - "folder"       → Directory marker (no content)
 * - "virtual"      → Inline content (markdown notes, JSON configs)
 * - "uploaded"     → Direct file upload stored in Convex storage
 * - "media_ref"    → Reference to organizationMedia record (legacy)
 * - "builder_ref"  → Reference to a builder app
 * - "layer_ref"    → Reference to a layer workflow
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const projectFiles = defineTable({
  // Scoping
  organizationId: v.id("organizations"),
  projectId: v.optional(v.id("objects")), // null = org-level file, set = project-scoped

  // File identity
  name: v.string(),       // Display name ("workflow.json", "hero-image.png")
  path: v.string(),       // Full virtual path ("/builder/app-config.json")
  parentPath: v.string(), // Parent directory ("/builder") — enables folder listing

  // Discriminated content type
  fileKind: v.union(
    v.literal("virtual"),     // Content stored inline (JSON, markdown, configs)
    v.literal("uploaded"),    // Direct upload stored in Convex storage
    v.literal("media_ref"),   // Reference to organizationMedia record (legacy)
    v.literal("builder_ref"), // Reference to a builder app
    v.literal("layer_ref"),   // Reference to a layer workflow
    v.literal("folder")       // Directory marker (no content)
  ),

  // Inline content (for virtual files)
  content: v.optional(v.string()),
  contentHash: v.optional(v.string()),

  // Direct upload storage (for uploaded files)
  storageId: v.optional(v.id("_storage")),

  // References (for ref-type files)
  mediaId: v.optional(v.id("organizationMedia")),
  builderAppId: v.optional(v.id("objects")),
  layerWorkflowId: v.optional(v.id("objects")),

  // Metadata
  mimeType: v.optional(v.string()),
  sizeBytes: v.optional(v.number()),
  language: v.optional(v.string()), // For code files ("typescript", "json", "markdown")

  // Tags (references organizationTags by name)
  tags: v.optional(v.array(v.string())),

  // Soft-delete support
  isDeleted: v.optional(v.boolean()),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
  originalPath: v.optional(v.string()), // Stores pre-delete path for restore

  // Auto-capture provenance
  source: v.union(
    v.literal("user"),          // Manually created/uploaded
    v.literal("builder_auto"),  // Auto-captured from Builder surface
    v.literal("layers_auto"),   // Auto-captured from Layers surface
    v.literal("ai_generated"),  // Created by AI assistant
    v.literal("migration")      // Migrated from legacy storage
  ),

  // Ownership
  createdBy: v.optional(v.id("users")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_project", ["projectId"])
  .index("by_project_path", ["projectId", "path"])
  .index("by_project_parent", ["projectId", "parentPath"])
  .index("by_project_kind", ["projectId", "fileKind"])
  .index("by_org", ["organizationId"])
  .index("by_org_parent", ["organizationId", "parentPath"])
  .index("by_org_path", ["organizationId", "path"])
  .index("by_deleted", ["organizationId", "isDeleted"])
  .index("by_media_ref", ["mediaId"])
  .index("by_builder_ref", ["builderAppId"])
  .index("by_layer_ref", ["layerWorkflowId"]);

/**
 * PROJECT SHARES TABLE
 *
 * Cross-organization sharing for project file systems.
 *
 * Two sharing modes:
 * - "project"  → Share entire project file tree
 * - "subtree"  → Share a specific folder/path only
 *
 * Permission levels:
 * - "viewer" → Browse files, read content, use as AI context
 * - "editor" → Also create/edit/delete files within shared scope
 * - "admin"  → Also manage sub-shares and project settings
 */
export const projectShares = defineTable({
  projectId: v.id("objects"),           // The project being shared
  ownerOrgId: v.id("organizations"),    // The org that owns the project
  targetOrgId: v.id("organizations"),   // The org receiving access

  // Sharing scope
  shareScope: v.union(
    v.literal("project"), // Entire project
    v.literal("subtree")  // Specific path only
  ),
  sharedPath: v.optional(v.string()),   // Root path for subtree shares (e.g. "/assets")

  // Access control
  permission: v.union(
    v.literal("viewer"),
    v.literal("editor"),
    v.literal("admin")
  ),

  // Invite workflow
  sharedBy: v.id("users"),
  acceptedBy: v.optional(v.id("users")),
  status: v.union(
    v.literal("pending"),
    v.literal("active"),
    v.literal("revoked")
  ),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_project", ["projectId"])
  .index("by_target_org", ["targetOrgId"])
  .index("by_owner_org", ["ownerOrgId"])
  .index("by_project_target", ["projectId", "targetOrgId"])
  .index("by_target_status", ["targetOrgId", "status"]);

/**
 * USER FILE BOOKMARKS
 *
 * Per-user favorites/bookmarks for quick access to files.
 */
export const userFileBookmarks = defineTable({
  userId: v.id("users"),
  fileId: v.id("projectFiles"),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_file", ["userId", "fileId"])
  .index("by_file", ["fileId"]);

/**
 * USER RECENT FILES
 *
 * Tracks recently accessed files per user for quick navigation.
 * Capped at 50 entries per user per org.
 */
export const userRecentFiles = defineTable({
  userId: v.id("users"),
  fileId: v.id("projectFiles"),
  organizationId: v.id("organizations"),
  lastAccessedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_org", ["userId", "organizationId"])
  .index("by_user_file", ["userId", "fileId"]);

/**
 * ORGANIZATION TAGS
 *
 * Org-wide tag definitions for labeling files.
 * Tags are shared across all projects in the org.
 */
export const organizationTags = defineTable({
  organizationId: v.id("organizations"),
  name: v.string(),
  color: v.string(), // Hex color (e.g. "#3B82F6")
  createdBy: v.optional(v.id("users")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_org_name", ["organizationId", "name"]);
