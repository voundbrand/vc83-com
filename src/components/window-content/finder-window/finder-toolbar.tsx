"use client";

/**
 * FINDER TOOLBAR - Breadcrumbs, search, view toggle, new menu, sort, scope indicator
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Search,
  Grid3x3,
  List,
  Plus,
  FolderPlus,
  FileText,
  Upload,
  ChevronRight,
  Share2,
  Tag,
  HardDrive,
  FolderTree,
} from "lucide-react";
import type { FinderMode } from "./finder-types";

export type ViewMode = "grid" | "list";
export type SortOption = "name" | "date" | "kind";

interface FinderToolbarProps {
  sessionId: string;
  projectId: string | null;
  organizationId?: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onUploadFile?: () => void;
  onShareProject?: () => void;
  onOpenTagManager?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  mode?: FinderMode;
}

export function FinderToolbar({
  sessionId,
  projectId,
  organizationId,
  currentPath,
  onNavigate,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  onCreateFolder,
  onCreateFile,
  onUploadFile,
  onShareProject,
  onOpenTagManager,
  searchInputRef,
  mode,
}: FinderToolbarProps) {
  const [showNewMenu, setShowNewMenu] = useState(false);

  // Show New button when we have a project OR in org mode
  const canCreate = !!projectId || mode === "org";

  // Breadcrumbs — project-scoped
  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this component.
  const getBreadcrumbsQuery = (api as any).projectFileSystem.getBreadcrumbs;
  const breadcrumbs = (useQuery as any)(
    getBreadcrumbsQuery,
    projectId
      ? { sessionId, projectId: projectId as Id<"objects">, path: currentPath }
      : "skip"
  ) as Array<{ path: string; name: string }> | undefined;

  // Scope label
  const scopeLabel =
    mode === "org"
      ? "Organization Files"
      : mode === "shared"
        ? "Shared with Me"
        : mode === "trash"
          ? "Trash"
          : null;

  return (
    <div
      className="border-b"
      style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
    >
      {/* Scope Indicator (non-project modes) */}
      {scopeLabel && (
        <div
          className="flex items-center gap-2 px-4 py-2 border-b"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          {mode === "org" && <HardDrive size={14} style={{ color: "var(--finder-accent)" }} />}
          {mode === "shared" && <Share2 size={14} style={{ color: "var(--finder-accent)" }} />}
          <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            {scopeLabel}
          </span>
        </div>
      )}

      {/* Breadcrumb Row (project mode) */}
      {projectId && breadcrumbs && (
        <div
          className="flex items-center gap-1 px-4 py-2 border-b"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <FolderTree size={12} style={{ color: "var(--finder-accent)" }} />
          {breadcrumbs.map((crumb: { path: string; name: string }, i: number) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  size={12}
                  style={{ color: "var(--neutral-gray)" }}
                />
              )}
              <button
                onClick={() => onNavigate(crumb.path)}
                className="text-xs px-1 py-0.5 rounded transition-colors"
                style={{
                  color:
                    i === breadcrumbs.length - 1
                      ? "var(--win95-text)"
                      : "var(--finder-accent)",
                  fontWeight: i === breadcrumbs.length - 1 ? "bold" : "normal",
                }}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Controls Row */}
      <div className="flex items-center gap-4 px-4 py-2">
        {/* New Button */}
        {canCreate && (
          <div className="relative">
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="desktop-interior-button flex items-center gap-2 px-4 py-2 text-xs font-bold"
            >
              <Plus size={14} />
              New
            </button>

            {showNewMenu && (
              <NewMenu
                onCreateFolder={() => {
                  onCreateFolder();
                  setShowNewMenu(false);
                }}
                onCreateFile={() => {
                  onCreateFile();
                  setShowNewMenu(false);
                }}
                onUploadFile={
                  onUploadFile
                    ? () => {
                        onUploadFile();
                        setShowNewMenu(false);
                      }
                    : undefined
                }
                onClose={() => setShowNewMenu(false)}
              />
            )}
          </div>
        )}

        {/* Share Button (project mode only) */}
        {projectId && onShareProject && (
          <button
            onClick={onShareProject}
            className="desktop-interior-button flex items-center gap-2 px-4 py-2 text-xs font-bold"
          >
            <Share2 size={14} />
            Share
          </button>
        )}

        {/* Tags Button */}
        {onOpenTagManager && (
          <button
            onClick={onOpenTagManager}
            className="desktop-interior-button flex items-center gap-2 px-3 py-2 text-xs"
          >
            <Tag size={14} />
            Tags
          </button>
        )}

        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--neutral-gray)" }}
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files..."
            className="desktop-interior-input w-full pl-9 pr-3 py-2 text-xs"
          />
        </div>

        {/* View Toggle */}
        <div
          className="flex items-center gap-1 p-0.5 border rounded-lg"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg)",
          }}
        >
          <button
            onClick={() => onViewModeChange("grid")}
            className={`desktop-interior-tab px-3 py-2 ${viewMode === "grid" ? "desktop-interior-tab-active" : ""}`}
          >
            <Grid3x3 size={14} />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`desktop-interior-tab px-3 py-2 ${viewMode === "list" ? "desktop-interior-tab-active" : ""}`}
          >
            <List size={14} />
          </button>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="desktop-interior-select min-w-[110px] py-2 pr-8 text-xs"
        >
          <option value="name">Name</option>
          <option value="date">Date</option>
          <option value="kind">Kind</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================================
// NEW MENU DROPDOWN (expanded)
// ============================================================================

interface NewMenuProps {
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onUploadFile?: () => void;
  onClose: () => void;
}

function NewMenu({
  onCreateFolder,
  onCreateFile,
  onUploadFile,
  onClose,
}: NewMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute top-full left-0 mt-1 w-56 border rounded-xl shadow-lg z-50"
        style={{
          background: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
      >
        <div className="p-2">
          <p
            className="text-xs font-bold px-2 py-1"
            style={{ color: "var(--neutral-gray)" }}
          >
            CREATE
          </p>
          <MenuButton
            icon={<FolderPlus size={16} />}
            label="New Folder"
            shortcut="Cmd+Shift+N"
            onClick={onCreateFolder}
          />
          <MenuButton
            icon={<FileText size={16} />}
            label="New File"
            subtitle="name.ext"
            shortcut="Cmd+N"
            onClick={onCreateFile}
          />
        </div>

        {onUploadFile && (
          <>
            <div
              className="mx-2 h-px"
              style={{ background: "var(--window-document-border)" }}
            />
            <div className="p-2">
              <MenuButton
                icon={<Upload size={16} />}
                label="Upload File(s)"
                onClick={onUploadFile}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function MenuButton({
  icon,
  label,
  subtitle,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-left rounded transition-colors"
      style={{ background: "transparent", color: "var(--win95-text)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--finder-selection-bg)";
        e.currentTarget.style.color = "var(--finder-selection-text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--win95-text)";
      }}
    >
      {icon}
      <span className="flex-1">{label}</span>
      <span className="flex flex-col items-end leading-tight">
        {subtitle && (
          <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
            {subtitle}
          </span>
        )}
        {shortcut && (
          <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
            {shortcut}
          </span>
        )}
      </span>
    </button>
  );
}
