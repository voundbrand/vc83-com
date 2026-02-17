"use client";

/**
 * FINDER TRASH VIEW - Shows soft-deleted files with restore/permanent delete
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Trash2,
  RotateCcw,
  XCircle,
  Folder,
  FileText,
  Image,
  Box,
  Workflow,
  Upload,
  AlertTriangle,
} from "lucide-react";

interface FinderTrashViewProps {
  sessionId: string;
  organizationId: string;
}

export function FinderTrashView({ sessionId, organizationId }: FinderTrashViewProps) {
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);

  const trashedFiles = useQuery(
    api.projectFileSystem.listTrash,
    { sessionId, organizationId: organizationId as Id<"organizations"> }
  );

  const restoreFile = useMutation(api.projectFileSystem.restoreFile);
  const permanentDeleteFile = useMutation(api.projectFileSystem.permanentDeleteFile);
  const emptyTrash = useMutation(api.projectFileSystem.emptyTrash);

  const handleRestore = async (fileId: string) => {
    try {
      await restoreFile({ sessionId, fileId: fileId as Id<"projectFiles"> });
    } catch (err) {
      console.error("Restore failed:", err);
    }
  };

  const handlePermanentDelete = async (fileId: string) => {
    try {
      await permanentDeleteFile({ sessionId, fileId: fileId as Id<"projectFiles"> });
    } catch (err) {
      console.error("Permanent delete failed:", err);
    }
  };

  const handleEmptyTrash = async () => {
    setIsEmptying(true);
    try {
      await emptyTrash({ sessionId, organizationId: organizationId as Id<"organizations"> });
      setConfirmEmptyTrash(false);
    } catch (err) {
      console.error("Empty trash failed:", err);
    } finally {
      setIsEmptying(false);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const FILE_KIND_ICONS: Record<string, React.ReactNode> = {
    folder: <Folder size={14} style={{ color: "var(--primary)" }} />,
    virtual: <FileText size={14} style={{ color: "var(--accent-color)" }} />,
    uploaded: <Upload size={14} style={{ color: "var(--success-green)" }} />,
    media_ref: <Image size={14} style={{ color: "var(--success-green)" }} />,
    builder_ref: <Box size={14} style={{ color: "var(--warning-amber)" }} />,
    layer_ref: <Workflow size={14} style={{ color: "var(--info-blue)" }} />,
  };

  if (!trashedFiles) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Loading...</p>
      </div>
    );
  }

  if (trashedFiles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <Trash2 size={48} style={{ color: "var(--neutral-gray)", opacity: 0.3 }} />
        <p className="text-sm font-bold" style={{ color: "var(--neutral-gray)" }}>
          Trash is empty
        </p>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Deleted items will appear here for 30 days before being permanently removed.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <div className="flex items-center gap-2">
          <Trash2 size={16} style={{ color: "var(--error-red)" }} />
          <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
            Trash ({trashedFiles.length} item{trashedFiles.length !== 1 ? "s" : ""})
          </span>
        </div>
        <button
          onClick={() => setConfirmEmptyTrash(true)}
          className="desktop-interior-button flex items-center gap-2 px-3 py-1.5 text-xs font-bold"
          style={{
            borderColor: "var(--error-red)",
            background: "transparent",
            color: "var(--error-red)",
          }}
        >
          <XCircle size={12} />
          Empty Trash
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr
              className="text-left text-[10px] font-bold border-b"
              style={{ color: "var(--neutral-gray)", borderColor: "var(--window-document-border)" }}
            >
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Original Location</th>
              <th className="px-4 py-2">Deleted</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trashedFiles.map((file: any) => (
              <tr
                key={file._id}
                className="border-b hover:bg-black/5 transition-colors"
                style={{ borderColor: "var(--window-document-border)" }}
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {FILE_KIND_ICONS[file.fileKind] || <FileText size={14} />}
                    <span className="text-xs" style={{ color: "var(--win95-text)" }}>
                      {file.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span className="text-xs font-mono" style={{ color: "var(--neutral-gray)" }}>
                    {file.originalPath || file.path}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {file.deletedAt ? formatRelativeTime(file.deletedAt) : "—"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleRestore(file._id)}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: "var(--success-green)" }}
                      title="Restore"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(file._id)}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: "var(--error-red)" }}
                      title="Delete permanently"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Auto-purge notice */}
      <div
        className="px-4 py-2 border-t flex items-center gap-2"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <AlertTriangle size={12} style={{ color: "var(--warning-amber)" }} />
        <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          Items in Trash are automatically deleted after 30 days.
        </p>
      </div>

      {/* Empty Trash Confirmation */}
      {confirmEmptyTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmEmptyTrash(false)} />
          <div
            className="relative w-full max-w-sm p-6 border rounded-2xl shadow-lg"
            style={{
              background: "var(--window-document-bg-elevated)",
              borderColor: "var(--window-document-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} style={{ color: "var(--error-red)" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                Empty Trash
              </h3>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--win95-text)" }}>
              Are you sure you want to permanently delete all {trashedFiles.length} item{trashedFiles.length !== 1 ? "s" : ""}?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmEmptyTrash(false)}
                className="desktop-interior-button px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyTrash}
                disabled={isEmptying}
                className="desktop-interior-button px-4 py-2 text-xs font-bold"
                style={{
                  borderColor: "var(--error-red)",
                  background: "var(--error-red)",
                  color: "#fff",
                  opacity: isEmptying ? 0.5 : 1,
                }}
              >
                {isEmptying ? "Emptying..." : "Empty Trash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
