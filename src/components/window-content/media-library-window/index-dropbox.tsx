"use client";

/**
 * DROPBOX-STYLE MEDIA LIBRARY - MAIN ENTRY POINT
 * Complete redesign with Dropbox-inspired interface
 */

import { useState } from "react";
import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useWindowManager } from "@/hooks/use-window-manager";
import { Id } from "../../../../convex/_generated/dataModel";
import { LeftSidebar } from "./components/left-sidebar";
import { TopBar } from "./components/top-bar";
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
    url: string | null;
    filename: string;
    mimeType: string;
  }) => void;
  selectionMode?: boolean;
}

type ViewMode = "grid" | "list";
type NavigationSection = "home" | "folders" | "starred";
type SortOption = "name" | "date" | "size";

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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
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
            onMediaClick={(media) => {
              if (selectionMode && onSelect) {
                onSelect(media);
                closeWindow("media-library");
              }
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
              // TODO: Implement rename mutation call
              setRenamingId(null);
              setNewName("");
            }}
          />
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
