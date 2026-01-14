"use client";

import React from "react";
import { Download, FileText, Image, FileArchive, File, FileSpreadsheet } from "lucide-react";
import { useProjectDrawer } from "./ProjectDrawerProvider";

interface FileAttachment {
  mediaId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  fileUrl: string | null;
  displayOrder: number;
}

interface MeetingFilesProps {
  files: FileAttachment[];
}

/**
 * Displays list of attached files with download links
 * Shows file icons based on mime type and human-readable file sizes
 */
export function MeetingFiles({ files }: MeetingFilesProps) {
  const { themeColors, config } = useProjectDrawer();

  const allowDownloads = config.allowDownloads !== false; // Default to true

  if (files.length === 0) return null;

  // Sort by display order
  const sortedFiles = [...files].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-2">
      {sortedFiles.map((file) => (
        <FileItem
          key={file.mediaId}
          file={file}
          allowDownload={allowDownloads}
          themeColors={themeColors}
        />
      ))}
    </div>
  );
}

interface FileItemProps {
  file: FileAttachment;
  allowDownload: boolean;
  themeColors: {
    primary: string;
    background: string;
    border: string;
    accent: string;
  };
}

function FileItem({ file, allowDownload, themeColors }: FileItemProps) {
  const FileIcon = getFileIcon(file.mimeType);
  const fileSize = formatFileSize(file.sizeBytes);

  const content = (
    <div
      className="flex items-center gap-3 p-3 border rounded-lg transition-colors"
      style={{
        borderColor: themeColors.border,
        backgroundColor: allowDownload && file.fileUrl ? undefined : themeColors.background,
      }}
    >
      {/* File icon */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
        style={{ backgroundColor: themeColors.background }}
      >
        <FileIcon
          className="w-5 h-5"
          style={{ color: themeColors.primary }}
        />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{file.filename}</p>
        <p className="text-xs text-gray-500">{fileSize}</p>
      </div>

      {/* Download button */}
      {allowDownload && file.fileUrl && (
        <div
          className="flex items-center justify-center w-8 h-8 transition-colors rounded-lg shrink-0"
          style={{ backgroundColor: themeColors.background }}
        >
          <Download
            className="w-4 h-4"
            style={{ color: themeColors.accent }}
          />
        </div>
      )}
    </div>
  );

  if (allowDownload && file.fileUrl) {
    return (
      <a
        href={file.fileUrl}
        download={file.filename}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:shadow-sm"
      >
        {content}
      </a>
    );
  }

  return content;
}

/**
 * Get appropriate icon based on mime type
 */
function getFileIcon(mimeType: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  if (mimeType.startsWith("image/")) {
    return Image;
  }

  if (mimeType === "application/pdf") {
    return FileText;
  }

  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-rar-compressed" ||
    mimeType === "application/x-7z-compressed"
  ) {
    return FileArchive;
  }

  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "text/csv"
  ) {
    return FileSpreadsheet;
  }

  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "text/plain"
  ) {
    return FileText;
  }

  return File;
}

/**
 * Format bytes to human-readable size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}
