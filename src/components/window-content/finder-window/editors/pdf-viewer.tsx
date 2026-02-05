"use client";

/**
 * PDF VIEWER - iframe-based PDF display for media_ref PDF files
 *
 * Loads the PDF URL from organizationMedia, renders in an iframe
 * with download button and metadata.
 */

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  Download,
  ExternalLink,
  Loader2,
  FileType,
  HardDrive,
  Clock,
  Tag,
} from "lucide-react";
import type { ProjectFile } from "../finder-types";

interface PdfViewerProps {
  file: ProjectFile;
}

export function PdfViewer({ file }: PdfViewerProps) {
  // Fetch media URL
  const media = useQuery(
    api.organizationMedia.getMedia,
    file.mediaId ? { mediaId: file.mediaId as Id<"organizationMedia"> } : "skip"
  );

  const pdfUrl = media?.url;

  // Download
  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = file.name;
    a.click();
  };

  // Open in new tab
  const handleOpenExternal = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank");
  };

  if (!file.mediaId) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          No media reference
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b-2 flex-shrink-0"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <FileType size={14} style={{ color: "var(--accent-color)" }} />
        <span className="text-xs font-bold truncate" style={{ color: "var(--win95-text)" }}>
          {file.name}
        </span>

        <div className="flex-1" />

        <button
          onClick={handleOpenExternal}
          title="Open in new tab"
          className="p-1.5 rounded transition-colors"
          style={{ color: "var(--win95-text)" }}
          disabled={!pdfUrl}
        >
          <ExternalLink size={14} />
        </button>

        <button
          onClick={handleDownload}
          title="Download"
          className="p-1.5 rounded transition-colors"
          style={{ color: "var(--win95-text)" }}
          disabled={!pdfUrl}
        >
          <Download size={14} />
        </button>
      </div>

      {/* PDF display */}
      <div className="flex-1 min-h-0">
        {!pdfUrl ? (
          <div className="flex items-center justify-center h-full gap-2">
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--neutral-gray)" }} />
            <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Loading PDF...
            </span>
          </div>
        ) : (
          <iframe
            src={pdfUrl}
            title={file.name}
            className="w-full h-full border-none"
            style={{ background: "#fff" }}
          />
        )}
      </div>

      {/* Metadata bar */}
      <div
        className="flex items-center gap-4 px-3 py-1.5 border-t-2 flex-shrink-0 text-[10px]"
        style={{
          borderColor: "var(--win95-border)",
          color: "var(--neutral-gray)",
        }}
      >
        {file.mimeType && (
          <span className="flex items-center gap-1">
            <Tag size={10} /> {file.mimeType}
          </span>
        )}
        {file.sizeBytes && (
          <span className="flex items-center gap-1">
            <HardDrive size={10} /> {formatSize(file.sizeBytes)}
          </span>
        )}
        {file.createdAt && (
          <span className="flex items-center gap-1">
            <Clock size={10} /> {formatDate(file.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
