"use client";

/**
 * FINDER CONTENT - Grid/list view of files at a given path
 *
 * Phase A: multi-select, inline rename, context menu triggers,
 * drag-and-drop attributes, cut file opacity.
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Folder,
  FileText,
  Image,
  Box,
  Workflow,
  Share2,
  Clock,
} from "lucide-react";
import type { ViewMode, SortOption } from "./finder-toolbar";
import type { FinderMode } from "./finder-types";
import type { ProjectFile } from "./finder-types";

// ============================================================================
// PROPS
// ============================================================================

interface FinderContentProps {
  mode: FinderMode;
  sessionId: string;
  organizationId: string;
  projectId: string | null;
  currentPath: string;
  viewMode: ViewMode;
  sortBy: SortOption;
  searchQuery: string;
  // Phase A: managed externally
  displayFiles: ProjectFile[];
  isSelected: (fileId: string) => boolean;
  onFileSelect: (file: ProjectFile, event: React.MouseEvent) => void;
  onFolderOpen: (path: string) => void;
  onFileDoubleClick: (file: ProjectFile) => void;
  onContextMenu: (e: React.MouseEvent, file?: ProjectFile) => void;
  onNavigateSharedProject?: (projectId: string, path: string) => void;
  // Inline rename
  renamingFileId: string | null;
  onRenameComplete: () => void;
  // Clipboard visual
  isCut: (fileId: string) => boolean;
  // Drag and drop
  onDragStart: (e: React.DragEvent, file: ProjectFile) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, targetPath: string, targetKind: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetPath: string) => Promise<void>;
  isDropTarget: (path: string) => boolean;
}

export function FinderContent({
  mode,
  sessionId,
  organizationId,
  projectId,
  currentPath,
  viewMode,
  sortBy,
  searchQuery,
  displayFiles,
  isSelected,
  onFileSelect,
  onFolderOpen,
  onFileDoubleClick,
  onContextMenu,
  onNavigateSharedProject,
  renamingFileId,
  onRenameComplete,
  isCut,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDropTarget,
}: FinderContentProps) {
  // Shared projects
  const sharedProjects = useQuery(
    api.projectSharing.listSharedWithMe,
    mode === "shared" ? { sessionId } : "skip"
  );

  // ---- SHARED MODE ----
  if (mode === "shared") {
    if (!sharedProjects) {
      return <LoadingState />;
    }

    if (sharedProjects.length === 0) {
      return (
        <EmptyState
          icon={<Share2 size={32} />}
          title="No shared projects"
          description="Projects shared with your organization will appear here."
        />
      );
    }

    return (
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sharedProjects.map((share) => (
            <SharedProjectCard
              key={share._id}
              projectName={share.projectName}
              ownerOrgName={share.ownerOrgName}
              permission={share.permission}
              shareScope={share.shareScope}
              sharedPath={share.sharedPath}
              onClick={() => {
                if (onNavigateSharedProject) {
                  onNavigateSharedProject(
                    share.projectId,
                    share.shareScope === "subtree" && share.sharedPath
                      ? share.sharedPath
                      : "/"
                  );
                }
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ---- ORG MODE ----
  if (mode === "org") {
    return (
      <EmptyState
        icon={<Image size={32} />}
        title="Organization Files"
        description="Switch to the Media Library window for org-scoped files, or select a project to browse project files."
      />
    );
  }

  // ---- PROJECT MODE ----
  if (!projectId) {
    return (
      <EmptyState
        icon={<Folder size={32} />}
        title="Select a project"
        description="Choose a project from the sidebar to browse its files."
      />
    );
  }

  if (displayFiles.length === 0) {
    return (
      <div
        data-finder-content-bg
        className="h-full"
        onContextMenu={(e) => onContextMenu(e)}
      >
        <EmptyState
          icon={<Folder size={32} />}
          title={searchQuery ? "No matching files" : "Empty folder"}
          description={
            searchQuery
              ? "Try a different search term."
              : "Right-click for options, or create a folder/note from the toolbar."
          }
        />
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="p-4" data-finder-content-bg>
        <table className="w-full text-xs">
          <thead>
            <tr
              className="border-b-2"
              style={{ borderColor: "var(--win95-border)" }}
            >
              <th className="text-left py-2 px-3 font-bold">Name</th>
              <th className="text-left py-2 px-3 font-bold w-24">Kind</th>
              <th className="text-left py-2 px-3 font-bold w-24">Size</th>
              <th className="text-left py-2 px-3 font-bold w-36">Modified</th>
            </tr>
          </thead>
          <tbody>
            {displayFiles.map((file) => (
              <FileListRow
                key={file._id}
                file={file}
                isSelected={isSelected(file._id)}
                isCutFile={isCut(file._id)}
                isRenaming={renamingFileId === file._id}
                isDropTargetFile={isDropTarget(file.path)}
                sessionId={sessionId}
                onSelect={(e) => onFileSelect(file, e)}
                onDoubleClick={() => onFileDoubleClick(file)}
                onContextMenu={(e) => {
                  e.stopPropagation();
                  onContextMenu(e, file);
                }}
                onRenameComplete={onRenameComplete}
                onDragStart={(e) => onDragStart(e, file)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => onDragOver(e, file.path, file.fileKind)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, file.path)}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Grid view
  return (
    <div className="p-6" data-finder-content-bg>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {displayFiles.map((file) => (
          <FileGridItem
            key={file._id}
            file={file}
            isSelected={isSelected(file._id)}
            isCutFile={isCut(file._id)}
            isRenaming={renamingFileId === file._id}
            isDropTargetFile={isDropTarget(file.path)}
            sessionId={sessionId}
            onSelect={(e) => onFileSelect(file, e)}
            onDoubleClick={() => onFileDoubleClick(file)}
            onContextMenu={(e) => {
              e.stopPropagation();
              onContextMenu(e, file);
            }}
            onRenameComplete={onRenameComplete}
            onDragStart={(e) => onDragStart(e, file)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => onDragOver(e, file.path, file.fileKind)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, file.path)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// FILE GRID ITEM
// ============================================================================

const KIND_ICON: Record<string, React.ReactNode> = {
  folder: <Folder size={32} style={{ color: "var(--primary)" }} />,
  virtual: <FileText size={32} style={{ color: "var(--accent-color)" }} />,
  media_ref: <Image size={32} style={{ color: "var(--success-green)" }} />,
  builder_ref: <Box size={32} style={{ color: "var(--warning-amber)" }} />,
  layer_ref: <Workflow size={32} style={{ color: "var(--info-blue)" }} />,
};

const KIND_LABEL: Record<string, string> = {
  folder: "Folder",
  virtual: "Note",
  media_ref: "Media",
  builder_ref: "Builder App",
  layer_ref: "Workflow",
};

interface FileItemProps {
  file: ProjectFile;
  isSelected: boolean;
  isCutFile: boolean;
  isRenaming: boolean;
  isDropTargetFile: boolean;
  sessionId: string;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRenameComplete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

function FileGridItem({
  file,
  isSelected,
  isCutFile,
  isRenaming,
  isDropTargetFile,
  sessionId,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onRenameComplete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: FileItemProps) {
  return (
    <button
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="flex flex-col items-center gap-2 p-4 rounded border-2 transition-colors text-center"
      style={{
        borderColor: isDropTargetFile
          ? "var(--primary)"
          : isSelected
            ? "var(--primary)"
            : "var(--win95-border)",
        background: isDropTargetFile
          ? "var(--win95-highlight-bg)"
          : isSelected
            ? "var(--win95-highlight-bg)"
            : "var(--win95-bg)",
        opacity: isCutFile ? 0.4 : 1,
      }}
    >
      {KIND_ICON[file.fileKind] || <FileText size={32} />}
      {isRenaming ? (
        <InlineRenameInput
          file={file}
          sessionId={sessionId}
          onComplete={onRenameComplete}
        />
      ) : (
        <span
          className="text-xs truncate w-full"
          style={{
            color: isSelected ? "var(--win95-highlight)" : "var(--win95-text)",
          }}
        >
          {file.name}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// FILE LIST ROW
// ============================================================================

function FileListRow({
  file,
  isSelected,
  isCutFile,
  isRenaming,
  isDropTargetFile,
  sessionId,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onRenameComplete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: FileItemProps) {
  const icon = file.fileKind === "folder" ? (
    <Folder size={14} style={{ color: "var(--primary)" }} />
  ) : file.fileKind === "virtual" ? (
    <FileText size={14} style={{ color: "var(--accent-color)" }} />
  ) : file.fileKind === "media_ref" ? (
    <Image size={14} style={{ color: "var(--success-green)" }} />
  ) : file.fileKind === "builder_ref" ? (
    <Box size={14} style={{ color: "var(--warning-amber)" }} />
  ) : (
    <Workflow size={14} style={{ color: "var(--info-blue)" }} />
  );

  return (
    <tr
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="cursor-pointer border-b transition-colors"
      style={{
        borderColor: "var(--win95-border)",
        background: isDropTargetFile
          ? "var(--win95-highlight-bg)"
          : isSelected
            ? "var(--win95-highlight-bg)"
            : "transparent",
        color: isSelected ? "var(--win95-highlight)" : "var(--win95-text)",
        opacity: isCutFile ? 0.4 : 1,
      }}
    >
      <td className="py-2 px-3">
        <span className="flex items-center gap-2">
          {icon}
          {isRenaming ? (
            <InlineRenameInput
              file={file}
              sessionId={sessionId}
              onComplete={onRenameComplete}
            />
          ) : (
            file.name
          )}
        </span>
      </td>
      <td className="py-2 px-3">{KIND_LABEL[file.fileKind] || file.fileKind}</td>
      <td className="py-2 px-3">
        {file.sizeBytes ? formatSize(file.sizeBytes) : "\u2014"}
      </td>
      <td className="py-2 px-3">
        {file.updatedAt ? formatDate(file.updatedAt) : "\u2014"}
      </td>
    </tr>
  );
}

// ============================================================================
// INLINE RENAME INPUT
// ============================================================================

function InlineRenameInput({
  file,
  sessionId,
  onComplete,
}: {
  file: ProjectFile;
  sessionId: string;
  onComplete: () => void;
}) {
  const [name, setName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameFile = useMutation(api.projectFileSystem.renameFile);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === file.name) {
      onComplete();
      return;
    }

    try {
      await renameFile({
        sessionId,
        fileId: file._id as Id<"projectFiles">,
        newName: trimmed,
      });
    } catch (err) {
      console.error("Rename failed:", err);
    }
    onComplete();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSubmit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onComplete();
        }
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className="text-xs px-1 py-0.5 border w-full min-w-0"
      style={{
        borderColor: "var(--primary)",
        background: "var(--win95-bg)",
        color: "var(--win95-text)",
        outline: "none",
      }}
    />
  );
}

// ============================================================================
// SHARED PROJECT CARD
// ============================================================================

interface SharedProjectCardProps {
  projectName: string;
  ownerOrgName: string;
  permission: string;
  shareScope: string;
  sharedPath?: string;
  onClick: () => void;
}

function SharedProjectCard({
  projectName,
  ownerOrgName,
  permission,
  shareScope,
  sharedPath,
  onClick,
}: SharedProjectCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-4 rounded border-2 text-left transition-colors"
      style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--win95-border)";
      }}
    >
      <div className="flex items-center gap-2">
        <Share2 size={16} style={{ color: "var(--primary)" }} />
        <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
          {projectName}
        </span>
      </div>
      <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
        From: {ownerOrgName}
      </span>
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{
            background: "var(--win95-highlight-bg)",
            color: "var(--win95-highlight)",
          }}
        >
          {permission}
        </span>
        {shareScope === "subtree" && sharedPath && (
          <span
            className="text-[10px]"
            style={{ color: "var(--neutral-gray)" }}
          >
            {sharedPath}
          </span>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-2">
        <Clock size={16} className="animate-spin" style={{ color: "var(--neutral-gray)" }} />
        <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Loading...
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
      <div style={{ color: "var(--neutral-gray)" }}>{icon}</div>
      <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
        {title}
      </p>
      <p
        className="text-xs text-center max-w-xs"
        style={{ color: "var(--neutral-gray)" }}
      >
        {description}
      </p>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
