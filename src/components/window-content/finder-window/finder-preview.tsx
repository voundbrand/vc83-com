"use client";

/**
 * FINDER PREVIEW PANEL - Right side detail view for selected file
 */

import {
  Folder,
  FileText,
  Image,
  Box,
  Workflow,
  X,
  ExternalLink,
  Clock,
  HardDrive,
  Tag,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectFile = any;

interface FinderPreviewProps {
  file: ProjectFile;
  onClose: () => void;
  onOpenInBuilder?: () => void;
  onOpenInLayers?: () => void;
}

export function FinderPreview({
  file,
  onClose,
  onOpenInBuilder,
  onOpenInLayers,
}: FinderPreviewProps) {
  const kindIcon =
    file.fileKind === "folder" ? (
      <Folder size={24} style={{ color: "var(--primary)" }} />
    ) : file.fileKind === "virtual" ? (
      <FileText size={24} style={{ color: "var(--accent-color)" }} />
    ) : file.fileKind === "media_ref" ? (
      <Image size={24} style={{ color: "var(--success-green)" }} />
    ) : file.fileKind === "builder_ref" ? (
      <Box size={24} style={{ color: "var(--warning-amber)" }} />
    ) : (
      <Workflow size={24} style={{ color: "var(--info-blue)" }} />
    );

  const kindLabel: Record<string, string> = {
    folder: "Folder",
    virtual: "Note",
    media_ref: "Media Reference",
    builder_ref: "Builder App",
    layer_ref: "Layer Workflow",
  };

  return (
    <div
      className="h-full flex flex-col overflow-y-auto"
      style={{ background: "var(--win95-bg)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b-2"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <span className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
          Details
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ color: "var(--neutral-gray)" }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Icon + Name */}
      <div className="flex flex-col items-center gap-3 p-6 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        {kindIcon}
        <p
          className="text-sm font-bold text-center break-all"
          style={{ color: "var(--win95-text)" }}
        >
          {file.name}
        </p>
        <span
          className="text-[10px] px-2 py-0.5 rounded"
          style={{
            background: "var(--finder-selection-bg)",
            color: "var(--finder-selection-text)",
          }}
        >
          {kindLabel[file.fileKind] || file.fileKind}
        </span>
      </div>

      {/* Metadata */}
      <div className="p-4 space-y-3">
        <MetaRow
          icon={<HardDrive size={12} />}
          label="Path"
          value={file.path}
        />
        {file.sizeBytes && (
          <MetaRow
            icon={<HardDrive size={12} />}
            label="Size"
            value={formatSize(file.sizeBytes)}
          />
        )}
        {file.mimeType && (
          <MetaRow
            icon={<Tag size={12} />}
            label="Type"
            value={file.mimeType}
          />
        )}
        {file.language && (
          <MetaRow
            icon={<Tag size={12} />}
            label="Language"
            value={file.language}
          />
        )}
        <MetaRow
          icon={<Tag size={12} />}
          label="Source"
          value={file.source}
        />
        {file.createdAt && (
          <MetaRow
            icon={<Clock size={12} />}
            label="Created"
            value={formatDate(file.createdAt)}
          />
        )}
        {file.updatedAt && (
          <MetaRow
            icon={<Clock size={12} />}
            label="Modified"
            value={formatDate(file.updatedAt)}
          />
        )}
      </div>

      {/* Content Preview (virtual files) */}
      {file.fileKind === "virtual" && file.content && (
        <div
          className="mx-4 mb-4 p-3 border rounded-lg overflow-y-auto"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--win95-bg-light)",
            maxHeight: "200px",
          }}
        >
          <pre
            className="text-xs whitespace-pre-wrap break-words"
            style={{ color: "var(--win95-text)" }}
          >
            {file.content}
          </pre>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4 mt-auto space-y-2">
        {file.fileKind === "builder_ref" && onOpenInBuilder && (
          <ActionButton
            icon={<ExternalLink size={14} />}
            label="Open in Builder"
            onClick={onOpenInBuilder}
          />
        )}
        {file.fileKind === "layer_ref" && onOpenInLayers && (
          <ActionButton
            icon={<ExternalLink size={14} />}
            label="Open in Layers"
            onClick={onOpenInLayers}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span style={{ color: "var(--neutral-gray)" }}>{icon}</span>
      <div className="min-w-0">
        <p className="font-bold" style={{ color: "var(--neutral-gray)" }}>
          {label}
        </p>
        <p
          className="break-all"
          style={{ color: "var(--win95-text)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="desktop-interior-button w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold"
    >
      {icon}
      {label}
    </button>
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
    hour: "2-digit",
    minute: "2-digit",
  });
}
