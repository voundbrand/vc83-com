"use client";

/**
 * FINDER MODALS - Create folder, create note, create code file, delete confirmation
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { FolderPlus, FileText, Code, X, Trash2 } from "lucide-react";

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

  const createFolder = useMutation(api.projectFileSystem.createFolder);

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

      // @ts-expect-error — dynamic args for dual-scope support
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
            className="w-full px-3 py-2 text-xs border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
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
            className="px-4 py-2 text-xs border-2 rounded"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="px-4 py-2 text-xs font-bold border-2 rounded"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--primary)",
              color: "#fff",
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
// CREATE NOTE MODAL
// ============================================================================

interface CreateNoteModalProps {
  sessionId: string;
  projectId?: string | null;
  organizationId?: string;
  parentPath: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateNoteModal({
  sessionId,
  projectId,
  organizationId,
  parentPath,
  onClose,
  onSuccess,
}: CreateNoteModalProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createVirtualFile = useMutation(api.projectFileSystem.createVirtualFile);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const filename = name.trim().endsWith(".md") ? name.trim() : `${name.trim()}.md`;

    setIsCreating(true);
    setError(null);

    try {
      const args: Record<string, unknown> = {
        sessionId,
        parentPath,
        name: filename,
        content: content || `# ${name.trim()}\n\n`,
        mimeType: "text/markdown",
        language: "markdown",
      };
      if (projectId) args.projectId = projectId as Id<"objects">;
      if (organizationId) args.organizationId = organizationId as Id<"organizations">;

      // @ts-expect-error — dynamic args for dual-scope support
      await createVirtualFile(args);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create note");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <FileText size={18} style={{ color: "var(--accent-color)" }} />
        <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
          New Note
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
            placeholder="my-note.md"
            autoFocus
            className="w-full px-3 py-2 text-xs border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
          />
        </div>

        <div>
          <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
            Content (optional)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            rows={6}
            className="w-full px-3 py-2 text-xs border-2 resize-none font-mono"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
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
            className="px-4 py-2 text-xs border-2 rounded"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="px-4 py-2 text-xs font-bold border-2 rounded"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--primary)",
              color: "#fff",
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
// CREATE PLAIN TEXT MODAL
// ============================================================================

interface CreatePlainTextModalProps {
  sessionId: string;
  projectId?: string | null;
  organizationId?: string;
  parentPath: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePlainTextModal({
  sessionId,
  projectId,
  organizationId,
  parentPath,
  onClose,
  onSuccess,
}: CreatePlainTextModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createVirtualFile = useMutation(api.projectFileSystem.createVirtualFile);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const filename = name.trim().endsWith(".txt") ? name.trim() : `${name.trim()}.txt`;

    setIsCreating(true);
    setError(null);

    try {
      const args: Record<string, unknown> = {
        sessionId,
        parentPath,
        name: filename,
        content: "",
        mimeType: "text/plain",
        language: "plaintext",
      };
      if (projectId) args.projectId = projectId as Id<"objects">;
      if (organizationId) args.organizationId = organizationId as Id<"organizations">;

      // @ts-expect-error — dynamic args for dual-scope support
      await createVirtualFile(args);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <FileText size={18} style={{ color: "var(--win95-text)" }} />
        <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
          New Plain Text File
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
            placeholder="document.txt"
            autoFocus
            className="w-full px-3 py-2 text-xs border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
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
            className="px-4 py-2 text-xs border-2 rounded"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="px-4 py-2 text-xs font-bold border-2 rounded"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--primary)",
              color: "#fff",
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
// CREATE CODE FILE MODAL
// ============================================================================

const CODE_LANGUAGES = [
  { value: "javascript", label: "JavaScript", ext: ".js" },
  { value: "typescript", label: "TypeScript", ext: ".ts" },
  { value: "tsx", label: "TypeScript React", ext: ".tsx" },
  { value: "jsx", label: "JavaScript React", ext: ".jsx" },
  { value: "python", label: "Python", ext: ".py" },
  { value: "html", label: "HTML", ext: ".html" },
  { value: "css", label: "CSS", ext: ".css" },
  { value: "json", label: "JSON", ext: ".json" },
  { value: "yaml", label: "YAML", ext: ".yaml" },
  { value: "sql", label: "SQL", ext: ".sql" },
  { value: "shell", label: "Shell Script", ext: ".sh" },
];

interface CreateCodeFileModalProps {
  sessionId: string;
  projectId?: string | null;
  organizationId?: string;
  parentPath: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCodeFileModal({
  sessionId,
  projectId,
  organizationId,
  parentPath,
  onClose,
  onSuccess,
}: CreateCodeFileModalProps) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createVirtualFile = useMutation(api.projectFileSystem.createVirtualFile);

  const selectedLang = CODE_LANGUAGES.find((l) => l.value === language)!;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    let filename = name.trim();
    // Add extension if not already present
    if (!filename.includes(".")) {
      filename += selectedLang.ext;
    }

    setIsCreating(true);
    setError(null);

    try {
      const mimeMap: Record<string, string> = {
        javascript: "text/javascript",
        typescript: "text/typescript",
        tsx: "text/typescript",
        jsx: "text/javascript",
        python: "text/x-python",
        html: "text/html",
        css: "text/css",
        json: "application/json",
        yaml: "text/yaml",
        sql: "text/x-sql",
        shell: "text/x-shellscript",
      };

      const args: Record<string, unknown> = {
        sessionId,
        parentPath,
        name: filename,
        content: "",
        mimeType: mimeMap[language] || "text/plain",
        language,
      };
      if (projectId) args.projectId = projectId as Id<"objects">;
      if (organizationId) args.organizationId = organizationId as Id<"organizations">;

      // @ts-expect-error — dynamic args for dual-scope support
      await createVirtualFile(args);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <Code size={18} style={{ color: "var(--accent-color)" }} />
        <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
          New Code File
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 text-xs border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
          >
            {CODE_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label} ({lang.ext})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
            File Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder={`my-file${selectedLang.ext}`}
            autoFocus
            className="w-full px-3 py-2 text-xs border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
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
            className="px-4 py-2 text-xs border-2 rounded"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="px-4 py-2 text-xs font-bold border-2 rounded"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--primary)",
              color: "#fff",
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
            borderColor: "var(--win95-border)",
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
            className="px-4 py-2 text-xs border-2 rounded"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold border-2 rounded"
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
        className="relative w-full max-w-md p-6 border-2 shadow-lg"
        style={{
          background: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1"
          style={{ color: "var(--neutral-gray)" }}
        >
          <X size={14} />
        </button>
        {children}
      </div>
    </div>
  );
}
