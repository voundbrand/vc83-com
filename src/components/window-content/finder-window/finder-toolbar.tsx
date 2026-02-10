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
  FileType,
  Code,
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
  onCreateNote: () => void;
  onCreatePlainText?: () => void;
  onCreateCodeFile?: () => void;
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
  onCreateNote,
  onCreatePlainText,
  onCreateCodeFile,
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
  const breadcrumbs = useQuery(
    api.projectFileSystem.getBreadcrumbs,
    projectId
      ? { sessionId, projectId: projectId as Id<"objects">, path: currentPath }
      : "skip"
  );

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
      className="border-b-2"
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
    >
      {/* Scope Indicator (non-project modes) */}
      {scopeLabel && (
        <div
          className="flex items-center gap-2 px-4 py-2 border-b"
          style={{ borderColor: "var(--win95-border)" }}
        >
          {mode === "org" && <HardDrive size={14} style={{ color: "var(--primary)" }} />}
          {mode === "shared" && <Share2 size={14} style={{ color: "var(--primary)" }} />}
          <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            {scopeLabel}
          </span>
        </div>
      )}

      {/* Breadcrumb Row (project mode) */}
      {projectId && breadcrumbs && (
        <div
          className="flex items-center gap-1 px-4 py-2 border-b"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <FolderTree size={12} style={{ color: "var(--primary)" }} />
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
                      : "var(--primary)",
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
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold border-2 rounded transition-colors"
              style={{
                background: "var(--win95-button-face)",
                borderColor: "var(--win95-border)",
                color: "var(--win95-text)",
              }}
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
                onCreateNote={() => {
                  onCreateNote();
                  setShowNewMenu(false);
                }}
                onCreatePlainText={
                  onCreatePlainText
                    ? () => {
                        onCreatePlainText();
                        setShowNewMenu(false);
                      }
                    : undefined
                }
                onCreateCodeFile={
                  onCreateCodeFile
                    ? () => {
                        onCreateCodeFile();
                        setShowNewMenu(false);
                      }
                    : undefined
                }
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
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold border-2 rounded transition-colors"
            style={{
              background: "var(--win95-button-face)",
              borderColor: "var(--win95-border)",
              color: "var(--win95-text)",
            }}
          >
            <Share2 size={14} />
            Share
          </button>
        )}

        {/* Tags Button */}
        {onOpenTagManager && (
          <button
            onClick={onOpenTagManager}
            className="flex items-center gap-2 px-3 py-2 text-xs border-2 rounded transition-colors"
            style={{
              background: "var(--win95-button-face)",
              borderColor: "var(--win95-border)",
              color: "var(--win95-text)",
            }}
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
            className="w-full pl-9 pr-3 py-2 text-xs border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
          />
        </div>

        {/* View Toggle */}
        <div
          className="flex border-2"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <button
            onClick={() => onViewModeChange("grid")}
            className="px-3 py-2 border-r-2"
            style={{
              borderColor: "var(--win95-border)",
              background:
                viewMode === "grid"
                  ? "var(--win95-highlight-bg)"
                  : "transparent",
              color:
                viewMode === "grid"
                  ? "var(--win95-highlight)"
                  : "var(--win95-text)",
            }}
          >
            <Grid3x3 size={14} />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className="px-3 py-2"
            style={{
              background:
                viewMode === "list"
                  ? "var(--win95-highlight-bg)"
                  : "transparent",
              color:
                viewMode === "list"
                  ? "var(--win95-highlight)"
                  : "var(--win95-text)",
            }}
          >
            <List size={14} />
          </button>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="px-3 py-2 text-xs border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg)",
            color: "var(--win95-text)",
          }}
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
  onCreateNote: () => void;
  onCreatePlainText?: () => void;
  onCreateCodeFile?: () => void;
  onUploadFile?: () => void;
  onClose: () => void;
}

function NewMenu({
  onCreateFolder,
  onCreateNote,
  onCreatePlainText,
  onCreateCodeFile,
  onUploadFile,
  onClose,
}: NewMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute top-full left-0 mt-1 w-56 border-2 shadow-lg z-50"
        style={{
          background: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
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
            onClick={onCreateFolder}
          />
          <MenuButton
            icon={<FileText size={16} />}
            label="New Note"
            subtitle=".md"
            onClick={onCreateNote}
          />
          {onCreatePlainText && (
            <MenuButton
              icon={<FileType size={16} />}
              label="New Plain Text"
              subtitle=".txt"
              onClick={onCreatePlainText}
            />
          )}
          {onCreateCodeFile && (
            <MenuButton
              icon={<Code size={16} />}
              label="New Code File"
              onClick={onCreateCodeFile}
            />
          )}
        </div>

        {onUploadFile && (
          <>
            <div
              className="mx-2 h-px"
              style={{ background: "var(--win95-border)" }}
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
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 text-xs text-left rounded transition-colors"
      style={{ background: "transparent", color: "var(--win95-text)" }}
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
      <span className="flex-1">{label}</span>
      {subtitle && (
        <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          {subtitle}
        </span>
      )}
    </button>
  );
}
