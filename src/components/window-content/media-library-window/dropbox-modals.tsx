"use client";

/**
 * DROPBOX-STYLE MEDIA LIBRARY - MODALS
 * Modal components for folder creation, document creation, and file upload
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { X, FolderPlus, FileText, Upload, Loader2 } from "lucide-react";
import SimpleTiptapEditor from "@/components/ui/tiptap-editor-simple";

// ============================================================================
// CREATE FOLDER MODAL
// ============================================================================

interface CreateFolderModalProps {
  organizationId: string | null;
  sessionId: string | null;
  parentFolderId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateFolderModal({
  organizationId,
  sessionId,
  parentFolderId,
  onClose,
  onSuccess,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6B46C1");
  const [isCreating, setIsCreating] = useState(false);

  const createFolder = useMutation(api.mediaFolderOntology.createFolder);

  const handleCreate = async () => {
    if (!folderName.trim() || !organizationId || !sessionId) return;

    setIsCreating(true);
    try {
      await createFolder({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        name: folderName.trim(),
        description: description.trim() || undefined,
        color,
        parentFolderId: parentFolderId || undefined,
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to create folder:", error);
      alert(error instanceof Error ? error.message : "Failed to create folder");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "var(--modal-overlay-bg)" }}
    >
      <div
        className="w-full max-w-md border-2 rounded-lg"
        style={{
          background: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b-2"
          style={{
            background: "var(--win95-titlebar-bg)",
            borderColor: "var(--win95-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <FolderPlus size={18} style={{ color: "var(--win95-titlebar-text)" }} />
            <h3
              className="text-sm font-bold"
              style={{ color: "var(--win95-titlebar-text)" }}
            >
              Create New Folder
            </h3>
          </div>
          <button onClick={onClose}>
            <X size={18} style={{ color: "var(--win95-titlebar-text)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Folder Name */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Folder Name *
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description"
              className="w-full px-3 py-2 text-sm border-2 resize-none"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
              rows={3}
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Color
            </label>
            <div className="flex gap-2">
              {["#6B46C1", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded border-2 transition-transform"
                  style={{
                    background: c,
                    borderColor: color === c ? "var(--win95-text)" : "transparent",
                    transform: color === c ? "scale(1.1)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-6 py-4 border-t-2"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border-2 rounded"
            style={{
              background: "var(--win95-button-face)",
              borderColor: "var(--win95-border)",
              color: "var(--win95-text)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!folderName.trim() || isCreating}
            className="px-4 py-2 text-xs font-bold border-2 rounded flex items-center gap-2"
            style={{
              background: "var(--win95-highlight)",
              borderColor: "var(--win95-border)",
              color: "white",
              opacity: !folderName.trim() || isCreating ? 0.5 : 1,
            }}
          >
            {isCreating && <Loader2 size={14} className="animate-spin" />}
            Create Folder
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CREATE DOCUMENT MODAL
// ============================================================================

interface CreateDocumentModalProps {
  organizationId: string | null;
  sessionId: string | null;
  folderId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateDocumentModal({
  organizationId,
  sessionId,
  folderId,
  onClose,
  onSuccess,
}: CreateDocumentModalProps) {
  const [documentName, setDocumentName] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createDocument = useMutation(api.organizationMedia.createLayerCakeDocument);

  const handleCreate = async () => {
    if (!documentName.trim() || !organizationId || !sessionId) return;

    setIsCreating(true);
    try {
      await createDocument({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        filename: documentName.trim(),
        documentContent: documentContent || "# New Document\n\nStart writing here...",
        folderId: folderId || undefined,
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to create document:", error);
      alert(error instanceof Error ? error.message : "Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "var(--modal-overlay-bg)" }}
    >
      <div
        className="w-full max-w-4xl h-[80vh] border-2 rounded-lg flex flex-col"
        style={{
          background: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b-2 flex-shrink-0"
          style={{
            background: "var(--win95-titlebar-bg)",
            borderColor: "var(--win95-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} style={{ color: "var(--win95-titlebar-text)" }} />
            <h3
              className="text-sm font-bold"
              style={{ color: "var(--win95-titlebar-text)" }}
            >
              Create Layer Cake Document
            </h3>
          </div>
          <button onClick={onClose}>
            <X size={18} style={{ color: "var(--win95-titlebar-text)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6 space-y-4">
          {/* Document Name */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Document Name *
            </label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="My Document"
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
              autoFocus
            />
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              .md extension will be added automatically
            </p>
          </div>

          {/* Editor */}
          <div className="flex-1">
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Content (Markdown)
            </label>
            <SimpleTiptapEditor
              value={documentContent}
              onChange={setDocumentContent}
              placeholder="# New Document\n\nStart writing here..."
              minHeight="400px"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-6 py-4 border-t-2 flex-shrink-0"
          style={{ borderColor: "var(--win95-border)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border-2 rounded"
            style={{
              background: "var(--win95-button-face)",
              borderColor: "var(--win95-border)",
              color: "var(--win95-text)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!documentName.trim() || isCreating}
            className="px-4 py-2 text-xs font-bold border-2 rounded flex items-center gap-2"
            style={{
              background: "var(--win95-highlight)",
              borderColor: "var(--win95-border)",
              color: "white",
              opacity: !documentName.trim() || isCreating ? 0.5 : 1,
            }}
          >
            {isCreating && <Loader2 size={14} className="animate-spin" />}
            Create Document
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// UPLOAD MODAL
// ============================================================================

interface UploadModalProps {
  organizationId: string | null;
  sessionId: string | null;
  onClose: () => void;
}

interface FileUploadStatus {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export function UploadModal({ organizationId, sessionId, onClose }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileQueue, setFileQueue] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const generateUploadUrl = useMutation(api.organizationMedia.generateUploadUrl);
  const saveMedia = useMutation(api.organizationMedia.saveMedia);

  const uploadSingleFile = async (file: File, index: number) => {
    if (!organizationId || !sessionId) {
      throw new Error("Not authenticated");
    }

    // Update status to uploading
    setFileQueue(prev => prev.map((item, i) =>
      i === index ? { ...item, status: "uploading" as const, progress: 0 } : item
    ));

    try {
      // Generate upload URL with quota check
      const uploadUrl = await generateUploadUrl({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        estimatedSizeBytes: file.size,
      });

      // Simulate progress (Convex doesn't provide real-time upload progress)
      setFileQueue(prev => prev.map((item, i) =>
        i === index ? { ...item, progress: 30 } : item
      ));

      // Upload to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      setFileQueue(prev => prev.map((item, i) =>
        i === index ? { ...item, progress: 70 } : item
      ));

      // Save metadata
      await saveMedia({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        storageId,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      // Success!
      setFileQueue(prev => prev.map((item, i) =>
        i === index ? { ...item, status: "success" as const, progress: 100 } : item
      ));
    } catch (error) {
      console.error("Upload failed:", error);
      setFileQueue(prev => prev.map((item, i) =>
        i === index ? {
          ...item,
          status: "error" as const,
          progress: 0,
          error: error instanceof Error ? error.message : "Upload failed"
        } : item
      ));
    }
  };

  const handleFilesSelect = async (files: FileList | File[]) => {
    if (!organizationId || !sessionId) {
      alert("Not authenticated");
      return;
    }

    // Convert to array and create status objects
    const filesArray = Array.from(files);
    const newFileStatuses: FileUploadStatus[] = filesArray.map(file => ({
      file,
      status: "pending" as const,
      progress: 0,
    }));

    setFileQueue(prev => [...prev, ...newFileStatuses]);
    setIsUploading(true);

    // Upload files in parallel (max 3 at a time)
    const startIndex = fileQueue.length;
    const maxConcurrent = 3;

    for (let i = 0; i < filesArray.length; i += maxConcurrent) {
      const batch = filesArray.slice(i, i + maxConcurrent);
      await Promise.all(
        batch.map((_, batchIndex) =>
          uploadSingleFile(filesArray[i + batchIndex], startIndex + i + batchIndex)
        )
      );
    }

    setIsUploading(false);

    // Auto-close if all successful
    const allSuccess = fileQueue.every(f => f.status === "success");
    if (allSuccess && fileQueue.length > 0) {
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  };

  const removeFile = (index: number) => {
    setFileQueue(prev => prev.filter((_, i) => i !== index));
  };

  const retryFile = (index: number) => {
    const file = fileQueue[index].file;
    setFileQueue(prev => prev.map((item, i) =>
      i === index ? { ...item, status: "pending" as const, progress: 0, error: undefined } : item
    ));
    uploadSingleFile(file, index);
  };

  const hasErrors = fileQueue.some(f => f.status === "error");
  const hasSuccess = fileQueue.some(f => f.status === "success");
  const allComplete = fileQueue.length > 0 && fileQueue.every(f => f.status === "success" || f.status === "error");

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "var(--modal-overlay-bg)" }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] border-2 rounded-lg flex flex-col"
        style={{
          background: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b-2 flex-shrink-0"
          style={{
            background: "var(--win95-titlebar-bg)",
            borderColor: "var(--win95-border)",
          }}
        >
          <div className="flex items-center gap-2">
            <Upload size={18} style={{ color: "var(--win95-titlebar-text)" }} />
            <h3
              className="text-sm font-bold"
              style={{ color: "var(--win95-titlebar-text)" }}
            >
              Upload Files {fileQueue.length > 0 && `(${fileQueue.length})`}
            </h3>
          </div>
          <button onClick={onClose} disabled={isUploading}>
            <X size={18} style={{ color: "var(--win95-titlebar-text)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Drop Zone */}
          {fileQueue.length === 0 && (
            <div
              className="border-4 border-dashed rounded-2xl p-12 transition-all text-center"
              style={{
                borderColor: isDragging ? "var(--win95-highlight)" : "var(--win95-border)",
                background: isDragging ? "var(--win95-bg)" : "var(--win95-bg-light)",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload
                className="w-16 h-16 mx-auto mb-4"
                style={{ color: "var(--neutral-gray)" }}
              />
              <h3 className="text-xl font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                Drop files here
              </h3>
              <p className="mb-6" style={{ color: "var(--neutral-gray)" }}>
                or click to browse (multiple files supported)
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleFilesSelect(files);
                    }
                  }}
                />
                <span
                  className="px-6 py-3 rounded-lg font-medium cursor-pointer transition-colors inline-block border-2"
                  style={{
                    background: "var(--win95-highlight)",
                    borderColor: "var(--win95-border)",
                    color: "white",
                  }}
                >
                  Choose Files
                </span>
              </label>
            </div>
          )}

          {/* File Queue */}
          {fileQueue.length > 0 && (
            <div className="space-y-3">
              {/* Add More Files Button */}
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                  Upload Queue ({fileQueue.length} {fileQueue.length === 1 ? "file" : "files"})
                </h4>
                <label className="inline-block">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleFilesSelect(files);
                      }
                    }}
                  />
                  <span
                    className="px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors inline-block border-2 rounded"
                    style={{
                      background: "var(--win95-button-face)",
                      borderColor: "var(--win95-border)",
                      color: "var(--win95-text)",
                      opacity: isUploading ? 0.5 : 1,
                      cursor: isUploading ? "not-allowed" : "pointer",
                    }}
                  >
                    + Add More Files
                  </span>
                </label>
              </div>

              {/* File List */}
              {fileQueue.map((item, index) => (
                <div
                  key={index}
                  className="border-2 rounded p-3"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg-light)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {item.status === "pending" && (
                        <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "var(--neutral-gray)" }} />
                      )}
                      {item.status === "uploading" && (
                        <Loader2 size={20} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
                      )}
                      {item.status === "success" && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#10B981" }}>
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                      {item.status === "error" && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#EF4444" }}>
                          <span className="text-white text-xs font-bold">✕</span>
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--win95-text)" }}>
                            {item.file.name}
                          </p>
                          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                            {formatFileSize(item.file.size)}
                          </p>
                        </div>

                        {/* Actions */}
                        {item.status === "pending" && !isUploading && (
                          <button
                            onClick={() => removeFile(index)}
                            className="text-xs px-2 py-1 border rounded"
                            style={{
                              borderColor: "var(--win95-border)",
                              color: "var(--win95-text)",
                            }}
                          >
                            Remove
                          </button>
                        )}
                        {item.status === "error" && (
                          <button
                            onClick={() => retryFile(index)}
                            className="text-xs px-2 py-1 border rounded"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-highlight)",
                              color: "white",
                            }}
                          >
                            Retry
                          </button>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {(item.status === "uploading" || item.status === "success") && (
                        <div
                          className="mt-2 w-full rounded-full h-2"
                          style={{ background: "var(--win95-border-light)" }}
                        >
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${item.progress}%`,
                              background: item.status === "success" ? "#10B981" : "var(--win95-highlight)",
                            }}
                          />
                        </div>
                      )}

                      {/* Error Message */}
                      {item.status === "error" && item.error && (
                        <p className="text-xs mt-1" style={{ color: "#EF4444" }}>
                          {item.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {fileQueue.length > 0 && (
          <div
            className="flex justify-between items-center gap-2 px-6 py-4 border-t-2 flex-shrink-0"
            style={{ borderColor: "var(--win95-border)" }}
          >
            <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {hasSuccess && `${fileQueue.filter(f => f.status === "success").length} uploaded`}
              {hasErrors && ` • ${fileQueue.filter(f => f.status === "error").length} failed`}
            </div>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-bold border-2 rounded"
              style={{
                background: allComplete ? "var(--win95-highlight)" : "var(--win95-button-face)",
                borderColor: "var(--win95-border)",
                color: allComplete ? "white" : "var(--win95-text)",
                opacity: isUploading ? 0.5 : 1,
                cursor: isUploading ? "not-allowed" : "pointer",
              }}
            >
              {allComplete ? "Done" : "Close"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
