"use client";

/**
 * DROPBOX-STYLE MEDIA LIBRARY - MAIN ENTRY POINT
 * Complete redesign with Dropbox-inspired interface
 */

import { useState, useRef, useCallback } from "react";
import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useWindowManager } from "@/hooks/use-window-manager";
import { Id } from "../../../../convex/_generated/dataModel";
import { LeftSidebar } from "./components/left-sidebar";
import { TopBar } from "./components/top-bar";
import { FilePreviewPanel } from "./components/file-preview-panel";
import { StorageBar } from "./dropbox-components";
import { ContentArea } from "./dropbox-components";
import {
  CreateFolderModal,
  CreateDocumentModal,
  UploadModal,
} from "./dropbox-modals";

interface MediaLibraryDropboxProps {
  onSelect?: (media: {
    _id: Id<"organizationMedia">;
    url?: string | null;
    filename: string;
    mimeType?: string;
  }) => void;
  selectionMode?: boolean;
}

type ViewMode = "grid" | "list";
type NavigationSection = "home" | "folders" | "starred";
type SortOption = "name" | "date" | "size";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MediaItem = any; // Uses the shape returned by listMedia query

export default function MediaLibraryDropbox({
  onSelect,
  selectionMode = false,
}: MediaLibraryDropboxProps) {
  const [activeSection, setActiveSection] = useState<NavigationSection>("home");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateDocument, setShowCreateDocument] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [previewWidth, setPreviewWidth] = useState(320);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = previewWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 240), 600);
      setPreviewWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [previewWidth]);

  const currentOrg = useCurrentOrganization();
  const activeOrgId = currentOrg?.id || null;
  const { sessionId } = useAuth();
  const { closeWindow } = useWindowManager();

  // Check app availability
  const guard = useAppAvailabilityGuard({
    code: "media-library",
    name: "Media Library",
    description: "Centralized media management for your organization",
  });

  if (guard) return guard;
  if (!activeOrgId || !sessionId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>Please log in to access the media library</p>
      </div>
    );
  }

  return (
    <div className="h-full flex" style={{ background: "var(--win95-bg)" }}>
      {/* Left Sidebar */}
      <div
        className="w-56 flex-shrink-0 border-r-2 flex flex-col"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <LeftSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          selectedFolderId={selectedFolderId}
          onFolderSelect={setSelectedFolderId}
          organizationId={activeOrgId}
        />
      </div>

      {/* Main Content + Preview */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortChange={setSortBy}
          showNewMenu={showNewMenu}
          onToggleNewMenu={() => setShowNewMenu(!showNewMenu)}
          onCreateFolder={() => {
            setShowCreateFolder(true);
            setShowNewMenu(false);
          }}
          onCreateDocument={() => {
            setShowCreateDocument(true);
            setShowNewMenu(false);
          }}
          onUpload={() => {
            setShowUpload(true);
            setShowNewMenu(false);
          }}
        />

        {/* Storage Usage Bar */}
        <StorageBar organizationId={activeOrgId} sessionId={sessionId} />

        {/* Content + Preview Split */}
        <div className="flex-1 flex min-h-0" ref={containerRef}>
          {/* File List / Grid */}
          <div className="flex-1 min-w-0 overflow-y-auto p-6">
            <ContentArea
              activeSection={activeSection}
              selectedFolderId={selectedFolderId}
              viewMode={viewMode}
              searchQuery={searchQuery}
              sortBy={sortBy}
              organizationId={activeOrgId}
              sessionId={sessionId}
              selectedMediaIds={selectedMediaIds}
              onSelectMedia={(id) => {
                const newSet = new Set(selectedMediaIds);
                if (newSet.has(id)) {
                  newSet.delete(id);
                } else {
                  newSet.add(id);
                }
                setSelectedMediaIds(newSet);
              }}
              onMediaClick={(media: MediaItem) => {
                if (selectionMode && onSelect) {
                  onSelect(media);
                  closeWindow("media-library");
                } else {
                  setPreviewItem(media);
                  setSelectedMediaIds(new Set([media._id]));
                }
              }}
              onFolderNavigate={(folderId: string) => {
                setActiveSection("folders");
                setSelectedFolderId(folderId);
                setPreviewItem(null);
              }}
              renamingId={renamingId}
              newName={newName}
              onStartRename={(id, currentName) => {
                setRenamingId(id);
                setNewName(currentName);
              }}
              onCancelRename={() => {
                setRenamingId(null);
                setNewName("");
              }}
              onSaveRename={async () => {
                setRenamingId(null);
                setNewName("");
              }}
            />
          </div>

          {/* Resize Handle + Preview Panel */}
          {previewItem && (
            <>
              {/* Drag handle */}
              <div
                onMouseDown={handleResizeStart}
                className="w-1.5 flex-shrink-0 cursor-col-resize group relative"
                style={{ background: "var(--win95-border)" }}
              >
                <div
                  className="absolute inset-y-0 -left-1 -right-1 z-10"
                  title="Drag to resize"
                />
                {/* Visual grip dots */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-1 h-1 rounded-full" style={{ background: "var(--neutral-gray)" }} />
                  <div className="w-1 h-1 rounded-full" style={{ background: "var(--neutral-gray)" }} />
                  <div className="w-1 h-1 rounded-full" style={{ background: "var(--neutral-gray)" }} />
                </div>
              </div>
              {/* Preview panel */}
              <div className="flex-shrink-0" style={{ width: previewWidth }}>
                <FilePreviewPanel
                  item={previewItem}
                  sessionId={sessionId}
                  onClose={() => {
                    setPreviewItem(null);
                    setSelectedMediaIds(new Set());
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateFolder && (
        <CreateFolderModal
          organizationId={activeOrgId}
          sessionId={sessionId}
          parentFolderId={selectedFolderId}
          onClose={() => setShowCreateFolder(false)}
          onSuccess={() => {
            setShowCreateFolder(false);
          }}
        />
      )}

      {showCreateDocument && (
        <CreateDocumentModal
          organizationId={activeOrgId}
          sessionId={sessionId}
          folderId={selectedFolderId}
          onClose={() => setShowCreateDocument(false)}
          onSuccess={() => {
            setShowCreateDocument(false);
          }}
        />
      )}

      {showUpload && (
        <UploadModal
          organizationId={activeOrgId}
          sessionId={sessionId}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
