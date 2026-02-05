/**
 * FINDER TYPES - Shared TypeScript types for the Finder window
 *
 * Replaces `type ProjectFile = any` across all Finder components.
 */

import { Id } from "../../../../convex/_generated/dataModel";

export interface ProjectFile {
  _id: Id<"projectFiles">;
  _creationTime: number;
  organizationId: Id<"organizations">;
  projectId?: Id<"objects">; // null = org-level file
  name: string;
  path: string;
  parentPath: string;
  fileKind: "virtual" | "uploaded" | "media_ref" | "builder_ref" | "layer_ref" | "folder";
  content?: string;
  contentHash?: string;
  storageId?: Id<"_storage">;
  mediaId?: Id<"organizationMedia">;
  builderAppId?: Id<"objects">;
  layerWorkflowId?: Id<"objects">;
  mimeType?: string;
  sizeBytes?: number;
  language?: string;
  tags?: string[];
  isDeleted?: boolean;
  deletedAt?: number;
  deletedBy?: Id<"users">;
  originalPath?: string;
  source: "user" | "builder_auto" | "layers_auto" | "ai_generated" | "migration";
  createdBy?: Id<"users">;
  createdAt: number;
  updatedAt: number;
}

export type FinderMode = "org" | "project" | "shared" | "trash";
export type ViewMode = "grid" | "list";
export type SortField = "name" | "updatedAt" | "sizeBytes" | "fileKind";
export type SortDirection = "asc" | "desc";

export type FileClipboard = {
  mode: "cut" | "copy";
  files: ProjectFile[];
} | null;

export interface ContextMenuState {
  type: "file" | "background";
  position: { top: number; left: number };
  file?: ProjectFile;
}
