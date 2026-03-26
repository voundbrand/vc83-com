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
import { useQuery, useMutation, useConvex } from "convex/react";
import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { FinderSidebar } from "./finder-sidebar";
import { FinderToolbar, type ViewMode, type SortOption } from "./finder-toolbar";
import { FinderContent } from "./finder-content";
import { FinderPreview } from "./finder-preview";
import {
  CreateFolderModal,
  CreateFileModal,
  SaveAsModal,
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
import { getEditorType, useFinderTabs } from "./use-finder-tabs";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";
import {
  SHELL_MOTION,
  buildShellTransition,
  useReducedMotionPreference,
} from "@/lib/motion";
import { requestTextEditorWindow } from "../text-editor-window/bridge";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useNotification } from "@/hooks/use-notification";
import { AIChatWindow } from "../ai-chat-window";
import { getVoiceAssistantWindowContract } from "../ai-chat-window/voice-assistant-contract";
import {
  KNOWLEDGE_CONTEXT_CONTRACT_VERSION,
  encodeKnowledgeContextOpenContext,
  type KnowledgeContextKickoffPayload,
  type KnowledgeContextReferencePayload,
} from "@/lib/ai/knowledge-context-contract";
import type { ProjectFile, FinderMode, ContextMenuState } from "./finder-types";

function buildSaveAsDefaultName(name: string): string {
  const lastDotIndex = name.lastIndexOf(".");
  if (lastDotIndex <= 0) return `${name}-copy`;
  const base = name.slice(0, lastDotIndex);
  const extension = name.slice(lastDotIndex);
  return `${base}-copy${extension}`;
}

const FINDER_SIDEBAR_WIDTH_STORAGE_KEY = "finder_sidebar_width";
const FINDER_SIDEBAR_DEFAULT_WIDTH = 224;
const FINDER_SIDEBAR_MIN_WIDTH = 200;
const FINDER_SIDEBAR_MAX_WIDTH = 520;
const KNOWLEDGE_CONTEXT_SELECTION_LIMIT = 8;
const KNOWLEDGE_CONTEXT_TOTAL_CONTENT_CHAR_LIMIT = 36000;
const KNOWLEDGE_CONTEXT_REFERENCE_CONTENT_CHAR_LIMIT = 8000;

type ResolvedFileContent = {
  type: "virtual" | "uploaded" | "media" | "builder_ref" | "layer_ref" | "unknown";
  content?: string;
  url?: string | null;
  mimeType?: string;
  sizeBytes?: number;
};

function clampSidebarWidth(width: number): number {
  return Math.min(Math.max(width, FINDER_SIDEBAR_MIN_WIDTH), FINDER_SIDEBAR_MAX_WIDTH);
}

function getLowerExtension(name: string): string {
  const lastDot = name.lastIndexOf(".");
  if (lastDot < 0) return "";
  return name.slice(lastDot + 1).toLowerCase();
}

function shouldFetchTextPreview(file: ProjectFile, resolved: ResolvedFileContent): boolean {
  if (!resolved.url) return false;
  const extension = getLowerExtension(file.name || "");
  const mimeType = (file.mimeType || resolved.mimeType || "").toLowerCase();
  if (mimeType.startsWith("text/")) return true;
  if (mimeType.includes("json")) return true;
  if (mimeType.includes("markdown")) return true;
  if (extension === "txt" || extension === "md" || extension === "mdx" || extension === "markdown") return true;
  return false;
}

function shouldParseDocxPreview(file: ProjectFile, resolved: ResolvedFileContent): boolean {
  if (!resolved.url) return false;
  const extension = getLowerExtension(file.name || "");
  const mimeType = (file.mimeType || resolved.mimeType || "").toLowerCase();
  return (
    extension === "docx"
    || mimeType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  );
}

async function extractDocxPreviewFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not read DOCX file (${response.status}).`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const mammoth = await import("mammoth");
  const result = await (mammoth as { extractRawText: (args: { arrayBuffer: ArrayBuffer }) => Promise<{ value?: string }> }).extractRawText({ arrayBuffer });
  return typeof result?.value === "string" ? result.value : "";
}

function buildKnowledgeReferenceUrl(
  file: ProjectFile,
  resolved: ResolvedFileContent
): string {
  if (resolved.url && typeof resolved.url === "string" && resolved.url.trim().length > 0) {
    return resolved.url;
  }
  return `finder://projectFiles/${String(file._id)}`;
}

function clipKnowledgeContent(content: string, limit: number): string {
  if (content.length <= limit) {
    return content;
  }
  return `${content.slice(0, limit)}\n...[truncated]`;
}

export function FinderWindow() {
  // Auth
  const currentOrg = useCurrentOrganization();
  const activeOrgId = currentOrg?.id || null;
  const { sessionId } = useAuth();
  const convex = useConvex();
  const { openWindow } = useWindowManager();
  const notification = useNotification();

  // Navigation state
  const [mode, setMode] = useState<FinderMode>("project");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("/");

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(FINDER_SIDEBAR_DEFAULT_WIDTH);
  const [hasSidebarWidthLoaded, setHasSidebarWidthLoaded] = useState(false);
  const [isOpeningKnowledgeAssistant, setIsOpeningKnowledgeAssistant] = useState(false);
  const prefersReducedMotion = useReducedMotionPreference();

  // Preview panel
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [previewWidth, setPreviewWidth] = useState(320);
  const isSidebarResizing = useRef(false);
  const sidebarCleanupRef = useRef<(() => void) | null>(null);
  const isResizing = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Container ref for keyboard scoping
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [createFileTarget, setCreateFileTarget] = useState<"finder" | "text-editor">("finder");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<ProjectFile[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingOpenFileId, setPendingOpenFileId] = useState<Id<"projectFiles"> | null>(null);
  const [saveAsDraft, setSaveAsDraft] = useState<{
    file: ProjectFile;
    content: string;
  } | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Inline rename
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);

  // Org folders initialization flag
  const [orgFoldersInitialized, setOrgFoldersInitialized] = useState(false);

  // Pending invites count
  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this component.
  const listPendingInvitesQuery = (api as any).projectSharing.listPendingInvites;
  const pendingInvites = (useQuery as any)(
    listPendingInvitesQuery,
    sessionId ? { sessionId } : "skip"
  ) as unknown[] | undefined;

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
  const dragDrop = useFinderDragDrop(sessionId || "", selection.selectedFiles);
  const finderTabs = useFinderTabs();
  useUnsavedChangesGuard(finderTabs.hasDirtyTabs);

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
  const canOpenInTextEditor = useCallback((file: ProjectFile) => {
    if (file.fileKind !== "virtual") return false;
    const editorType = getEditorType(file);
    return editorType === "markdown" || editorType === "code" || editorType === "note";
  }, []);

  const openCreateFileModal = useCallback((target: "finder" | "text-editor" = "finder") => {
    setCreateFileTarget(target);
    setShowCreateFile(true);
  }, []);

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

  const handleOpenInTextEditor = useCallback((file: ProjectFile) => {
    if (!canOpenInTextEditor(file)) return;
    requestTextEditorWindow({ file });
  }, [canOpenInTextEditor]);

  const handleEditorSaveAs = useCallback(
    (content: string) => {
      if (!finderTabs.activeTab || finderTabs.activeTab.file.fileKind !== "virtual") return;
      setSaveAsDraft({
        file: finderTabs.activeTab.file,
        content,
      });
    },
    [finderTabs.activeTab],
  );

  // Open newly created files as soon as they appear in the current folder query.
  useEffect(() => {
    if (!pendingOpenFileId || !rawFiles) return;
    const createdFile = (rawFiles as ProjectFile[]).find((file) => file._id === pendingOpenFileId);
    if (!createdFile) return;

    if (createFileTarget === "text-editor" && canOpenInTextEditor(createdFile)) {
      requestTextEditorWindow({ file: createdFile });
    } else {
      finderTabs.openTab(createdFile);
      setPreviewFile(createdFile);
    }

    setCreateFileTarget("finder");
    selection.clearSelection();
    setPendingOpenFileId(null);
  }, [pendingOpenFileId, rawFiles, finderTabs, selection, createFileTarget, canOpenInTextEditor]);

  const handleDelete = useCallback(() => {
    if (selection.selectedFiles.length === 0) return;
    setDeleteTargets(selection.selectedFiles);
    setShowDeleteConfirm(true);
  }, [selection.selectedFiles]);

  const handleDeleteFile = useCallback((file: ProjectFile) => {
    setDeleteTargets([file]);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const targets = deleteTargets.length > 0 ? deleteTargets : selection.selectedFiles;
    if (!sessionId || targets.length === 0) return;
    setIsDeleting(true);
    try {
      await deleteFilesMutation({
        sessionId,
        fileIds: targets.map((f) => f._id as Id<"projectFiles">),
      });
      selection.clearSelection();
      setPreviewFile(null);
      setDeleteTargets([]);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  }, [sessionId, deleteTargets, selection, deleteFilesMutation]);

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
      });
    } catch (err) {
      console.error("Bookmark toggle failed:", err);
    }
  }, [sessionId, activeOrgId, selection.selectedFiles, toggleBookmarkMutation]);

  const handleOpenFileFromSidebar = useCallback((file: ProjectFile) => {
    setPreviewFile(file);
    handleFileOpen(file);
  }, [handleFileOpen]);

  const handleEditFileFromPreview = useCallback((file: ProjectFile) => {
    if (!canOpenInTextEditor(file)) return;
    handleFileOpen(file);
  }, [canOpenInTextEditor, handleFileOpen]);

  const collectKnowledgeContextReferences = useCallback(
    async (files: ProjectFile[]): Promise<KnowledgeContextReferencePayload[]> => {
      if (!sessionId) {
        return [];
      }

      const candidates = files
        .filter((file) => file.fileKind !== "folder")
        .slice(0, KNOWLEDGE_CONTEXT_SELECTION_LIMIT);
      const references: KnowledgeContextReferencePayload[] = [];
      let usedChars = 0;

      for (const file of candidates) {
        const reference: KnowledgeContextReferencePayload = {
          fileId: String(file._id),
          name: file.name,
          path: file.path,
          fileKind: file.fileKind,
          mimeType: file.mimeType,
          language: file.language,
          source: file.source,
          sizeBytes: file.sizeBytes,
          status: "error",
          error: "No readable preview available for this file type.",
        };

        try {
          const resolved = await (convex as {
            query: (queryRef: unknown, args: unknown) => Promise<unknown>;
          }).query(api.projectFileSystem.getFileContent, {
            sessionId,
            fileId: file._id,
          }) as ResolvedFileContent;

          reference.retrievalUrl = buildKnowledgeReferenceUrl(file, resolved);

          let rawContent = "";
          if (resolved.type === "virtual" && typeof resolved.content === "string") {
            rawContent = resolved.content;
          } else if (shouldFetchTextPreview(file, resolved)) {
            const response = await fetch(String(resolved.url));
            if (!response.ok) {
              throw new Error(`Could not read file preview (${response.status}).`);
            }
            rawContent = await response.text();
          } else if (shouldParseDocxPreview(file, resolved)) {
            rawContent = await extractDocxPreviewFromUrl(String(resolved.url));
          }

          const remainingChars = Math.max(0, KNOWLEDGE_CONTEXT_TOTAL_CONTENT_CHAR_LIMIT - usedChars);
          if (rawContent.trim().length > 0 && remainingChars > 0) {
            const clipped = clipKnowledgeContent(
              rawContent.trim(),
              Math.min(KNOWLEDGE_CONTEXT_REFERENCE_CONTENT_CHAR_LIMIT, remainingChars)
            );
            reference.status = "ready";
            reference.content = clipped;
            reference.error = undefined;
            usedChars += clipped.length;
          } else if (rawContent.trim().length > 0) {
            reference.status = "error";
            reference.error = "Context size limit reached; reduce selected files.";
          } else if (resolved.type === "uploaded" || resolved.type === "media") {
            reference.error = "Binary document selected without text preview support.";
          } else if (resolved.type === "builder_ref" || resolved.type === "layer_ref") {
            reference.error = "Reference pointer selected; no text preview available.";
          }
        } catch (error) {
          reference.status = "error";
          reference.error = error instanceof Error ? error.message : "Failed to resolve file preview.";
        }

        references.push(reference);
      }

      return references;
    },
    [convex, sessionId]
  );

  const knowledgeContextSelection = useMemo(() => {
    const dedupe = new Map<string, ProjectFile>();
    for (const file of selection.selectedFiles) {
      if (file.fileKind === "folder") continue;
      dedupe.set(String(file._id), file);
    }
    if (dedupe.size === 0 && previewFile && previewFile.fileKind !== "folder") {
      dedupe.set(String(previewFile._id), previewFile);
    }
    return Array.from(dedupe.values()).slice(0, KNOWLEDGE_CONTEXT_SELECTION_LIMIT);
  }, [previewFile, selection.selectedFiles]);

  const knowledgeAssistScopeLabel = useMemo(() => {
    if (mode === "project") {
      return "scope:project";
    }
    if (mode === "org") {
      return "scope:org";
    }
    return "scope:shared";
  }, [mode]);

  const knowledgeAssistAuthorityLabel = useMemo(() => {
    if (mode === "project") {
      return "authority:project_read";
    }
    return "authority:org_read";
  }, [mode]);

  const knowledgeAssistCitationQualityLabel = useMemo(() => {
    if (knowledgeContextSelection.length === 0) {
      return "citation:pending_selection";
    }
    const hasNonTextLikelyFile = knowledgeContextSelection.some((file) =>
      file.fileKind !== "virtual"
      || (file.mimeType ? !file.mimeType.toLowerCase().startsWith("text/") : false)
    );
    return hasNonTextLikelyFile
      ? "citation:mixed_preview"
      : "citation:advisory_preview";
  }, [knowledgeContextSelection]);

  const handleLaunchKnowledgeAssistant = useCallback(async () => {
    if (!sessionId || !activeOrgId) {
      return;
    }

    if (knowledgeContextSelection.length === 0) {
      notification.info("No documents selected", "Select at least one file in Finder, then open AI context.");
      return;
    }

    setIsOpeningKnowledgeAssistant(true);
    try {
      const references = await collectKnowledgeContextReferences(knowledgeContextSelection);
      if (references.length === 0) {
        notification.error("No eligible files", "The current selection does not include readable files.");
        return;
      }
      const readyReferenceCount = references.filter((reference) => reference.status === "ready").length;
      const citationQualityLabel =
        readyReferenceCount === 0
          ? "citation:unreadable_selection"
          : readyReferenceCount < references.length
            ? "citation:mixed_preview"
            : "citation:advisory_preview";

      const payload: KnowledgeContextKickoffPayload = {
        contractVersion: KNOWLEDGE_CONTEXT_CONTRACT_VERSION,
        contextSource: "finder",
        organizationId: String(activeOrgId),
        projectId: selectedProjectId || undefined,
        projectScope: mode === "project" ? "project" : "org",
        scopeLabel: knowledgeAssistScopeLabel,
        authorityLabel: knowledgeAssistAuthorityLabel,
        citationQualityLabel,
        requestedAt: Date.now(),
        referenceCount: references.length,
        references,
      };
      const openContext = encodeKnowledgeContextOpenContext(payload);
      const aiAssistantWindowContract = getVoiceAssistantWindowContract("ai-assistant");
      const sourceOrganizationId = String(activeOrgId);

      openWindow(
        aiAssistantWindowContract.windowId,
        aiAssistantWindowContract.title,
        <AIChatWindow
          initialLayoutMode="slick"
          initialPanel="knowledge-context"
          openContext={openContext}
          sourceSessionId={sessionId}
          sourceOrganizationId={sourceOrganizationId}
        />,
        aiAssistantWindowContract.position,
        aiAssistantWindowContract.size,
        aiAssistantWindowContract.titleKey,
        aiAssistantWindowContract.iconId,
        {
          openContext,
          initialLayoutMode: "slick",
          initialPanel: "knowledge-context",
          sourceSessionId: sessionId,
          sourceOrganizationId,
        }
      );

      if (!references.some((reference) => reference.status === "ready")) {
        notification.info(
          "Limited context",
          "Selected files were attached as references, but no inline text preview could be extracted."
        );
      }
    } catch (error) {
      notification.error(
        "Knowledge context failed",
        error instanceof Error ? error.message : "Could not build AI knowledge context."
      );
    } finally {
      setIsOpeningKnowledgeAssistant(false);
    }
  }, [
    activeOrgId,
    collectKnowledgeContextReferences,
    knowledgeContextSelection,
    mode,
    notification,
    openWindow,
    selectedProjectId,
    sessionId,
    knowledgeAssistScopeLabel,
    knowledgeAssistAuthorityLabel,
  ]);

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
    onNewFile: () => openCreateFileModal("finder"),
    onNewFolder: () => setShowCreateFolder(true),
    onFocusSearch: () => searchInputRef.current?.focus(),
    onCloseActiveTab: () => {
      if (finderTabs.activeTabId) {
        finderTabs.closeTab(finderTabs.activeTabId);
      }
    },
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

  const handleSidebarResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isSidebarResizing.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isSidebarResizing.current) return;
        const delta = moveEvent.clientX - startX;
        const newWidth = clampSidebarWidth(startWidth + delta);
        setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        isSidebarResizing.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        sidebarCleanupRef.current = null;
      };

      sidebarCleanupRef.current = () => {
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
    [sidebarWidth]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedWidth = window.localStorage.getItem(FINDER_SIDEBAR_WIDTH_STORAGE_KEY);
      if (!storedWidth) {
        setHasSidebarWidthLoaded(true);
        return;
      }

      const parsedWidth = Number(storedWidth);
      if (!Number.isFinite(parsedWidth)) {
        setHasSidebarWidthLoaded(true);
        return;
      }

      setSidebarWidth(clampSidebarWidth(parsedWidth));
      setHasSidebarWidthLoaded(true);
    } catch {
      setHasSidebarWidthLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasSidebarWidthLoaded) return;

    try {
      window.localStorage.setItem(
        FINDER_SIDEBAR_WIDTH_STORAGE_KEY,
        String(clampSidebarWidth(sidebarWidth))
      );
    } catch {
      // Ignore localStorage write failures (private mode / denied storage).
    }
  }, [sidebarWidth, hasSidebarWidthLoaded]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      sidebarCleanupRef.current?.();
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
      className="h-full flex outline-none finder-shell"
    >
      {/* Left Sidebar */}
      <div
        className="flex-shrink-0 border-r-2 flex flex-col finder-sidebar-divider"
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          transition: isSidebarResizing.current
            ? "none"
            : buildShellTransition(
              "width",
              SHELL_MOTION.durationMs.fast,
              prefersReducedMotion,
            ),
        }}
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

      {/* Sidebar Resize Handle */}
      <div
        onMouseDown={handleSidebarResizeStart}
        className="w-1.5 flex-shrink-0 cursor-col-resize group relative finder-resize-handle"
      >
        <div className="absolute inset-y-0 -left-1 -right-1 z-10" title="Drag to resize sidebar" />
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100"
          style={{
            transition: buildShellTransition(
              "opacity",
              SHELL_MOTION.durationMs.fast,
              prefersReducedMotion,
            ),
          }}
        >
          <div className="w-1 h-1 rounded-full finder-resize-handle-dot" />
          <div className="w-1 h-1 rounded-full finder-resize-handle-dot" />
          <div className="w-1 h-1 rounded-full finder-resize-handle-dot" />
        </div>
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
            onCreateFile={() => openCreateFileModal("finder")}
            onUploadFile={upload.openFilePicker}
            onShareProject={isProjectMode ? () => setShowShareDialog(true) : undefined}
            onOpenTagManager={() => setShowTagManager(true)}
            onLaunchKnowledgeAssist={handleLaunchKnowledgeAssistant}
            knowledgeAssistDisabled={
              isOpeningKnowledgeAssistant
              || knowledgeContextSelection.length === 0
            }
            knowledgeAssistLabel={
              isOpeningKnowledgeAssistant
                ? "Preparing..."
                : knowledgeContextSelection.length > 1
                  ? `Ask AI (${knowledgeContextSelection.length})`
                  : "Ask AI"
            }
            knowledgeAssistScopeLabel={knowledgeAssistScopeLabel}
            knowledgeAssistAuthorityLabel={knowledgeAssistAuthorityLabel}
            knowledgeAssistCitationQualityLabel={knowledgeAssistCitationQualityLabel}
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
                  onSaveAs={handleEditorSaveAs}
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
                      className="w-1.5 flex-shrink-0 cursor-col-resize group relative finder-resize-handle"
                    >
                      <div className="absolute inset-y-0 -left-1 -right-1 z-10" title="Drag to resize" />
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100"
                        style={{
                          transition: buildShellTransition(
                            "opacity",
                            SHELL_MOTION.durationMs.fast,
                            prefersReducedMotion,
                          ),
                        }}
                      >
                        <div className="w-1 h-1 rounded-full finder-resize-handle-dot" />
                        <div className="w-1 h-1 rounded-full finder-resize-handle-dot" />
                        <div className="w-1 h-1 rounded-full finder-resize-handle-dot" />
                      </div>
                    </div>
                    <div
                      className="flex-shrink-0"
                      style={{
                        width: previewWidth,
                        transition: isResizing.current
                          ? "none"
                          : buildShellTransition(
                            "width",
                            SHELL_MOTION.durationMs.fast,
                            prefersReducedMotion,
                          ),
                      }}
                    >
                      <FinderPreview
                        file={previewFile}
                        onClose={() => setPreviewFile(null)}
                        sessionId={sessionId}
                        onEditFile={
                          canOpenInTextEditor(previewFile)
                            ? () => handleEditFileFromPreview(previewFile)
                            : undefined
                        }
                        onDeleteFile={() => handleDeleteFile(previewFile)}
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
          onCreateFile={() => openCreateFileModal("finder")}
          onCreateFileInTextEditor={() => openCreateFileModal("text-editor")}
          onUploadFile={upload.openFilePicker}
          clipboard={clipboard.clipboard}
          onOpenInTextEditor={
            contextMenu.file && canOpenInTextEditor(contextMenu.file)
              ? () => handleOpenInTextEditor(contextMenu.file as ProjectFile)
              : undefined
          }
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

      {showCreateFile && canBrowse && (
        <CreateFileModal
          sessionId={sessionId}
          projectId={isProjectMode ? selectedProjectId : undefined}
          organizationId={activeOrgId}
          parentPath={currentPath}
          onClose={() => {
            setShowCreateFile(false);
            setCreateFileTarget("finder");
          }}
          onSuccess={(createdFileId) => {
            setShowCreateFile(false);
            setPendingOpenFileId(createdFileId);
          }}
        />
      )}

      {saveAsDraft && (
        <SaveAsModal
          sessionId={sessionId}
          projectId={saveAsDraft.file.projectId ? String(saveAsDraft.file.projectId) : undefined}
          organizationId={activeOrgId}
          defaultParentPath={saveAsDraft.file.parentPath || currentPath}
          defaultFileName={buildSaveAsDefaultName(saveAsDraft.file.name)}
          initialContent={saveAsDraft.content}
          fallbackMimeType={saveAsDraft.file.mimeType}
          fallbackLanguage={saveAsDraft.file.language}
          onClose={() => setSaveAsDraft(null)}
          onSuccess={(createdFileId, parentPath) => {
            setCreateFileTarget("finder");
            if (saveAsDraft.file.projectId) {
              setMode("project");
              setSelectedProjectId(String(saveAsDraft.file.projectId));
            } else {
              setMode("org");
              setSelectedProjectId(null);
            }
            setCurrentPath(parentPath);
            setPendingOpenFileId(createdFileId);
            setSaveAsDraft(null);
          }}
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
          files={deleteTargets.length > 0 ? deleteTargets : selection.selectedFiles}
          onConfirm={handleConfirmDelete}
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeleteTargets([]);
          }}
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
