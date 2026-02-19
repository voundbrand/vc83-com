"use client";

/**
 * FINDER MODALS - Create folder, create file, delete confirmation
 */

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { FolderPlus, FileText, Save, X, Trash2 } from "lucide-react";
import {
  applySuggestedExtension,
  FILE_EXTENSION_SUGGESTIONS,
  getSuggestedStarterContent,
  inferNewFileType,
} from "./new-file-flow";
import { getNormalizedExtension } from "./file-type-registry";

function normalizeFolderPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  let normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  normalized = normalized.replace(/\/+/g, "/");
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

// ============================================================================
// CREATE FOLDER MODAL
// ============================================================================

interface CreateFolderModalProps {
  sessionId: string;
  projectId?: string | null;
  organizationId?: string;
  parentPath: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateFolderModal({
  sessionId,
  projectId,
  organizationId,
  parentPath,
  onClose,
  onSuccess,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // @ts-ignore TS2589: Convex generated mutation types can exceed instantiation depth in this component.
  const createFolder = useMutation((api as any).projectFileSystem.createFolder);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const args: Record<string, unknown> = {
        sessionId,
        parentPath,
        name: name.trim(),
      };
      if (projectId) args.projectId = projectId as Id<"objects">;
      if (organizationId) args.organizationId = organizationId as Id<"organizations">;

      await createFolder(args);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <FolderPlus size={18} style={{ color: "var(--primary)" }} />
        <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
          New Folder
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
            Folder Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="My Folder"
            autoFocus
            className="desktop-interior-input w-full text-xs"
          />
        </div>

        <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          Location: {parentPath === "/" ? (projectId ? "Project Root" : "Organization Root") : parentPath}
        </p>

        {error && (
          <p className="text-xs" style={{ color: "var(--error-red)" }}>
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="desktop-interior-button px-4 py-2 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="desktop-interior-button desktop-interior-button-primary px-4 py-2 text-xs font-bold"
            style={{
              opacity: isCreating || !name.trim() ? 0.5 : 1,
            }}
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ============================================================================
// CREATE FILE MODAL
// ============================================================================

interface CreateFileModalProps {
  sessionId: string;
  projectId?: string | null;
  organizationId?: string;
  parentPath: string;
  onClose: () => void;
  onSuccess: (createdFileId: Id<"projectFiles">) => void;
}

export function CreateFileModal({
  sessionId,
  projectId,
  organizationId,
  parentPath,
  onClose,
  onSuccess,
}: CreateFileModalProps) {
  const [name, setName] = useState("");
  const [includeStarterContent, setIncludeStarterContent] = useState(false);
  const [starterContent, setStarterContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // @ts-ignore TS2589: Convex generated mutation types can exceed instantiation depth in this component.
  const createVirtualFile = useMutation((api as any).projectFileSystem.createVirtualFile);

  const trimmedName = name.trim();
  const extension = getNormalizedExtension(trimmedName);
  const inferredType = useMemo(() => inferNewFileType(trimmedName), [trimmedName]);

  const suggestedStarterContent = useMemo(
    () => getSuggestedStarterContent(trimmedName),
    [trimmedName]
  );

  const handleApplySuggestedExtension = (suggestedExtension: string) => {
    setName((currentName) => applySuggestedExtension(currentName, suggestedExtension));
  };

  const handleStarterContentToggle = (enabled: boolean) => {
    setIncludeStarterContent(enabled);
    if (enabled && !starterContent) {
      setStarterContent(suggestedStarterContent);
    }
  };

  const handleCreate = async () => {
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const args: Record<string, unknown> = {
        sessionId,
        parentPath,
        name: trimmedName,
        content: includeStarterContent ? (starterContent || suggestedStarterContent) : "",
        mimeType: inferredType.mimeType,
        language: inferredType.language,
      };
      if (projectId) args.projectId = projectId as Id<"objects">;
      if (organizationId) args.organizationId = organizationId as Id<"organizations">;

      const createdFileId = await createVirtualFile(args);
      onSuccess(createdFileId as Id<"projectFiles">);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <FileText size={18} style={{ color: "var(--accent-color)" }} />
        <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
          New File
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
            File Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="untitled.md"
            autoFocus
            className="desktop-interior-input w-full text-xs"
          />
        </div>

        <div>
          <p className="text-[10px] mb-1" style={{ color: "var(--neutral-gray)" }}>
            Quick extension suggestions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FILE_EXTENSION_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleApplySuggestedExtension(suggestion)}
                className="desktop-interior-button px-2 py-1 text-[10px]"
              >
                .{suggestion}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] px-2 py-2 rounded border" style={{ color: "var(--neutral-gray)", borderColor: "var(--window-document-border)" }}>
          {extension
            ? `Detected .${inferredType.extension} -> ${inferredType.language} (${inferredType.mimeType})${inferredType.source === "fallback" ? " [fallback]" : ""}`
            : "No extension provided. Defaults to plain text metadata until you add one."}
        </p>

        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--win95-text)" }}>
          <input
            type="checkbox"
            checked={includeStarterContent}
            onChange={(e) => handleStarterContentToggle(e.target.checked)}
          />
          Include starter content
        </label>

        {includeStarterContent && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                Starter Content
              </label>
              <button
                type="button"
                onClick={() => setStarterContent(suggestedStarterContent)}
                className="desktop-interior-button px-2 py-1 text-[10px]"
              >
                Use Suggested
              </button>
            </div>
            <textarea
              value={starterContent}
              onChange={(e) => setStarterContent(e.target.value)}
              placeholder={suggestedStarterContent || "Optional starter content"}
              rows={6}
              className="desktop-interior-textarea w-full text-xs resize-none font-mono min-h-[9rem]"
            />
          </div>
        )}

        <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          Location: {parentPath === "/" ? (projectId ? "Project Root" : "Organization Root") : parentPath}
        </p>

        {error && (
          <p className="text-xs" style={{ color: "var(--error-red)" }}>
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="desktop-interior-button px-4 py-2 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !trimmedName}
            className="desktop-interior-button desktop-interior-button-primary px-4 py-2 text-xs font-bold"
            style={{
              opacity: isCreating || !trimmedName ? 0.5 : 1,
            }}
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ============================================================================
// SAVE AS MODAL
// ============================================================================

interface SaveAsModalProps {
  sessionId: string;
  projectId?: string | null;
  organizationId?: string;
  defaultParentPath: string;
  defaultFileName: string;
  initialContent: string;
  fallbackMimeType?: string;
  fallbackLanguage?: string;
  onClose: () => void;
  onSuccess: (createdFileId: Id<"projectFiles">, parentPath: string) => void;
}

export function SaveAsModal({
  sessionId,
  projectId,
  organizationId,
  defaultParentPath,
  defaultFileName,
  initialContent,
  fallbackMimeType,
  fallbackLanguage,
  onClose,
  onSuccess,
}: SaveAsModalProps) {
  const { translationsMap } = useNamespaceTranslations("ui.finder");
  const [name, setName] = useState(defaultFileName);
  const [parentPathInput, setParentPathInput] = useState(defaultParentPath);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const tx = (key: string, fallback: string): string => translationsMap?.[key] ?? fallback;

  // @ts-ignore TS2589: Convex generated mutation types can exceed instantiation depth in this component.
  const createVirtualFile = useMutation((api as any).projectFileSystem.createVirtualFile);

  const trimmedName = name.trim();
  const normalizedParentPath = normalizeFolderPath(parentPathInput);
  const extension = getNormalizedExtension(trimmedName);
  const inferredType = useMemo(() => inferNewFileType(trimmedName), [trimmedName]);

  const effectiveMimeType = extension
    ? inferredType.mimeType
    : fallbackMimeType || inferredType.mimeType;
  const effectiveLanguage = extension
    ? inferredType.language
    : fallbackLanguage || inferredType.language;

  const handleSaveAs = async () => {
    if (!trimmedName) {
      setError("File name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const args: Record<string, unknown> = {
        sessionId,
        parentPath: normalizedParentPath,
        name: trimmedName,
        content: initialContent,
        mimeType: effectiveMimeType,
        language: effectiveLanguage,
      };
      if (projectId) args.projectId = projectId as Id<"objects">;
      if (organizationId) args.organizationId = organizationId as Id<"organizations">;

      const createdFileId = await createVirtualFile(args);
      onSuccess(createdFileId as Id<"projectFiles">, normalizedParentPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save file");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <Save size={18} style={{ color: "var(--finder-accent)" }} />
        <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
          {tx("ui.finder.save_as.title", "Save As")}
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
            File Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="desktop-interior-input w-full text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSaveAs();
              }
            }}
          />
        </div>

        <div>
          <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
            {tx("ui.finder.save_as.folder_path_label", "Folder Path")}
          </label>
          <input
            type="text"
            value={parentPathInput}
            onChange={(e) => setParentPathInput(e.target.value)}
            className="desktop-interior-input w-full text-xs"
            placeholder="/"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSaveAs();
              }
            }}
          />
        </div>

        <p
          className="text-[10px] px-2 py-2 rounded border"
          style={{
            color: "var(--neutral-gray)",
            borderColor: "var(--window-document-border)",
          }}
        >
          {extension
            ? `Detected .${inferredType.extension} -> ${inferredType.language} (${inferredType.mimeType})${inferredType.source === "fallback" ? " [fallback]" : ""}`
            : `${tx("ui.finder.save_as.no_extension_prefix", "No extension provided. Using")} ${effectiveLanguage} (${effectiveMimeType}).`}
        </p>

        <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          {tx("ui.finder.save_as.destination_label", "Destination:")}{" "}
          {normalizedParentPath === "/"
            ? tx("ui.finder.save_as.destination_root", "Root")
            : normalizedParentPath}
        </p>

        {error && (
          <p className="text-xs" style={{ color: "var(--error-red)" }}>
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="desktop-interior-button px-4 py-2 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAs}
            disabled={isSaving || !trimmedName}
            className="desktop-interior-button desktop-interior-button-primary px-4 py-2 text-xs font-bold"
            style={{ opacity: isSaving || !trimmedName ? 0.5 : 1 }}
          >
            {isSaving
              ? tx("ui.finder.save_as.saving", "Saving...")
              : tx("ui.finder.save_as.save_copy", "Save Copy")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ============================================================================
// DELETE CONFIRMATION MODAL (Move to Trash)
// ============================================================================

interface DeleteConfirmationModalProps {
  files: Array<{ _id: string; name: string; fileKind: string; path: string }>;
  onConfirm: () => void;
  onClose: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmationModal({
  files,
  onConfirm,
  onClose,
  isDeleting,
}: DeleteConfirmationModalProps) {
  const folderCount = files.filter((f) => f.fileKind === "folder").length;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <Trash2 size={18} style={{ color: "var(--warning-amber)" }} />
        <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
          Move to Trash
        </h3>
      </div>

      <div className="space-y-3">
        <p className="text-xs" style={{ color: "var(--win95-text)" }}>
          Are you sure you want to move{" "}
          {files.length === 1 ? (
            <strong>{files[0].name}</strong>
          ) : (
            <>
              <strong>{files.length} items</strong>
              {folderCount > 0 && ` (${folderCount} folder${folderCount > 1 ? "s" : ""})`}
            </>
          )}
          {" "}to the Trash?
        </p>

        <p
          className="text-xs px-3 py-2 rounded border"
          style={{
            color: "var(--neutral-gray)",
            borderColor: "var(--window-document-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          Items in Trash are automatically deleted after 30 days. You can restore them from the Trash at any time before then.
        </p>

        {folderCount > 0 && (
          <p
            className="text-xs px-3 py-2 rounded border"
            style={{
              color: "var(--warning-amber)",
              borderColor: "var(--warning-amber)",
              background: "rgba(255, 193, 7, 0.08)",
            }}
          >
            Folders and all their contents will be moved to Trash.
          </p>
        )}

        {files.length <= 5 && (
          <ul className="text-xs space-y-1 pl-4" style={{ color: "var(--neutral-gray)" }}>
            {files.map((f) => (
              <li key={f._id} className="list-disc">
                {f.name} {f.fileKind === "folder" ? "(folder)" : ""}
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="desktop-interior-button px-4 py-2 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="desktop-interior-button px-4 py-2 text-xs font-bold"
            style={{
              borderColor: "var(--warning-amber)",
              background: "var(--warning-amber)",
              color: "#000",
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            {isDeleting ? "Moving..." : "Move to Trash"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ============================================================================
// MODAL OVERLAY
// ============================================================================

function ModalOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-md p-6 border rounded-2xl shadow-lg"
        style={{
          background: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md"
          style={{ color: "var(--neutral-gray)" }}
        >
          <X size={14} />
        </button>
        {children}
      </div>
    </div>
  );
}
