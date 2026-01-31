"use client";

/**
 * DROPBOX-STYLE MEDIA LIBRARY - ADDITIONAL COMPONENTS
 * Supporting components for the main Dropbox-style interface
 */

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Folder,
  FolderPlus,
  FileText,
  Upload,
  Star,
} from "lucide-react";
import Image from "next/image";

// ============================================================================
// NEW DROPDOWN MENU
// ============================================================================

interface NewDropdownMenuProps {
  onCreateFolder: () => void;
  onCreateDocument: () => void;
  onUpload: () => void;
  onClose: () => void;
}

export function NewDropdownMenu({
  onCreateFolder,
  onCreateDocument,
  onUpload,
  onClose,
}: NewDropdownMenuProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        className="absolute top-full left-0 mt-1 w-64 border-2 shadow-lg z-50"
        style={{
          background: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Create Section */}
        <div className="p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
          <p className="text-xs font-bold px-2 py-1" style={{ color: "var(--neutral-gray)" }}>
            CREATE
          </p>
          <button
            onClick={onCreateFolder}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs text-left rounded transition-colors hover:bg-opacity-80"
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
            <FolderPlus size={16} />
            <span>Folder</span>
          </button>
          <button
            onClick={onCreateDocument}
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
            <FileText size={16} />
            <span>Layer Cake Document</span>
          </button>
        </div>

        {/* Upload Section */}
        <div className="p-2">
          <p className="text-xs font-bold px-2 py-1" style={{ color: "var(--neutral-gray)" }}>
            ADD
          </p>
          <button
            onClick={onUpload}
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
            <Upload size={16} />
            <span>Upload File</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// STORAGE BAR
// ============================================================================

interface StorageBarProps {
  organizationId: string | null;
  sessionId: string | null;
}

export function StorageBar({ organizationId, sessionId }: StorageBarProps) {
  const usage = useQuery(
    api.organizationMedia.getStorageUsage,
    organizationId && sessionId
      ? {
          organizationId: organizationId as Id<"organizations">,
          sessionId,
        }
      : "skip"
  );

  if (!usage) return null;

  const usagePercent = (usage.totalBytes / usage.quotaBytes) * 100;

  return (
    <div
      className="px-6 py-2 border-b-2 flex items-center gap-4"
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
    >
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: "var(--win95-text)" }}>
            📊 Using {formatBytes(usage.totalBytes)} of {formatBytes(usage.quotaBytes)}
          </span>
          <span style={{ color: "var(--neutral-gray)" }}>{Math.round(usagePercent)}%</span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: "var(--win95-border-light)" }}
        >
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${Math.min(usagePercent, 100)}%`,
              background:
                usagePercent > 90
                  ? "var(--error)"
                  : usagePercent > 75
                  ? "#f59e0b"
                  : "var(--win95-highlight)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================================================
// CONTENT AREA
// ============================================================================

// Media item type based on organizationMedia.listMedia return type
interface MediaItem {
  _id: Id<"organizationMedia">;
  filename: string;
  mimeType?: string;
  sizeBytes: number;
  url?: string | null;
  isStarred?: boolean;
  folderId?: string | null;
  createdAt: number;
  _creationTime?: number;
  [key: string]: unknown; // Allow additional properties from query
}

interface FolderItem {
  _id: string;
  name: string;
  customProperties?: { color?: string; description?: string };
  children?: FolderItem[];
}

interface ContentAreaProps {
  activeSection: string;
  selectedFolderId: string | null;
  viewMode: "grid" | "list";
  searchQuery: string;
  sortBy: string;
  organizationId: string | null;
  sessionId: string | null;
  selectedMediaIds: Set<string>;
  onSelectMedia: (id: string) => void;
  onMediaClick: (media: MediaItem) => void;
  onFolderNavigate?: (folderId: string) => void;
  renamingId: string | null;
  newName: string;
  onStartRename: (id: string, currentName: string) => void;
  onCancelRename: () => void;
  onSaveRename: (id: string) => void;
}

export function ContentArea({
  activeSection,
  selectedFolderId,
  viewMode,
  searchQuery,
  sortBy,
  organizationId,
  sessionId,
  selectedMediaIds,
  onMediaClick,
  onFolderNavigate,
}: ContentAreaProps) {
  // Get media based on context
  const allMedia = useQuery(
    api.organizationMedia.listMedia,
    organizationId && sessionId
      ? {
          organizationId: organizationId as Id<"organizations">,
          sessionId,
        }
      : "skip"
  );

  // Get folders for inline display
  const folderTree = useQuery(
    api.mediaFolderOntology.getFolderTree,
    organizationId
      ? { organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  // Get folders at the current level
  const currentFolders = useMemo(() => {
    if (!folderTree || activeSection === "starred") return [];
    if (!searchQuery) {
      // Show root-level folders in home, or children of selected folder
      if (activeSection === "home" || !selectedFolderId) {
        return folderTree;
      }
      // Find the selected folder and return its children
      const findFolder = (nodes: FolderItem[]): FolderItem[] => {
        for (const node of nodes) {
          if (node._id === selectedFolderId) {
            return node.children || [];
          }
          if (node.children) {
            const found = findFolder(node.children);
            if (found.length > 0) return found;
          }
        }
        return [];
      };
      return findFolder(folderTree);
    }
    // When searching, don't show folders
    return [];
  }, [folderTree, activeSection, selectedFolderId, searchQuery]);

  // Filter and sort media
  const filteredMedia = useMemo(() => {
    if (!allMedia) return [];

    let filtered = [...allMedia];

    // Filter by section
    if (activeSection === "starred") {
      filtered = filtered.filter((m) => m.isStarred);
    } else if (activeSection === "folders") {
      filtered = filtered.filter((m) => m.folderId === selectedFolderId);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.filename.toLowerCase().includes(query));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.filename.localeCompare(b.filename);
        case "size":
          return b.sizeBytes - a.sizeBytes;
        case "date":
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return filtered;
  }, [allMedia, activeSection, selectedFolderId, searchQuery, sortBy]);

  if (!allMedia) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
          Loading...
        </p>
      </div>
    );
  }

  if (filteredMedia.length === 0 && currentFolders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-lg font-bold mb-2" style={{ color: "var(--win95-text)" }}>
          No files here
        </p>
        <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
          Upload a file or create a Layer Cake document to get started
        </p>
      </div>
    );
  }

  return (
    <div>
      {viewMode === "grid" ? (
        <>
          {/* Folder grid items */}
          {currentFolders.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-4">
              {currentFolders.map((folder) => (
                <FolderGridItem
                  key={folder._id}
                  folder={folder}
                  onClick={() => onFolderNavigate?.(folder._id)}
                />
              ))}
            </div>
          )}
          <GridView
            media={filteredMedia}
            selectedMediaIds={selectedMediaIds}
            onMediaClick={onMediaClick}
            sessionId={sessionId}
          />
        </>
      ) : (
        <ListView
          media={filteredMedia}
          folders={currentFolders}
          selectedMediaIds={selectedMediaIds}
          onMediaClick={onMediaClick}
          onFolderNavigate={onFolderNavigate}
        />
      )}
    </div>
  );
}

// Grid View Component
interface GridViewProps {
  media: MediaItem[];
  selectedMediaIds: Set<string>;
  onMediaClick: (media: MediaItem) => void;
  sessionId: string | null;
}

function GridView({
  media,
  selectedMediaIds,
  onMediaClick,
  sessionId,
}: GridViewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {media.map((item) => (
        <MediaGridItem
          key={item._id}
          item={item}
          isSelected={selectedMediaIds.has(item._id)}
          onClick={() => onMediaClick(item)}
          sessionId={sessionId}
        />
      ))}
    </div>
  );
}

// List View Component
interface ListViewProps {
  media: MediaItem[];
  folders?: FolderItem[];
  selectedMediaIds: Set<string>;
  onMediaClick: (media: MediaItem) => void;
  onFolderNavigate?: (folderId: string) => void;
}

function ListView({
  media,
  folders = [],
  selectedMediaIds,
  onMediaClick,
  onFolderNavigate,
}: ListViewProps) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div
        className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold border-b-2"
        style={{ borderColor: "var(--win95-border)", color: "var(--win95-text)" }}
      >
        <div className="col-span-6">Name</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-3">Modified</div>
        <div className="col-span-1"></div>
      </div>

      {/* Folders */}
      {folders.map((folder) => (
        <div
          key={folder._id}
          onClick={() => onFolderNavigate?.(folder._id)}
          className="grid grid-cols-12 gap-4 px-4 py-2 text-xs border-b cursor-pointer transition-colors"
          style={{
            borderColor: "var(--win95-border-light)",
            color: "var(--win95-text)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--win95-highlight-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <div className="col-span-6 flex items-center gap-2 truncate">
            <Folder size={16} style={{ color: folder.customProperties?.color || "var(--primary)" }} />
            <span className="truncate font-medium">{folder.name}</span>
          </div>
          <div className="col-span-2" style={{ color: "var(--neutral-gray)" }}>--</div>
          <div className="col-span-3" style={{ color: "var(--neutral-gray)" }}>--</div>
          <div className="col-span-1"></div>
        </div>
      ))}

      {/* Files */}
      {media.map((item) => (
        <MediaListItem
          key={item._id}
          item={item}
          isSelected={selectedMediaIds.has(item._id)}
          onClick={() => onMediaClick(item)}
        />
      ))}
    </div>
  );
}

// Media Grid Item Component
interface MediaGridItemProps {
  item: MediaItem;
  isSelected: boolean;
  onClick: () => void;
  sessionId: string | null;
}

function MediaGridItem({ item, isSelected, onClick, sessionId }: MediaGridItemProps) {
  const starMedia = useMutation(api.organizationMedia.starMedia);
  const unstarMedia = useMutation(api.organizationMedia.unstarMedia);

  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sessionId) return;

    try {
      if (item.isStarred) {
        await unstarMedia({ sessionId, mediaId: item._id });
      } else {
        await starMedia({ sessionId, mediaId: item._id });
      }
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  return (
    <div
      onClick={onClick}
      className="relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all"
      style={{
        borderColor: isSelected ? "var(--win95-highlight)" : "var(--win95-border)",
        background: isSelected ? "var(--win95-highlight-bg)" : "var(--win95-bg)",
      }}
    >
      {/* Star Button */}
      <button
        onClick={handleStar}
        className="absolute top-2 right-2 z-10 p-1 rounded"
        style={{ background: "rgba(0,0,0,0.5)" }}
      >
        <Star
          size={16}
          fill={item.isStarred ? "#fbbf24" : "none"}
          stroke={item.isStarred ? "#fbbf24" : "white"}
        />
      </button>

      {/* Preview */}
      <div
        className="aspect-square relative"
        style={{ background: "var(--win95-bg-light)" }}
      >
        {item.mimeType?.startsWith("image/") && item.url ? (
          <Image
            src={item.url}
            alt={item.filename}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText size={48} style={{ color: "var(--neutral-gray)" }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2" style={{ background: "var(--win95-bg-light)" }}>
        <p className="text-xs font-medium truncate" style={{ color: "var(--win95-text)" }}>
          {item.filename}
        </p>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {formatBytes(item.sizeBytes)}
        </p>
      </div>
    </div>
  );
}

// Folder Grid Item Component
interface FolderGridItemProps {
  folder: FolderItem;
  onClick: () => void;
}

function FolderGridItem({ folder, onClick }: FolderGridItemProps) {
  return (
    <div
      onClick={onClick}
      className="relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all"
      style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg)",
      }}
    >
      {/* Folder Icon */}
      <div
        className="aspect-square relative flex items-center justify-center"
        style={{ background: "var(--win95-bg-light)" }}
      >
        <Folder size={56} style={{ color: folder.customProperties?.color || "var(--primary)" }} />
      </div>

      {/* Info */}
      <div className="p-2" style={{ background: "var(--win95-bg-light)" }}>
        <p className="text-xs font-medium truncate" style={{ color: "var(--win95-text)" }}>
          {folder.name}
        </p>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Folder
        </p>
      </div>
    </div>
  );
}

// Media List Item Component (simplified - full version would be larger)
interface MediaListItemProps {
  item: MediaItem;
  isSelected: boolean;
  onClick: () => void;
}

function MediaListItem({ item, isSelected, onClick }: MediaListItemProps) {
  return (
    <div
      onClick={onClick}
      className="grid grid-cols-12 gap-4 px-4 py-2 text-xs border-b cursor-pointer transition-colors"
      style={{
        borderColor: "var(--win95-border-light)",
        background: isSelected ? "var(--win95-highlight-bg)" : "transparent",
        color: isSelected ? "var(--win95-highlight)" : "var(--win95-text)",
      }}
    >
      <div className="col-span-6 flex items-center gap-2 truncate">
        <FileText size={16} />
        <span className="truncate">{item.filename}</span>
      </div>
      <div className="col-span-2">{formatBytes(item.sizeBytes)}</div>
      <div className="col-span-3">{new Date(item.createdAt).toLocaleDateString()}</div>
      <div className="col-span-1">
        {item.isStarred && <Star size={14} fill="#fbbf24" stroke="#fbbf24" />}
      </div>
    </div>
  );
}

// Continued with modals...
