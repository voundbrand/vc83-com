"use client";

/**
 * FINDER PICKER DIALOG - Modal Finder for file/media selection
 *
 * Drop-in replacement for the media library picker.
 * Can filter by file kind and/or MIME type.
 */

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  X,
  Folder,
  FileText,
  Image,
  Box,
  Workflow,
  Upload,
  ChevronRight,
  HardDrive,
  FolderTree,
  Search,
  Check,
} from "lucide-react";
import type { ProjectFile } from "./finder-types";

// ============================================================================
// TYPES
// ============================================================================

export interface SelectedFile {
  _id: Id<"projectFiles">;
  name: string;
  path: string;
  fileKind: string;
  mimeType?: string;
  storageId?: Id<"_storage">;
  mediaId?: Id<"organizationMedia">;
  url?: string;
}

interface FinderPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: SelectedFile) => void;
  sessionId: string;
  organizationId: string;
  /** Restrict to specific file kinds */
  fileKindFilter?: string[];
  /** Restrict to specific MIME types (prefix match, e.g. "image/") */
  mimeTypeFilter?: string[];
  /** Dialog title */
  title?: string;
  /** Allow selecting multiple files */
  multiple?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FinderPickerDialog({
  open,
  onClose,
  onSelect,
  sessionId,
  organizationId,
  fileKindFilter,
  mimeTypeFilter,
  title = "Select File",
  multiple = false,
}: FinderPickerDialogProps) {
  const [scope, setScope] = useState<"org" | "project">("org");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Projects list
  const projects = useQuery(
    api.projectOntology.getProjects,
    sessionId ? { sessionId, organizationId: organizationId as Id<"organizations"> } : "skip"
  );

  // Org-scoped files
  const orgFiles = useQuery(
    api.projectFileSystem.listFiles,
    scope === "org" && sessionId
      ? {
          sessionId,
          organizationId: organizationId as Id<"organizations">,
          parentPath: currentPath,
        }
      : "skip"
  );

  // Project-scoped files
  const projectFiles = useQuery(
    api.projectFileSystem.listFiles,
    scope === "project" && selectedProjectId && sessionId
      ? {
          sessionId,
          projectId: selectedProjectId as Id<"objects">,
          parentPath: currentPath,
        }
      : "skip"
  );

  const rawFiles = scope === "org" ? orgFiles : projectFiles;

  // Filter + sort files
  const displayFiles = useMemo(() => {
    if (!rawFiles) return [] as ProjectFile[];
    let files = [...rawFiles] as ProjectFile[];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      files = files.filter((f) => f.name.toLowerCase().includes(q));
    }

    // File kind filter (always show folders for navigation)
    if (fileKindFilter && fileKindFilter.length > 0) {
      files = files.filter(
        (f) => f.fileKind === "folder" || fileKindFilter.includes(f.fileKind)
      );
    }

    // MIME type filter (always show folders)
    if (mimeTypeFilter && mimeTypeFilter.length > 0) {
      files = files.filter((f) => {
        if (f.fileKind === "folder") return true;
        if (!f.mimeType) return false;
        return mimeTypeFilter.some((prefix) => f.mimeType!.startsWith(prefix));
      });
    }

    // Sort: folders first, then name
    files.sort((a, b) => {
      if (a.fileKind === "folder" && b.fileKind !== "folder") return -1;
      if (a.fileKind !== "folder" && b.fileKind === "folder") return 1;
      return a.name.localeCompare(b.name);
    });

    return files;
  }, [rawFiles, searchQuery, fileKindFilter, mimeTypeFilter]);

  // Selected file object
  const selectedFile = displayFiles.find((f) => f._id === selectedFileId) || null;

  // Breadcrumb segments
  const pathSegments = currentPath === "/"
    ? [{ name: scope === "org" ? "Organization" : "Project", path: "/" }]
    : [
        { name: scope === "org" ? "Organization" : "Project", path: "/" },
        ...currentPath.split("/").filter(Boolean).map((seg, i, arr) => ({
          name: seg,
          path: "/" + arr.slice(0, i + 1).join("/"),
        })),
      ];

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedFileId(null);
  };

  const handleFileClick = (file: ProjectFile) => {
    if (file.fileKind === "folder") {
      handleNavigate(file.path);
    } else {
      setSelectedFileId(file._id);
    }
  };

  const handleConfirm = () => {
    if (!selectedFile || selectedFile.fileKind === "folder") return;
    onSelect({
      _id: selectedFile._id,
      name: selectedFile.name,
      path: selectedFile.path,
      fileKind: selectedFile.fileKind,
      mimeType: selectedFile.mimeType,
      storageId: selectedFile.storageId,
      mediaId: selectedFile.mediaId,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-3xl h-[500px] flex flex-col border rounded-2xl shadow-lg"
        style={{
          background: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
      >
        {/* Title Bar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--desktop-shell-accent)",
          }}
        >
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            {title}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md">
            <X size={14} style={{ color: "var(--neutral-gray)" }} />
          </button>
        </div>

        {/* Scope + Search Bar */}
        <div
          className="flex items-center gap-3 px-4 py-2 border-b"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          {/* Scope Toggle */}
          <div
            className="flex items-center gap-1 p-0.5 border rounded-lg"
            style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
          >
            <button
              onClick={() => { setScope("org"); setCurrentPath("/"); setSelectedFileId(null); }}
              className={`desktop-interior-tab px-3 py-1 text-xs ${scope === "org" ? "desktop-interior-tab-active" : ""}`}
            >
              <HardDrive size={12} className="inline mr-1" />
              Org
            </button>
            <button
              onClick={() => { setScope("project"); setCurrentPath("/"); setSelectedFileId(null); }}
              className={`desktop-interior-tab px-3 py-1 text-xs ${scope === "project" ? "desktop-interior-tab-active" : ""}`}
            >
              <FolderTree size={12} className="inline mr-1" />
              Project
            </button>
          </div>

          {/* Project selector (in project scope) */}
          {scope === "project" && (
            <select
              value={selectedProjectId || ""}
              onChange={(e) => {
                setSelectedProjectId(e.target.value || null);
                setCurrentPath("/");
                setSelectedFileId(null);
              }}
              className="desktop-interior-select py-1 text-xs min-w-[160px]"
            >
              <option value="">Select project...</option>
              {projects?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Search */}
          <div className="flex-1 relative">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2"
              style={{ color: "var(--neutral-gray)" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="desktop-interior-input w-full pl-7 pr-2 py-1 text-xs"
            />
          </div>
        </div>

        {/* Breadcrumbs */}
        <div
          className="flex items-center gap-1 px-4 py-1.5 border-b"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          {pathSegments.map((seg, i) => (
            <span key={seg.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={10} style={{ color: "var(--neutral-gray)" }} />}
              <button
                onClick={() => handleNavigate(seg.path)}
                className="text-[11px] px-1"
                style={{
                  color: i === pathSegments.length - 1 ? "var(--win95-text)" : "var(--finder-accent)",
                  fontWeight: i === pathSegments.length - 1 ? "bold" : "normal",
                }}
              >
                {seg.name}
              </button>
            </span>
          ))}
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2">
          {!rawFiles ? (
            <p className="text-xs p-4 text-center" style={{ color: "var(--neutral-gray)" }}>
              {scope === "project" && !selectedProjectId
                ? "Select a project to browse files"
                : "Loading..."}
            </p>
          ) : displayFiles.length === 0 ? (
            <p className="text-xs p-4 text-center" style={{ color: "var(--neutral-gray)" }}>
              No files found
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {displayFiles.map((file) => (
                <PickerFileItem
                  key={file._id}
                  file={file}
                  isSelected={selectedFileId === file._id}
                  onClick={() => handleFileClick(file)}
                  onDoubleClick={() => {
                    if (file.fileKind === "folder") {
                      handleNavigate(file.path);
                    } else {
                      setSelectedFileId(file._id);
                      // Auto-confirm on double-click
                      onSelect({
                        _id: file._id,
                        name: file.name,
                        path: file.path,
                        fileKind: file.fileKind,
                        mimeType: file.mimeType,
                        storageId: file.storageId,
                        mediaId: file.mediaId,
                      });
                      onClose();
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: "var(--window-document-border)" }}
        >
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {selectedFile ? selectedFile.name : "No file selected"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="desktop-interior-button px-4 py-2 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedFile || selectedFile.fileKind === "folder"}
              className="desktop-interior-button desktop-interior-button-primary px-4 py-2 text-xs font-bold"
              style={{
                opacity: !selectedFile || selectedFile.fileKind === "folder" ? 0.5 : 1,
              }}
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FILE ITEM
// ============================================================================

const FILE_ICONS: Record<string, React.ReactNode> = {
  folder: <Folder size={24} />,
  virtual: <FileText size={24} />,
  uploaded: <Upload size={24} />,
  media_ref: <Image size={24} />,
  builder_ref: <Box size={24} />,
  layer_ref: <Workflow size={24} />,
};

function PickerFileItem({
  file,
  isSelected,
  onClick,
  onDoubleClick,
}: {
  file: ProjectFile;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className="flex flex-col items-center gap-1 p-3 rounded text-center transition-colors"
      style={{
        background: isSelected ? "var(--finder-selection-bg)" : "transparent",
        color: isSelected ? "var(--finder-selection-text)" : "var(--win95-text)",
      }}
    >
      <div className="relative">
        {FILE_ICONS[file.fileKind] || <FileText size={24} />}
        {isSelected && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "var(--primary)" }}
          >
            <Check size={10} color="#fff" />
          </div>
        )}
      </div>
      <span className="text-[11px] truncate w-full">{file.name}</span>
    </button>
  );
}
