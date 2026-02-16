"use client";

/**
 * FINDER SIDEBAR - Navigation modes, folder tree, favorites, recents, tags, trash
 *
 * Modes:
 * - "org"     — Org-scoped files (replaces media library)
 * - "project" — Project-scoped file tree (primary Finder view)
 * - "shared"  — Cross-org shared projects
 * - "trash"   — Soft-deleted files
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { FinderMode } from "./finder-types";
import {
  HardDrive,
  FolderTree,
  Share2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  Image,
  Box,
  Workflow,
  Star,
  Clock,
  Tag,
  Upload,
} from "lucide-react";

interface FinderSidebarProps {
  mode: FinderMode;
  onModeChange: (mode: FinderMode) => void;
  sessionId: string;
  organizationId: string;
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  currentPath: string;
  onNavigate: (path: string) => void;
  pendingInviteCount: number;
  onOpenFile?: (fileId: string) => void;
  onTagFilter?: (tag: string | null) => void;
  activeTagFilter?: string | null;
}

export function FinderSidebar({
  mode,
  onModeChange,
  sessionId,
  organizationId,
  selectedProjectId,
  onProjectSelect,
  currentPath,
  onNavigate,
  pendingInviteCount,
  onOpenFile,
  onTagFilter,
  activeTagFilter,
}: FinderSidebarProps) {
  // List org projects for the project picker
  const projects = useQuery(
    api.projectOntology.getProjects,
    mode === "project" || mode === "org"
      ? { sessionId, organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  // File tree for selected project
  const projectFileTree = useQuery(
    api.projectFileSystem.getFileTree,
    selectedProjectId && mode === "project"
      ? { sessionId, projectId: selectedProjectId as Id<"objects">, organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  // Org file tree
  const orgFileTree = useQuery(
    api.projectFileSystem.getFileTree,
    mode === "org"
      ? { sessionId, organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  // Trash count
  const trashItemCount = useQuery(
    api.projectFileSystem.trashCount,
    { sessionId, organizationId: organizationId as Id<"organizations"> }
  );

  // Bookmarks
  const bookmarks = useQuery(
    api.projectFileSystem.listBookmarks,
    { sessionId, organizationId: organizationId as Id<"organizations"> }
  );

  // Recent files
  const recentFiles = useQuery(
    api.projectFileSystem.listRecentFiles,
    { sessionId, organizationId: organizationId as Id<"organizations">, limit: 10 }
  );

  // Tags
  const tags = useQuery(
    api.projectFileSystem.listTags,
    { sessionId, organizationId: organizationId as Id<"organizations"> }
  );

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Mode Switcher */}
      <div className="p-2 space-y-1">
        <NavItem
          icon={<HardDrive size={16} />}
          label="Org Files"
          active={mode === "org"}
          onClick={() => onModeChange("org")}
        />
        <NavItem
          icon={<FolderTree size={16} />}
          label="Project Files"
          active={mode === "project"}
          onClick={() => onModeChange("project")}
        />
        <NavItem
          icon={<Share2 size={16} />}
          label="Shared with Me"
          active={mode === "shared"}
          onClick={() => onModeChange("shared")}
          badge={pendingInviteCount > 0 ? pendingInviteCount : undefined}
        />
        <NavItem
          icon={<Trash2 size={16} />}
          label="Trash"
          active={mode === "trash"}
          onClick={() => onModeChange("trash")}
          badge={trashItemCount && trashItemCount > 0 ? trashItemCount : undefined}
        />
      </div>

      {/* Favorites Section */}
      {bookmarks && bookmarks.length > 0 && (
        <CollapsibleSection icon={<Star size={14} />} label="Favorites" defaultOpen>
          {bookmarks.map((file: any) => (
            <SidebarFileItem
              key={file._id}
              icon={<Star size={12} style={{ color: "var(--warning-amber)" }} />}
              name={file.name}
              onClick={() => onOpenFile?.(file._id)}
            />
          ))}
        </CollapsibleSection>
      )}

      {/* Recent Files Section */}
      {recentFiles && recentFiles.length > 0 && (
        <CollapsibleSection icon={<Clock size={14} />} label="Recent" defaultOpen>
          {recentFiles.map((file: any) => (
            <SidebarFileItem
              key={file._id}
              icon={FILE_KIND_ICONS_SMALL[file.fileKind] || <FileText size={12} />}
              name={file.name}
              subtitle={formatRelativeTime(file.lastAccessedAt)}
              onClick={() => onOpenFile?.(file._id)}
            />
          ))}
        </CollapsibleSection>
      )}

      {/* Tags Section */}
      {tags && tags.length > 0 && (
        <CollapsibleSection icon={<Tag size={14} />} label="Tags" defaultOpen={false}>
          {activeTagFilter && (
            <button
              onClick={() => onTagFilter?.(null)}
              className="w-full text-left px-4 py-1 text-[10px] font-bold"
              style={{ color: "var(--primary)" }}
            >
              Clear filter
            </button>
          )}
          {tags.map((tag: any) => (
            <button
              key={tag._id}
              onClick={() => onTagFilter?.(tag.name)}
              className="w-full flex items-center gap-2 px-4 py-1.5 text-xs transition-colors"
              style={{
                background: activeTagFilter === tag.name ? "var(--win95-highlight-bg)" : "transparent",
                color: activeTagFilter === tag.name ? "var(--win95-highlight)" : "var(--win95-text)",
              }}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: tag.color }}
              />
              <span className="truncate">{tag.name}</span>
            </button>
          ))}
        </CollapsibleSection>
      )}

      {/* Divider */}
      <div className="mx-2 my-1 h-px" style={{ background: "var(--win95-border)" }} />

      {/* Project Picker (in project mode) */}
      {mode === "project" && (
        <div
          className="px-2 py-2 border-b-2"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <select
            value={selectedProjectId || ""}
            onChange={(e) => onProjectSelect(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
          >
            <option value="">Select a project...</option>
            {projects?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Folder Tree (project mode with selected project) */}
      {mode === "project" && selectedProjectId && (
        <div className="flex-1 overflow-y-auto p-2">
          {projectFileTree ? (
            <FileTree
              files={projectFileTree}
              currentPath={currentPath}
              onNavigate={onNavigate}
              rootLabel="Project Root"
            />
          ) : (
            <p className="text-xs p-2" style={{ color: "var(--neutral-gray)" }}>
              Loading...
            </p>
          )}
        </div>
      )}

      {/* Folder Tree (org mode) */}
      {mode === "org" && (
        <div className="flex-1 overflow-y-auto p-2">
          {orgFileTree ? (
            <FileTree
              files={orgFileTree}
              currentPath={currentPath}
              onNavigate={onNavigate}
              rootLabel="Organization Root"
            />
          ) : (
            <p className="text-xs p-2" style={{ color: "var(--neutral-gray)" }}>
              Loading...
            </p>
          )}
        </div>
      )}

      {/* Shared mode hint */}
      {mode === "shared" && (
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs p-2" style={{ color: "var(--neutral-gray)" }}>
            Projects shared with your organization appear here.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

function CollapsibleSection({
  icon,
  label,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t" style={{ borderColor: "var(--win95-border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold"
        style={{ color: "var(--neutral-gray)" }}
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {icon}
        <span>{label.toUpperCase()}</span>
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  );
}

// ============================================================================
// SIDEBAR FILE ITEM
// ============================================================================

function SidebarFileItem({
  icon,
  name,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-4 py-1.5 text-xs transition-colors"
      style={{ color: "var(--win95-text)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--win95-highlight-bg)";
        e.currentTarget.style.color = "var(--win95-highlight)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--win95-text)";
      }}
    >
      {icon}
      <span className="truncate flex-1 text-left">{name}</span>
      {subtitle && (
        <span className="text-[10px] flex-shrink-0" style={{ color: "var(--neutral-gray)" }}>
          {subtitle}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// NAV ITEM
// ============================================================================

function NavItem({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded transition-colors"
      style={{
        background: active ? "var(--win95-highlight-bg)" : "transparent",
        color: active ? "var(--win95-highlight)" : "var(--win95-text)",
      }}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span
          className="px-1.5 py-0.5 text-[10px] font-bold rounded"
          style={{ background: "var(--error-red)", color: "#fff" }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// FILE TREE (shared between project and org modes)
// ============================================================================

const FILE_KIND_ICONS: Record<string, React.ReactNode> = {
  folder: <Folder size={14} />,
  virtual: <FileText size={14} />,
  uploaded: <Upload size={14} />,
  media_ref: <Image size={14} />,
  builder_ref: <Box size={14} />,
  layer_ref: <Workflow size={14} />,
};

const FILE_KIND_ICONS_SMALL: Record<string, React.ReactNode> = {
  folder: <Folder size={12} />,
  virtual: <FileText size={12} />,
  uploaded: <Upload size={12} />,
  media_ref: <Image size={12} />,
  builder_ref: <Box size={12} />,
  layer_ref: <Workflow size={12} />,
};

interface TreeNode {
  path: string;
  name: string;
  fileKind: string;
  children: TreeNode[];
}

function buildTree(
  files: Array<{ path: string; name: string; fileKind: string; parentPath: string }>
): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sorted) {
    const node: TreeNode = {
      path: file.path,
      name: file.name,
      fileKind: file.fileKind,
      children: [],
    };
    nodeMap.set(file.path, node);

    const parentNode = nodeMap.get(file.parentPath);
    if (parentNode) {
      parentNode.children.push(node);
    } else if (file.parentPath === "/") {
      roots.push(node);
    }
  }

  return roots;
}

function FileTree({ files, currentPath, onNavigate, rootLabel }: {
  files: Array<{ path: string; name: string; fileKind: string; parentPath: string }>;
  currentPath: string;
  onNavigate: (path: string) => void;
  rootLabel: string;
}) {
  const tree = buildTree(files);

  if (tree.length === 0) {
    return (
      <p className="text-xs p-2" style={{ color: "var(--neutral-gray)" }}>
        No files yet
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => onNavigate("/")}
        className="w-full flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
        style={{
          background: currentPath === "/" ? "var(--win95-highlight-bg)" : "transparent",
          color: currentPath === "/" ? "var(--win95-highlight)" : "var(--win95-text)",
        }}
      >
        <HardDrive size={14} />
        <span className="font-bold">{rootLabel}</span>
      </button>
      {tree.map((node) => (
        <TreeNodeView
          key={node.path}
          node={node}
          currentPath={currentPath}
          onNavigate={onNavigate}
          level={1}
        />
      ))}
    </div>
  );
}

function TreeNodeView({ node, currentPath, onNavigate, level }: {
  node: TreeNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  level: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isFolder = node.fileKind === "folder";
  const isActive = currentPath === node.path;

  return (
    <div>
      <button
        onClick={() => {
          if (isFolder) onNavigate(node.path);
          if (hasChildren) setExpanded(!expanded);
        }}
        className="w-full flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
        style={{
          paddingLeft: `${level * 12 + 8}px`,
          background: isActive ? "var(--win95-highlight-bg)" : "transparent",
          color: isActive ? "var(--win95-highlight)" : "var(--win95-text)",
        }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
        ) : (
          <div className="w-3" />
        )}
        {FILE_KIND_ICONS[node.fileKind] || <FileText size={14} />}
        <span className="truncate">{node.name}</span>
      </button>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeView
              key={child.path}
              node={child}
              currentPath={currentPath}
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
