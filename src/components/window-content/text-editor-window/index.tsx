"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  FilePenLine,
  FileText,
  Folder,
  FolderPlus,
  Plus,
  Star,
} from "lucide-react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { FinderTabs } from "../finder-window/finder-tabs";
import { EditorRouter } from "../finder-window/editors/editor-router";
import {
  CreateFileModal,
  CreateFolderModal,
  SaveAsModal,
} from "../finder-window/finder-modals";
import type { ProjectFile } from "../finder-window/finder-types";
import { getEditorType, useFinderTabs } from "../finder-window/use-finder-tabs";
import { useFinderDragDrop } from "../finder-window/use-finder-drag-drop";
import { useUnsavedChangesGuard } from "../finder-window/use-unsaved-changes-guard";
import {
  InteriorHeader,
  InteriorHelperText,
  InteriorRoot,
  InteriorSectionHeader,
  InteriorSubtitle,
  InteriorTitle,
} from "../shared/interior-primitives";
import { TEXT_EDITOR_COMMAND_EVENT, type TextEditorCommandDetail } from "./bridge";

type IndexedFile = ProjectFile & {
  lastAccessedAt?: number;
  bookmarkedAt?: number;
};

interface ExplorerNode {
  file: ProjectFile;
  children: ExplorerNode[];
}

function canOpenInTextEditor(file: ProjectFile): boolean {
  if (file.fileKind !== "virtual") return false;
  const editorType = getEditorType(file);
  return editorType === "markdown" || editorType === "code" || editorType === "note";
}

function formatRelativeTime(timestamp: number): string {
  const deltaMs = Date.now() - timestamp;
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function buildSaveAsDefaultName(name: string): string {
  const lastDotIndex = name.lastIndexOf(".");
  if (lastDotIndex <= 0) return `${name}-copy`;
  const base = name.slice(0, lastDotIndex);
  const extension = name.slice(lastDotIndex);
  return `${base}-copy${extension}`;
}

export function buildExplorerTree(files: ProjectFile[]): ExplorerNode[] {
  const nodes = new Map<string, ExplorerNode>();
  const roots: ExplorerNode[] = [];
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sorted) {
    nodes.set(file.path, { file, children: [] });
  }

  for (const file of sorted) {
    const node = nodes.get(file.path);
    if (!node) continue;

    const parentNode = nodes.get(file.parentPath);
    if (parentNode) {
      parentNode.children.push(node);
    } else if (file.parentPath === "/") {
      roots.push(node);
    }
  }

  const sortNodes = (items: ExplorerNode[]) => {
    items.sort((a, b) => {
      const folderDelta =
        Number(a.file.fileKind !== "folder") - Number(b.file.fileKind !== "folder");
      if (folderDelta !== 0) return folderDelta;
      return a.file.name.localeCompare(b.file.name);
    });
    items.forEach((item) => sortNodes(item.children));
  };

  sortNodes(roots);
  return roots;
}

function PathBreadcrumb({
  currentPath,
  onNavigate,
  rootLabel,
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
  rootLabel: string;
}) {
  const segments = currentPath === "/" ? [] : currentPath.split("/").filter(Boolean);
  let runningPath = "";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
      <button
        type="button"
        onClick={() => onNavigate("/")}
        className="rounded px-1 py-0.5"
        style={{
          color: currentPath === "/" ? "var(--finder-accent)" : "var(--neutral-gray)",
        }}
      >
        {rootLabel}
      </button>
      {segments.map((segment) => {
        runningPath += `/${segment}`;
        const path = runningPath;
        const isActive = path === currentPath;
        return (
          <Fragment key={path}>
            <span style={{ color: "var(--neutral-gray)" }}>/</span>
            <button
              type="button"
              onClick={() => onNavigate(path)}
              className="rounded px-1 py-0.5"
              style={{
                color: isActive ? "var(--finder-accent)" : "var(--neutral-gray)",
              }}
            >
              {segment}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

function ExplorerNodeRow({
  node,
  level,
  currentPath,
  activeFileId,
  onNavigate,
  onOpenFile,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDropTarget,
  collapseFolderLabel,
  expandFolderLabel,
}: {
  node: ExplorerNode;
  level: number;
  currentPath: string;
  activeFileId: string | null;
  onNavigate: (path: string) => void;
  onOpenFile: (file: ProjectFile) => void;
  onDragStart: (e: React.DragEvent, file: ProjectFile) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, targetPath: string, targetKind: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetPath: string) => Promise<void>;
  isDropTarget: (path: string) => boolean;
  collapseFolderLabel: string;
  expandFolderLabel: string;
}) {
  const [expanded, setExpanded] = useState(level < 2);
  const isFolder = node.file.fileKind === "folder";
  const hasChildren = node.children.length > 0;
  const isActive = isFolder
    ? currentPath === node.file.path
    : activeFileId === node.file._id;
  const isTextOpenable = !isFolder && canOpenInTextEditor(node.file);
  const isDropTargetNode = isFolder && isDropTarget(node.file.path);

  return (
    <div>
      <div
        className="flex items-center gap-1"
        style={{ paddingLeft: `${level * 12 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => {
            if (!hasChildren) return;
            setExpanded((value) => !value);
          }}
          className="h-5 w-5 rounded-sm"
          style={{
            color: hasChildren ? "var(--window-document-text)" : "transparent",
          }}
          aria-label={
            hasChildren
              ? (expanded ? collapseFolderLabel : expandFolderLabel)
              : undefined
          }
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )
          ) : (
            <span />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            if (isFolder) {
              onNavigate(node.file.path);
              if (hasChildren) {
                setExpanded(true);
              }
              return;
            }
            onOpenFile(node.file);
          }}
          draggable
          onDragStart={(event) => onDragStart(event, node.file)}
          onDragEnd={onDragEnd}
          onDragOver={(event) => onDragOver(event, node.file.path, node.file.fileKind)}
          onDragLeave={onDragLeave}
          onDrop={(event) => {
            void onDrop(event, node.file.path);
          }}
          className="flex flex-1 items-center gap-1 rounded-md px-1.5 py-1 text-left text-xs"
          style={{
            background: isDropTargetNode
              ? "var(--finder-selection-bg)"
              : isActive
                ? "var(--finder-selection-bg)"
                : "transparent",
            color: isActive
              ? "var(--finder-selection-text)"
              : isTextOpenable || isFolder
                ? "var(--window-document-text)"
                : "var(--neutral-gray)",
            opacity: isFolder || isTextOpenable ? 1 : 0.75,
            border: isDropTargetNode
              ? "1px solid var(--finder-selection-border)"
              : "1px solid transparent",
          }}
        >
          {isFolder ? <Folder size={13} /> : <FileText size={13} />}
          <span className="truncate">{node.file.name}</span>
        </button>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <ExplorerNodeRow
              key={child.file._id}
              node={child}
              level={level + 1}
              currentPath={currentPath}
              activeFileId={activeFileId}
              onNavigate={onNavigate}
              onOpenFile={onOpenFile}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              isDropTarget={isDropTarget}
              collapseFolderLabel={collapseFolderLabel}
              expandFolderLabel={expandFolderLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileListSectionProps {
  title: string;
  icon: ReactNode;
  files: IndexedFile[];
  onOpen: (file: ProjectFile) => void;
  emptyText: string;
  timestampKey: "lastAccessedAt" | "bookmarkedAt";
}

function FileListSection({
  title,
  icon,
  files,
  onOpen,
  emptyText,
  timestampKey,
}: FileListSectionProps) {
  return (
    <section
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--window-document-bg)",
      }}
    >
      <InteriorSectionHeader className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide">
        {icon}
        <span>{title}</span>
      </InteriorSectionHeader>

      {files.length === 0 ? (
        <InteriorHelperText>{emptyText}</InteriorHelperText>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const when = file[timestampKey];
            return (
              <button
                key={file._id}
                type="button"
                onClick={() => onOpen(file)}
                className="w-full rounded-md border px-3 py-2 text-left transition-colors"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg-elevated)",
                  color: "var(--window-document-text)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-semibold">{file.name}</span>
                  {when ? (
                    <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      {formatRelativeTime(when)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                  {file.path}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function TextEditorWindow() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { translationsMap } = useNamespaceTranslations("ui.finder");
  const activeOrgId = currentOrg?.id ?? null;
  const finderTabs = useFinderTabs();
  useUnsavedChangesGuard(finderTabs.hasDirtyTabs);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [pendingOpenFileId, setPendingOpenFileId] = useState<Id<"projectFiles"> | null>(null);
  const [saveAsDraft, setSaveAsDraft] = useState<{
    file: ProjectFile;
    content: string;
  } | null>(null);
  const tx = useCallback(
    (key: string, fallback: string): string => translationsMap?.[key] ?? fallback,
    [translationsMap],
  );

  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this component.
  const listRecentFilesQuery = (api as any).projectFileSystem.listRecentFiles;
  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this component.
  const listBookmarksQuery = (api as any).projectFileSystem.listBookmarks;
  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this component.
  const getFileTreeQuery = (api as any).projectFileSystem.getFileTree;
  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this component.
  const listFilesQuery = (api as any).projectFileSystem.listFiles;

  const recentFiles = (useQuery as any)(
    listRecentFilesQuery,
    sessionId && activeOrgId
      ? {
          sessionId,
          organizationId: activeOrgId as Id<"organizations">,
          limit: 20,
        }
      : "skip",
  ) as IndexedFile[] | undefined;

  const bookmarkedFiles = (useQuery as any)(
    listBookmarksQuery,
    sessionId && activeOrgId
      ? {
          sessionId,
          organizationId: activeOrgId as Id<"organizations">,
        }
      : "skip",
  ) as IndexedFile[] | undefined;

  const projects = useQuery(
    api.projectOntology.getProjects,
    sessionId && activeOrgId
      ? {
          sessionId,
          organizationId: activeOrgId as Id<"organizations">,
        }
      : "skip",
  );

  const projectTreeFiles = (useQuery as any)(
    getFileTreeQuery,
    sessionId && activeOrgId && selectedProjectId
      ? {
          sessionId,
          organizationId: activeOrgId as Id<"organizations">,
          projectId: selectedProjectId as Id<"objects">,
        }
      : "skip",
  ) as ProjectFile[] | undefined;

  const currentPathFiles = (useQuery as any)(
    listFilesQuery,
    sessionId && selectedProjectId
      ? {
          sessionId,
          projectId: selectedProjectId as Id<"objects">,
          parentPath: currentPath,
        }
      : "skip",
  ) as ProjectFile[] | undefined;

  const recordAccessMutation = useMutation(api.projectFileSystem.recordFileAccess);
  const dragDrop = useFinderDragDrop(sessionId || "", []);

  const openFile = useCallback(
    (file: ProjectFile) => {
      if (!canOpenInTextEditor(file)) {
        setStatusMessage(`"${file.name}" is not a supported text file.`);
        return;
      }

      setStatusMessage(null);
      if (file.projectId) {
        const fileProjectId = String(file.projectId);
        if (selectedProjectId !== fileProjectId) {
          setSelectedProjectId(fileProjectId);
        }
      }
      setCurrentPath(file.parentPath || "/");
      finderTabs.openTab(file);

      if (sessionId) {
        recordAccessMutation({
          sessionId,
          fileId: file._id as Id<"projectFiles">,
        }).catch(() => {});
      }
    },
    [finderTabs, recordAccessMutation, selectedProjectId, sessionId],
  );

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

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<TextEditorCommandDetail>).detail;
      if (!detail || detail.type !== "open-file") return;
      openFile(detail.file);
    };

    window.addEventListener(TEXT_EDITOR_COMMAND_EVENT, handleCommand as EventListener);
    return () => {
      window.removeEventListener(TEXT_EDITOR_COMMAND_EVENT, handleCommand as EventListener);
    };
  }, [openFile]);

  useEffect(() => {
    if (!projects || projects.length === 0) return;
    if (selectedProjectId && projects.some((project) => project._id === selectedProjectId)) return;
    setSelectedProjectId(String(projects[0]._id));
    setCurrentPath("/");
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!projectTreeFiles || currentPath === "/") return;
    const hasCurrentFolder = projectTreeFiles.some(
      (file) => file.fileKind === "folder" && file.path === currentPath,
    );
    if (!hasCurrentFolder) {
      setCurrentPath("/");
    }
  }, [projectTreeFiles, currentPath]);

  useEffect(() => {
    if (!pendingOpenFileId || !currentPathFiles) return;
    const createdFile = currentPathFiles.find((file) => file._id === pendingOpenFileId);
    if (!createdFile) return;
    openFile(createdFile);
    setPendingOpenFileId(null);
  }, [currentPathFiles, openFile, pendingOpenFileId]);

  const recentTextFiles = useMemo(
    () => (recentFiles ?? []).filter((file) => canOpenInTextEditor(file)),
    [recentFiles],
  );

  const bookmarkedTextFiles = useMemo(
    () => (bookmarkedFiles ?? []).filter((file) => canOpenInTextEditor(file)),
    [bookmarkedFiles],
  );

  const explorerTree = useMemo(
    () => buildExplorerTree(projectTreeFiles ?? []),
    [projectTreeFiles],
  );

  const currentPathTextFiles = useMemo(
    () => (currentPathFiles ?? []).filter((file) => canOpenInTextEditor(file)),
    [currentPathFiles],
  );

  const hasProjectSelection = Boolean(selectedProjectId);

  if (!sessionId || !activeOrgId) {
    return (
      <InteriorRoot className="flex h-full items-center justify-center p-6 text-center">
        <div className="space-y-2">
          <InteriorTitle className="text-base">Text Editor</InteriorTitle>
          <InteriorHelperText>
            {tx(
              "ui.finder.text_editor.auth.required",
              "Sign in to open and edit files.",
            )}
          </InteriorHelperText>
        </div>
      </InteriorRoot>
    );
  }

  return (
    <InteriorRoot className="flex h-full flex-col">
      <InteriorHeader className="px-4 py-3">
        <div className="flex items-center gap-2">
          <FilePenLine size={16} style={{ color: "var(--finder-accent)" }} />
          <InteriorTitle className="text-base">Text Editor</InteriorTitle>
        </div>
        <InteriorSubtitle className="mt-1 text-xs">
          {tx(
            "ui.finder.text_editor.subtitle",
            "VSCode-style text editing with project explorer, quick creation, and Finder-compatible tabs.",
          )}
        </InteriorSubtitle>
      </InteriorHeader>

      <div className="flex flex-1 min-h-0">
        <aside
          className="w-72 min-w-72 border-r flex flex-col"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
          }}
        >
          <div
            className="p-3 border-b"
            style={{ borderColor: "var(--window-document-border)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <InteriorSectionHeader className="text-xs uppercase tracking-wide">
                {tx("ui.finder.text_editor.explorer.title", "Explorer")}
              </InteriorSectionHeader>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowCreateFile(true)}
                  disabled={!hasProjectSelection}
                  className="desktop-interior-button h-7 w-7 p-0"
                  title={tx("ui.finder.text_editor.actions.new_file", "New File")}
                >
                  <Plus size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateFolder(true)}
                  disabled={!hasProjectSelection}
                  className="desktop-interior-button h-7 w-7 p-0"
                  title={tx("ui.finder.text_editor.actions.new_folder", "New Folder")}
                >
                  <FolderPlus size={13} />
                </button>
              </div>
            </div>
            <select
              value={selectedProjectId ?? ""}
              onChange={(event) => {
                setSelectedProjectId(event.target.value || null);
                setCurrentPath("/");
              }}
              className="desktop-interior-select mt-2 w-full py-1.5 pr-8 text-xs"
            >
              <option value="">{tx("ui.finder.text_editor.select_project", "Select project...")}</option>
              {projects?.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
            <PathBreadcrumb
              currentPath={currentPath}
              onNavigate={setCurrentPath}
              rootLabel={tx("ui.finder.text_editor.path.root", "root")}
            />
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {!hasProjectSelection ? (
              <InteriorHelperText className="px-3 text-xs">
                {tx(
                  "ui.finder.text_editor.project.empty",
                  "Select a project to browse and create files.",
                )}
              </InteriorHelperText>
            ) : !projectTreeFiles ? (
              <InteriorHelperText className="px-3 text-xs">
                {tx("ui.finder.text_editor.project.loading", "Loading project files...")}
              </InteriorHelperText>
            ) : explorerTree.length === 0 ? (
              <InteriorHelperText className="px-3 text-xs">
                {tx(
                  "ui.finder.text_editor.project.no_files",
                  "No files yet. Create your first text file.",
                )}
              </InteriorHelperText>
            ) : (
              explorerTree.map((node) => (
                <ExplorerNodeRow
                  key={node.file._id}
                  node={node}
                  level={0}
                  currentPath={currentPath}
                  activeFileId={finderTabs.activeTab?.file._id ?? null}
                  onNavigate={setCurrentPath}
                  onOpenFile={openFile}
                  onDragStart={dragDrop.handleDragStart}
                  onDragEnd={dragDrop.handleDragEnd}
                  onDragOver={dragDrop.handleDragOver}
                  onDragLeave={dragDrop.handleDragLeave}
                  onDrop={dragDrop.handleDrop}
                  isDropTarget={dragDrop.isDropTarget}
                  collapseFolderLabel={tx(
                    "ui.finder.text_editor.actions.collapse_folder",
                    "Collapse folder",
                  )}
                  expandFolderLabel={tx(
                    "ui.finder.text_editor.actions.expand_folder",
                    "Expand folder",
                  )}
                />
              ))
            )}
          </div>
        </aside>

        <section className="flex-1 min-w-0 flex flex-col">
          {finderTabs.tabs.length > 0 && (
            <FinderTabs
              tabs={finderTabs.tabs}
              activeTabId={finderTabs.activeTabId}
              onSelectTab={(id) => finderTabs.setActiveTab(id)}
              onCloseTab={finderTabs.closeTab}
              onBrowse={() => finderTabs.setActiveTab(null)}
              isBrowsing={finderTabs.activeTabId === null}
            />
          )}

          <div className="flex-1 min-h-0">
            {finderTabs.activeTab ? (
              <EditorRouter
                file={finderTabs.activeTab.file}
                editorType={finderTabs.activeTab.editorType}
                sessionId={sessionId}
                onDirty={() => finderTabs.markDirty(finderTabs.activeTab!.id)}
                onClean={() => finderTabs.markClean(finderTabs.activeTab!.id)}
                onSaveAs={handleEditorSaveAs}
              />
            ) : (
              <div className="h-full overflow-y-auto p-4 space-y-4">
                {statusMessage ? (
                  <div
                    className="rounded-md border px-3 py-2 text-xs"
                    style={{
                      borderColor: "var(--warning-amber)",
                      color: "var(--warning-amber)",
                      background: "var(--window-document-bg-elevated)",
                    }}
                  >
                    {statusMessage}
                  </div>
                ) : null}

                <section
                  className="rounded-lg border p-3"
                  onDragOver={(event) => dragDrop.handleContentDragOver(event, currentPath)}
                  onDrop={(event) => {
                    void dragDrop.handleContentDrop(event, currentPath);
                  }}
                  style={{
                    borderColor: dragDrop.isDropTarget(currentPath)
                      ? "var(--finder-selection-border)"
                      : "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                  }}
                >
                  <InteriorSectionHeader className="text-xs uppercase tracking-wide">
                    {tx("ui.finder.text_editor.current_folder.title", "Current Folder")}
                  </InteriorSectionHeader>
                  {currentPathTextFiles.length === 0 ? (
                    <InteriorHelperText className="mt-2">
                      {tx(
                        "ui.finder.text_editor.current_folder.empty",
                        "No text files in this folder yet.",
                      )}
                    </InteriorHelperText>
                  ) : (
                    <div className="mt-2 space-y-1">
                      {currentPathTextFiles.map((file) => (
                        <button
                          key={file._id}
                          type="button"
                          onClick={() => openFile(file)}
                          className="w-full rounded-md border px-2 py-1.5 text-left text-xs"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-bg-elevated)",
                            color: "var(--window-document-text)",
                          }}
                        >
                          {file.name}
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <div className="grid gap-4 lg:grid-cols-2">
                  <FileListSection
                    title="Recent"
                    icon={<Clock3 size={14} style={{ color: "var(--finder-accent)" }} />}
                    files={recentTextFiles}
                    onOpen={openFile}
                    emptyText="No recently opened text files."
                    timestampKey="lastAccessedAt"
                  />
                  <FileListSection
                    title="Favorites"
                    icon={<Star size={14} style={{ color: "var(--warning-amber)" }} />}
                    files={bookmarkedTextFiles}
                    onOpen={openFile}
                    emptyText="No favorited text files yet."
                    timestampKey="bookmarkedAt"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {showCreateFolder && hasProjectSelection && (
        <CreateFolderModal
          sessionId={sessionId}
          projectId={selectedProjectId}
          organizationId={activeOrgId ?? undefined}
          parentPath={currentPath}
          onClose={() => setShowCreateFolder(false)}
          onSuccess={() => setShowCreateFolder(false)}
        />
      )}

      {showCreateFile && hasProjectSelection && (
        <CreateFileModal
          sessionId={sessionId}
          projectId={selectedProjectId}
          organizationId={activeOrgId ?? undefined}
          parentPath={currentPath}
          onClose={() => setShowCreateFile(false)}
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
          organizationId={activeOrgId ?? undefined}
          defaultParentPath={saveAsDraft.file.parentPath || currentPath}
          defaultFileName={buildSaveAsDefaultName(saveAsDraft.file.name)}
          initialContent={saveAsDraft.content}
          fallbackMimeType={saveAsDraft.file.mimeType}
          fallbackLanguage={saveAsDraft.file.language}
          onClose={() => setSaveAsDraft(null)}
          onSuccess={(createdFileId, parentPath) => {
            if (saveAsDraft.file.projectId) {
              setSelectedProjectId(String(saveAsDraft.file.projectId));
            }
            setCurrentPath(parentPath);
            setPendingOpenFileId(createdFileId);
            setSaveAsDraft(null);
          }}
        />
      )}
    </InteriorRoot>
  );
}

export default TextEditorWindow;
