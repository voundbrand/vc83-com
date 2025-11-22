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

export function UploadModal({ organizationId, sessionId, onClose }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const generateUploadUrl = useMutation(api.organizationMedia.generateUploadUrl);
  const saveMedia = useMutation(api.organizationMedia.saveMedia);

  const handleFileSelect = async (file: File) => {
    if (!organizationId || !sessionId) {
      alert("Not authenticated");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate upload URL with quota check
      const uploadUrl = await generateUploadUrl({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        estimatedSizeBytes: file.size,
      });

      // Upload to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      // Save metadata
      await saveMedia({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        storageId,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      setUploadProgress(100);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Upload failed:", error);
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "var(--modal-overlay-bg)" }}
    >
      <div
        className="w-full max-w-xl border-2 rounded-lg"
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
            <Upload size={18} style={{ color: "var(--win95-titlebar-text)" }} />
            <h3
              className="text-sm font-bold"
              style={{ color: "var(--win95-titlebar-text)" }}
            >
              Upload File
            </h3>
          </div>
          <button onClick={onClose}>
            <X size={18} style={{ color: "var(--win95-titlebar-text)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
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
            {uploading ? (
              <div className="space-y-4">
                <Upload
                  className="w-16 h-16 mx-auto animate-bounce"
                  style={{ color: "var(--win95-highlight)" }}
                />
                <div>
                  <p className="text-lg font-semibold" style={{ color: "var(--win95-text)" }}>
                    Uploading...
                  </p>
                  <div
                    className="mt-4 w-full rounded-full h-3"
                    style={{ background: "var(--win95-border-light)" }}
                  >
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${uploadProgress}%`,
                        background: "var(--win95-highlight)",
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Upload
                  className="w-16 h-16 mx-auto mb-4"
                  style={{ color: "var(--neutral-gray)" }}
                />
                <h3 className="text-xl font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Drop files here
                </h3>
                <p className="mb-6" style={{ color: "var(--neutral-gray)" }}>
                  or click to browse
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
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
                    Choose File
                  </span>
                </label>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
