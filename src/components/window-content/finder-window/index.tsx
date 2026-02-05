"use client";

/**
 * FINDER WINDOW - Full OS-like file browser
 *
 * Supports four modes:
 * - "org"     — Org-scoped files
 * - "project" — Project-scoped file tree
 * - "shared"  — Cross-org shared projects
 * - "trash"   — Soft-deleted files (restore / permanent delete)
 *
 * Phase B: soft-delete, favorites, recents, tags, org-scope,
 * file creation (plain text, code), upload, trash view.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { FinderSidebar } from "./finder-sidebar";
import { FinderToolbar, type ViewMode, type SortOption } from "./finder-toolbar";
import { FinderContent } from "./finder-content";
import { FinderPreview } from "./finder-preview";
import {
  CreateFolderModal,
  CreateNoteModal,
  CreatePlainTextModal,
  CreateCodeFileModal,
  DeleteConfirmationModal,
} from "./finder-modals";
import { ShareProjectDialog } from "./share-dialog";
import { FinderContextMenu } from "./finder-context-menu";
import { FinderTabs } from "./finder-tabs";
import { EditorRouter } from "./editors/editor-router";
import { FinderTrashView } from "./finder-trash-view";
import { FinderTagManager } from "./finder-tag-manager";
import { useFinderUpload, UploadProgressOverlay, HiddenFileInput } from "./finder-upload";
import { useFinderSelection } from "./use-finder-selection";
import { useFinderClipboard } from "./use-finder-clipboard";
import { useFinderKeyboard } from "./use-finder-keyboard";
import { useFinderDragDrop } from "./use-finder-drag-drop";
import { useFinderTabs } from "./use-finder-tabs";
import type { ProjectFile, FinderMode, ContextMenuState } from "./finder-types";

export function FinderWindow() {
  // Auth
  const currentOrg = useCurrentOrganization();
  const activeOrgId = currentOrg?.id || null;
  const { sessionId } = useAuth();

  // Navigation state
  const [mode, setMode] = useState<FinderMode>("project");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("/");

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Preview panel
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [previewWidth, setPreviewWidth] = useState(320);
  const isResizing = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Container ref for keyboard scoping
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [showCreatePlainText, setShowCreatePlainText] = useState(false);
  const [showCreateCodeFile, setShowCreateCodeFile] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Inline rename
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);

  // Org folders initialization flag
  const [orgFoldersInitialized, setOrgFoldersInitialized] = useState(false);

  // Pending invites count
  const pendingInvites = useQuery(
    api.projectSharing.listPendingInvites,
    sessionId ? { sessionId } : "skip"
  );

  // ---- FILE QUERIES (dual-scope: project or org) ----
  const isProjectMode = mode === "project" && !!selectedProjectId;
  const isOrgMode = mode === "org";
  const canBrowse = isProjectMode || isOrgMode;

  // Project-scoped files
  const projectFiles = useQuery(
    api.projectFileSystem.listFiles,
    isProjectMode && sessionId
      ? {
          sessionId,
          projectId: selectedProjectId as Id<"objects">,
          parentPath: currentPath,
        }
      : "skip"
  );

  // Org-scoped files
  const orgFiles = useQuery(
    // @ts-expect-error — deep type instantiation from large schema
    api.projectFileSystem.listFiles,
    isOrgMode && sessionId && activeOrgId
      ? {
          sessionId,
          organizationId: activeOrgId as Id<"organizations">,
          parentPath: currentPath,
        }
      : "skip"
  );

  const rawFiles = isProjectMode ? projectFiles : isOrgMode ? orgFiles : null;

  // Sorted + filtered files
  const displayFiles = useMemo(() => {
    if (!rawFiles) return [] as ProjectFile[];
    let filtered = [...rawFiles] as ProjectFile[];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((f: ProjectFile) => f.name.toLowerCase().includes(q));
    }

    // Tag filter
    if (activeTagFilter) {
      filtered = filtered.filter(
        (f: ProjectFile) => f.tags && f.tags.includes(activeTagFilter!)
      );
    }

    // Sort
    filtered.sort((a: ProjectFile, b: ProjectFile) => {
      if (a.fileKind === "folder" && b.fileKind !== "folder") return -1;
      if (a.fileKind !== "folder" && b.fileKind === "folder") return 1;
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "date": return (b.updatedAt || 0) - (a.updatedAt || 0);
        case "kind": return a.fileKind.localeCompare(b.fileKind);
        default: return 0;
      }
    });

    return filtered;
  }, [rawFiles, searchQuery, sortBy, activeTagFilter]);

  // ---- HOOKS ----
  const selection = useFinderSelection(displayFiles);
  const clipboard = useFinderClipboard(sessionId || "");
  const dragDrop = useFinderDragDrop(sessionId || "", selectedProjectId, selection.selectedFiles);
  const finderTabs = useFinderTabs();

  // Upload hook
  const upload = useFinderUpload({
    sessionId: sessionId || "",
    organizationId: activeOrgId || "",
    projectId: isProjectMode ? selectedProjectId! : undefined,
    parentPath: currentPath,
  });

  // ---- MUTATIONS ----
  const deleteFilesMutation = useMutation(api.projectFileSystem.deleteFiles);
  const duplicateFileMutation = useMutation(api.projectFileSystem.duplicateFile);
  const toggleBookmarkMutation = useMutation(api.projectFileSystem.toggleBookmark);
  const recordAccessMutation = useMutation(api.projectFileSystem.recordFileAccess);

  // ---- ORG FOLDER INIT ----
  useEffect(() => {
    if (mode === "org" && activeOrgId && sessionId && !orgFoldersInitialized) {
      setOrgFoldersInitialized(true);
    }
  }, [mode, activeOrgId, sessionId, orgFoldersInitialized]);

  // ---- NAVIGATION ----
  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId || null);
    setCurrentPath("/");
    setPreviewFile(null);
    selection.clearSelection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavigate = useCallback((path: string) => {
    setCurrentPath(path);
    setPreviewFile(null);
    selection.clearSelection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeChange = useCallback((m: FinderMode) => {
    setMode(m);
    setPreviewFile(null);
    selection.clearSelection();
    setActiveTagFilter(null);
    setSearchQuery("");
    if (m !== "project") {
      setCurrentPath("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- FILE ACTIONS ----
  const handleFileSelect = useCallback((file: ProjectFile, event: React.MouseEvent) => {
    selection.handleSelect(file, event);
    setPreviewFile(file);
  }, [selection]);

  const handleFileOpen = useCallback((file: ProjectFile) => {
    // Record access for recent files
    if (sessionId && activeOrgId && file.fileKind !== "folder") {
      recordAccessMutation({
        sessionId,
        fileId: file._id as Id<"projectFiles">,
        organizationId: activeOrgId as Id<"organizations">,
      }).catch(() => {});
    }

    if (file.fileKind === "folder") {
      handleNavigate(file.path);
    } else if (file.fileKind === "builder_ref") {
      window.open("/builder", "_blank");
    } else if (file.fileKind === "layer_ref") {
      window.open(`/layers?workflowId=${file.layerWorkflowId}`, "_blank");
    } else {
      finderTabs.openTab(file);
    }
  }, [handleNavigate, finderTabs, sessionId, activeOrgId, recordAccessMutation]);

  const handleDelete = useCallback(() => {
    if (selection.selectedFiles.length === 0) return;
    setShowDeleteConfirm(true);
  }, [selection.selectedFiles]);

  const handleConfirmDelete = useCallback(async () => {
    if (!sessionId || selection.selectedFiles.length === 0) return;
    setIsDeleting(true);
    try {
      await deleteFilesMutation({
        sessionId,
        fileIds: selection.selectedFiles.map((f) => f._id as Id<"projectFiles">),
      });
      selection.clearSelection();
      setPreviewFile(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  }, [sessionId, selection, deleteFilesMutation]);

  const handleDuplicate = useCallback(async () => {
    if (!sessionId) return;
    for (const file of selection.selectedFiles) {
      if (file.fileKind !== "folder") {
        try {
          await duplicateFileMutation({
            sessionId,
            fileId: file._id as Id<"projectFiles">,
          });
        } catch (err) {
          console.error("Duplicate failed:", err);
        }
      }
    }
  }, [sessionId, selection.selectedFiles, duplicateFileMutation]);

  const handleCopyPath = useCallback(() => {
    if (selection.selectedFiles.length > 0) {
      const paths = selection.selectedFiles.map((f) => f.path).join("\n");
      navigator.clipboard.writeText(paths);
    }
  }, [selection.selectedFiles]);

  const handleRenameStart = useCallback(() => {
    if (selection.selectedFiles.length === 1) {
      setRenamingFileId(selection.selectedFiles[0]._id);
    }
  }, [selection.selectedFiles]);

  const handleToggleBookmark = useCallback(async () => {
    if (!sessionId || !activeOrgId || selection.selectedFiles.length !== 1) return;
    try {
      await toggleBookmarkMutation({
        sessionId,
        fileId: selection.selectedFiles[0]._id as Id<"projectFiles">,
        organizationId: activeOrgId as Id<"organizations">,
      });
    } catch (err) {
      console.error("Bookmark toggle failed:", err);
    }
  }, [sessionId, activeOrgId, selection.selectedFiles, toggleBookmarkMutation]);

  const handleOpenFileFromSidebar = useCallback((fileId: string) => {
    // When clicking a file in sidebar (favorites/recents), we need to open it
    // For now, open the file in an editor tab if we can get the file data
    // The sidebar already has the file info from its query results
  }, []);

  // ---- CONTEXT MENU ----
  const handleContextMenu = useCallback((e: React.MouseEvent, file?: ProjectFile) => {
    e.preventDefault();
    if (file) {
      if (!selection.isSelected(file._id)) {
        selection.clearSelection();
        selection.handleSelect(file, { ...e, metaKey: false, ctrlKey: false, shiftKey: false } as React.MouseEvent);
      }
      setContextMenu({
        type: "file",
        position: { top: e.clientY, left: e.clientX },
        file,
      });
    } else {
      setContextMenu({
        type: "background",
        position: { top: e.clientY, left: e.clientX },
      });
    }
  }, [selection]);

  // ---- KEYBOARD SHORTCUTS ----
  useFinderKeyboard(containerRef, {
    onDelete: handleDelete,
    onRename: handleRenameStart,
    onCopy: () => clipboard.copy(selection.selectedFiles),
    onCut: () => clipboard.cut(selection.selectedFiles),
    onPaste: () => clipboard.paste(currentPath),
    onSelectAll: selection.selectAll,
    onEscape: () => {
      selection.clearSelection();
      setContextMenu(null);
      setRenamingFileId(null);
    },
    onNewFolder: () => setShowCreateFolder(true),
    onFocusSearch: () => searchInputRef.current?.focus(),
  }, canBrowse);

  // ---- RESIZE HANDLE ----
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
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
        cleanupRef.current = null;
      };

      cleanupRef.current = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [previewWidth]
  );

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  if (!activeOrgId || !sessionId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Please log in to access the Finder
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="h-full flex outline-none"
      style={{ background: "var(--win95-bg)" }}
    >
      {/* Left Sidebar */}
      <div
        className="w-56 flex-shrink-0 border-r-2 flex flex-col"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <FinderSidebar
          mode={mode}
          onModeChange={handleModeChange}
          sessionId={sessionId}
          organizationId={activeOrgId}
          selectedProjectId={selectedProjectId}
          onProjectSelect={handleProjectSelect}
          currentPath={currentPath}
          onNavigate={handleNavigate}
          pendingInviteCount={pendingInvites?.length || 0}
          onOpenFile={handleOpenFileFromSidebar}
          onTagFilter={setActiveTagFilter}
          activeTagFilter={activeTagFilter}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Toolbar (hidden in trash mode) */}
        {mode !== "trash" && (
          <FinderToolbar
            sessionId={sessionId}
            projectId={selectedProjectId}
            organizationId={activeOrgId}
            currentPath={currentPath}
            onNavigate={handleNavigate}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onCreateFolder={() => setShowCreateFolder(true)}
            onCreateNote={() => setShowCreateNote(true)}
            onCreatePlainText={() => setShowCreatePlainText(true)}
            onCreateCodeFile={() => setShowCreateCodeFile(true)}
            onUploadFile={upload.openFilePicker}
            onShareProject={isProjectMode ? () => setShowShareDialog(true) : undefined}
            onOpenTagManager={() => setShowTagManager(true)}
            searchInputRef={searchInputRef}
            mode={mode}
          />
        )}

        {/* Tab Bar (only when tabs exist and not in trash mode) */}
        {mode !== "trash" && finderTabs.tabs.length > 0 && (
          <FinderTabs
            tabs={finderTabs.tabs}
            activeTabId={finderTabs.activeTabId}
            onSelectTab={(id) => finderTabs.setActiveTab(id)}
            onCloseTab={finderTabs.closeTab}
            onBrowse={() => finderTabs.setActiveTab(null)}
            isBrowsing={finderTabs.activeTabId === null}
          />
        )}

        {/* Trash Mode */}
        {mode === "trash" ? (
          <FinderTrashView
            sessionId={sessionId}
            organizationId={activeOrgId}
          />
        ) : (
          /* Content + Preview Split OR Editor View */
          <div className="flex-1 flex min-h-0">
            {finderTabs.activeTab ? (
              /* Editor view — full width when a tab is active */
              <div className="flex-1 min-w-0 min-h-0">
                <EditorRouter
                  file={finderTabs.activeTab.file}
                  editorType={finderTabs.activeTab.editorType}
                  sessionId={sessionId}
                  onDirty={() => finderTabs.markDirty(finderTabs.activeTab!.id)}
                  onClean={() => finderTabs.markClean(finderTabs.activeTab!.id)}
                />
              </div>
            ) : (
              <>
                {/* File List / Grid */}
                <div
                  className="flex-1 min-w-0 overflow-y-auto"
                  onContextMenu={(e) => {
                    if (e.target === e.currentTarget || (e.target as HTMLElement).closest("[data-finder-content-bg]")) {
                      handleContextMenu(e);
                    }
                  }}
                  onDragOver={(e) => dragDrop.handleContentDragOver(e, currentPath)}
                  onDrop={(e) => dragDrop.handleContentDrop(e, currentPath)}
                >
                  <FinderContent
                    mode={mode}
                    sessionId={sessionId}
                    organizationId={activeOrgId}
                    projectId={selectedProjectId}
                    currentPath={currentPath}
                    viewMode={viewMode}
                    sortBy={sortBy}
                    searchQuery={searchQuery}
                    displayFiles={displayFiles}
                    isSelected={selection.isSelected}
                    onFileSelect={handleFileSelect}
                    onFolderOpen={handleNavigate}
                    onFileDoubleClick={handleFileOpen}
                    onContextMenu={handleContextMenu}
                    onNavigateSharedProject={(projectId, path) => {
                      setMode("project");
                      setSelectedProjectId(projectId);
                      setCurrentPath(path);
                      setPreviewFile(null);
                      selection.clearSelection();
                    }}
                    renamingFileId={renamingFileId}
                    onRenameComplete={() => setRenamingFileId(null)}
                    isCut={clipboard.isCut}
                    onDragStart={dragDrop.handleDragStart}
                    onDragEnd={dragDrop.handleDragEnd}
                    onDragOver={dragDrop.handleDragOver}
                    onDragLeave={dragDrop.handleDragLeave}
                    onDrop={dragDrop.handleDrop}
                    isDropTarget={dragDrop.isDropTarget}
                  />
                </div>

                {/* Resize Handle + Preview Panel */}
                {previewFile && previewFile.fileKind !== "folder" && (
                  <>
                    <div
                      onMouseDown={handleResizeStart}
                      className="w-1.5 flex-shrink-0 cursor-col-resize group relative"
                      style={{ background: "var(--win95-border)" }}
                    >
                      <div className="absolute inset-y-0 -left-1 -right-1 z-10" title="Drag to resize" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-1 h-1 rounded-full" style={{ background: "var(--neutral-gray)" }} />
                        <div className="w-1 h-1 rounded-full" style={{ background: "var(--neutral-gray)" }} />
                        <div className="w-1 h-1 rounded-full" style={{ background: "var(--neutral-gray)" }} />
                      </div>
                    </div>
                    <div className="flex-shrink-0" style={{ width: previewWidth }}>
                      <FinderPreview
                        file={previewFile}
                        onClose={() => setPreviewFile(null)}
                        onOpenInBuilder={
                          previewFile?.fileKind === "builder_ref" && previewFile?.builderAppId
                            ? () => window.open(`/builder`, "_blank")
                            : undefined
                        }
                        onOpenInLayers={
                          previewFile?.fileKind === "layer_ref" && previewFile?.layerWorkflowId
                            ? () => window.open(`/layers?workflowId=${previewFile.layerWorkflowId}`, "_blank")
                            : undefined
                        }
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Upload Progress Overlay */}
        <UploadProgressOverlay
          uploads={upload.uploads}
          onClear={upload.clearUpload}
        />

        {/* Hidden File Input for uploads */}
        <HiddenFileInput
          inputRef={upload.fileInputRef}
          onFiles={upload.handleFiles}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <FinderContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          selectedFiles={selection.selectedFiles}
          onOpen={handleFileOpen}
          onRename={handleRenameStart}
          onCopy={() => clipboard.copy(selection.selectedFiles)}
          onCut={() => clipboard.cut(selection.selectedFiles)}
          onPaste={() => clipboard.paste(currentPath)}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onCopyPath={handleCopyPath}
          onGetInfo={() => {
            if (selection.selectedFiles.length > 0) {
              setPreviewFile(selection.selectedFiles[0]);
            }
          }}
          onToggleBookmark={handleToggleBookmark}
          onCreateFolder={() => setShowCreateFolder(true)}
          onCreateNote={() => setShowCreateNote(true)}
          onCreatePlainText={() => setShowCreatePlainText(true)}
          onCreateCodeFile={() => setShowCreateCodeFile(true)}
          onUploadFile={upload.openFilePicker}
          clipboard={clipboard.clipboard}
          onOpenInBuilder={
            contextMenu.file?.fileKind === "builder_ref"
              ? () => window.open(`/builder`, "_blank")
              : undefined
          }
          onOpenInLayers={
            contextMenu.file?.fileKind === "layer_ref"
              ? () => window.open(`/layers?workflowId=${contextMenu.file?.layerWorkflowId}`, "_blank")
              : undefined
          }
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      )}

      {/* Modals */}
      {showCreateFolder && canBrowse && (
        <CreateFolderModal
          sessionId={sessionId}
          projectId={isProjectMode ? selectedProjectId : undefined}
          organizationId={activeOrgId}
          parentPath={currentPath}
          onClose={() => setShowCreateFolder(false)}
          onSuccess={() => setShowCreateFolder(false)}
        />
      )}

      {showCreateNote && canBrowse && (
        <CreateNoteModal
          sessionId={sessionId}
          projectId={isProjectMode ? selectedProjectId : undefined}
          organizationId={activeOrgId}
          parentPath={currentPath}
          onClose={() => setShowCreateNote(false)}
          onSuccess={() => setShowCreateNote(false)}
        />
      )}

      {showCreatePlainText && canBrowse && (
        <CreatePlainTextModal
          sessionId={sessionId}
          projectId={isProjectMode ? selectedProjectId : undefined}
          organizationId={activeOrgId}
          parentPath={currentPath}
          onClose={() => setShowCreatePlainText(false)}
          onSuccess={() => setShowCreatePlainText(false)}
        />
      )}

      {showCreateCodeFile && canBrowse && (
        <CreateCodeFileModal
          sessionId={sessionId}
          projectId={isProjectMode ? selectedProjectId : undefined}
          organizationId={activeOrgId}
          parentPath={currentPath}
          onClose={() => setShowCreateCodeFile(false)}
          onSuccess={() => setShowCreateCodeFile(false)}
        />
      )}

      {showShareDialog && selectedProjectId && (
        <ShareProjectDialog
          sessionId={sessionId}
          projectId={selectedProjectId}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmationModal
          files={selection.selectedFiles}
          onConfirm={handleConfirmDelete}
          onClose={() => setShowDeleteConfirm(false)}
          isDeleting={isDeleting}
        />
      )}

      {showTagManager && (
        <FinderTagManager
          sessionId={sessionId}
          organizationId={activeOrgId}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  );
}

export default FinderWindow;
