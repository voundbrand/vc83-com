"use client";

/**
 * FINDER UPLOAD - File upload with drag-to-upload zone and progress
 */

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

interface UploadState {
  filename: string;
  status: "uploading" | "saving" | "done" | "error";
  progress: number;
  error?: string;
}

interface FinderUploadProps {
  sessionId: string;
  organizationId: string;
  projectId?: string;
  parentPath: string;
  onComplete?: () => void;
}

export function useFinderUpload({
  sessionId,
  organizationId,
  projectId,
  parentPath,
}: FinderUploadProps) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.projectFileSystem.generateUploadUrl);
  const saveUploadedFile = useMutation(api.projectFileSystem.saveUploadedFile);

  const uploadFile = useCallback(async (file: File) => {
    const uploadState: UploadState = {
      filename: file.name,
      status: "uploading",
      progress: 0,
    };

    setUploads((prev) => [...prev, uploadState]);

    try {
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`File "${file.name}" exceeds 100 MB limit`);
      }

      // Get upload URL
      const uploadUrl = await generateUploadUrl({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        estimatedSizeBytes: file.size,
      });

      setUploads((prev) =>
        prev.map((u) =>
          u.filename === file.name ? { ...u, progress: 30 } : u
        )
      );

      // Upload to storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { storageId } = await response.json();

      setUploads((prev) =>
        prev.map((u) =>
          u.filename === file.name ? { ...u, status: "saving", progress: 70 } : u
        )
      );

      // Save file record
      await saveUploadedFile({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        projectId: projectId ? (projectId as Id<"objects">) : undefined,
        parentPath,
        storageId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      setUploads((prev) =>
        prev.map((u) =>
          u.filename === file.name ? { ...u, status: "done", progress: 100 } : u
        )
      );

      // Remove from list after 3s
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.filename !== file.name));
      }, 3000);
    } catch (err) {
      setUploads((prev) =>
        prev.map((u) =>
          u.filename === file.name
            ? { ...u, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
            : u
        )
      );
    }
  }, [sessionId, organizationId, projectId, parentPath, generateUploadUrl, saveUploadedFile]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(uploadFile);
  }, [uploadFile]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearUpload = useCallback((filename: string) => {
    setUploads((prev) => prev.filter((u) => u.filename !== filename));
  }, []);

  return {
    uploads,
    fileInputRef,
    handleFiles,
    openFilePicker,
    clearUpload,
  };
}

/**
 * Upload progress overlay
 */
export function UploadProgressOverlay({
  uploads,
  onClear,
}: {
  uploads: UploadState[];
  onClear: (filename: string) => void;
}) {
  if (uploads.length === 0) return null;

  return (
    <div
      className="absolute bottom-4 right-4 w-72 border rounded-2xl shadow-lg z-40"
      style={{
        background: "var(--window-document-bg-elevated)",
        borderColor: "var(--window-document-border)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: "var(--window-document-border)" }}
      >
        <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
          Uploads ({uploads.length})
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {uploads.map((upload) => (
          <div
            key={upload.filename}
            className="flex items-center gap-2 px-3 py-2 border-b"
            style={{ borderColor: "var(--window-document-border)" }}
          >
            {upload.status === "done" ? (
              <CheckCircle2 size={14} style={{ color: "var(--success-green)" }} />
            ) : upload.status === "error" ? (
              <AlertCircle size={14} style={{ color: "var(--error-red)" }} />
            ) : (
              <Upload size={14} className="animate-pulse" style={{ color: "var(--primary)" }} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: "var(--win95-text)" }}>
                {upload.filename}
              </p>
              {upload.status === "error" && (
                <p className="text-[10px]" style={{ color: "var(--error-red)" }}>
                  {upload.error}
                </p>
              )}
              {(upload.status === "uploading" || upload.status === "saving") && (
                <div className="w-full h-1 mt-1 rounded" style={{ background: "var(--window-document-border)" }}>
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${upload.progress}%`,
                      background: "var(--primary)",
                    }}
                  />
                </div>
              )}
            </div>
            {(upload.status === "done" || upload.status === "error") && (
              <button onClick={() => onClear(upload.filename)} className="p-0.5">
                <X size={12} style={{ color: "var(--neutral-gray)" }} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hidden file input — attach to a ref and trigger via openFilePicker
 */
export function HiddenFileInput({
  inputRef,
  onFiles,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      multiple
      className="hidden"
      onChange={(e) => {
        if (e.target.files && e.target.files.length > 0) {
          onFiles(e.target.files);
          e.target.value = "";
        }
      }}
    />
  );
}
