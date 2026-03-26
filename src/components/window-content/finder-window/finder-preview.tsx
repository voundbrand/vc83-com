"use client";

/**
 * FINDER PREVIEW PANEL - Right side detail view for selected file
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
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
  Pencil,
  Trash2,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectFile = any;

type ResolvedFileContent = {
  type: "virtual" | "uploaded" | "media" | "builder_ref" | "layer_ref" | "unknown";
  content?: string;
  url?: string | null;
  mimeType?: string;
};

type ReaderTarget =
  | { type: "none" }
  | { type: "pdf"; url: string | null }
  | { type: "docx"; url: string | null }
  | { type: "markdown"; source: "inline"; text: string }
  | { type: "markdown"; source: "url"; url: string | null };

interface FinderPreviewProps {
  file: ProjectFile;
  onClose: () => void;
  onOpenInBuilder?: () => void;
  onOpenInLayers?: () => void;
  onEditFile?: () => void;
  onDeleteFile?: () => void;
  sessionId?: string;
}

interface ReaderState {
  loading: boolean;
  text: string | null;
  error: string | null;
}

export function FinderPreview({
  file,
  onClose,
  onOpenInBuilder,
  onOpenInLayers,
  onEditFile,
  onDeleteFile,
  sessionId,
}: FinderPreviewProps) {
  // @ts-ignore TS2589: Convex generated query type can exceed instantiation depth in this component.
  const resolvedFile = useQuery(
    (api as any).projectFileSystem.getFileContent,
    sessionId
      ? {
          sessionId,
          fileId: file._id as Id<"projectFiles">,
        }
      : "skip"
  ) as ResolvedFileContent | undefined;

  const readerTarget = useMemo(() => resolveReaderTarget(file, resolvedFile), [file, resolvedFile]);
  const [readerState, setReaderState] = useState<ReaderState>({
    loading: false,
    text: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const setSafeState = (next: ReaderState) => {
      if (!cancelled) setReaderState(next);
    };

    const readRemoteText = async (url: string): Promise<string> => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Could not read file (${response.status}).`);
      }
      return await response.text();
    };

    const readRemoteBuffer = async (url: string): Promise<ArrayBuffer> => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Could not read file (${response.status}).`);
      }
      return await response.arrayBuffer();
    };

    if (readerTarget.type === "none") {
      setSafeState({ loading: false, text: null, error: null });
      return () => {
        cancelled = true;
      };
    }

    if (readerTarget.type === "pdf") {
      setSafeState({ loading: false, text: null, error: null });
      return () => {
        cancelled = true;
      };
    }

    if (readerTarget.type === "markdown" && readerTarget.source === "inline") {
      setSafeState({ loading: false, text: readerTarget.text, error: null });
      return () => {
        cancelled = true;
      };
    }

    if (readerTarget.type === "markdown" && readerTarget.source === "url") {
      if (!readerTarget.url) {
        setSafeState({
          loading: false,
          text: null,
          error: "This markdown file has no readable URL.",
        });
        return () => {
          cancelled = true;
        };
      }

      setSafeState({ loading: true, text: null, error: null });
      readRemoteText(readerTarget.url)
        .then((text) => {
          setSafeState({
            loading: false,
            text,
            error: null,
          });
        })
        .catch((error) => {
          setSafeState({
            loading: false,
            text: null,
            error: error instanceof Error ? error.message : "Could not read this markdown file.",
          });
        });

      return () => {
        cancelled = true;
      };
    }

    if (readerTarget.type === "docx") {
      if (!readerTarget.url) {
        setSafeState({
          loading: false,
          text: null,
          error: "This DOCX file has no readable URL.",
        });
        return () => {
          cancelled = true;
        };
      }

      setSafeState({ loading: true, text: null, error: null });
      readRemoteBuffer(readerTarget.url)
        .then(extractTextFromDocxArrayBuffer)
        .then((text) => {
          setSafeState({
            loading: false,
            text: text.trim(),
            error: null,
          });
        })
        .catch((error) => {
          setSafeState({
            loading: false,
            text: null,
            error: error instanceof Error ? error.message : "Could not read this DOCX file.",
          });
        });

      return () => {
        cancelled = true;
      };
    }

    setSafeState({ loading: false, text: null, error: null });
    return () => {
      cancelled = true;
    };
  }, [readerTarget]);

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
        <div className="flex items-center gap-2">
          {onEditFile && (
            <HeaderActionButton
              icon={<Pencil size={12} />}
              label="Edit"
              onClick={onEditFile}
            />
          )}
          {file.fileKind === "builder_ref" && onOpenInBuilder && (
            <HeaderActionButton
              icon={<ExternalLink size={12} />}
              label="Builder"
              onClick={onOpenInBuilder}
            />
          )}
          {file.fileKind === "layer_ref" && onOpenInLayers && (
            <HeaderActionButton
              icon={<ExternalLink size={12} />}
              label="Layers"
              onClick={onOpenInLayers}
            />
          )}
          {onDeleteFile && (
            <HeaderActionButton
              icon={<Trash2 size={12} />}
              label="Trash"
              onClick={onDeleteFile}
              danger
            />
          )}
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: "var(--neutral-gray)" }}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Reader (primary section) */}
      <div className="p-4 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        <div
          className="p-3 border rounded-lg"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          <p className="text-[10px] font-bold mb-2" style={{ color: "var(--neutral-gray)" }}>
            Reader
          </p>

          {readerTarget.type === "none" ? (
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              No reader available for this file type.
            </p>
          ) : null}

          {readerTarget.type === "pdf" ? (
            readerTarget.url ? (
              <iframe
                src={readerTarget.url}
                title={`${file.name} preview`}
                className="w-full border-none rounded"
                style={{ height: 320, background: "#fff" }}
              />
            ) : (
              <p className="text-xs" style={{ color: "var(--error-red)" }}>
                This PDF file is not readable right now.
              </p>
            )
          ) : null}

          {(readerTarget.type === "markdown" || readerTarget.type === "docx") ? (
            <>
              {readerState.loading ? (
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Reading file...
                </p>
              ) : null}

              {!readerState.loading && readerState.error ? (
                <p className="text-xs" style={{ color: "var(--error-red)" }}>
                  This file is not readable: {readerState.error}
                </p>
              ) : null}

              {!readerState.loading && !readerState.error ? (
                <pre
                  className="text-xs whitespace-pre-wrap break-words overflow-y-auto"
                  style={{ color: "var(--win95-text)", maxHeight: 320 }}
                >
                  {readerState.text && readerState.text.length > 0
                    ? readerState.text
                    : "(no readable text content)"}
                </pre>
              ) : null}
            </>
          ) : null}
        </div>
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
        <MetaRow icon={<HardDrive size={12} />} label="Path" value={file.path} />
        {file.sizeBytes && (
          <MetaRow icon={<HardDrive size={12} />} label="Size" value={formatSize(file.sizeBytes)} />
        )}
        {file.mimeType && (
          <MetaRow icon={<Tag size={12} />} label="Type" value={file.mimeType} />
        )}
        {file.language && (
          <MetaRow icon={<Tag size={12} />} label="Language" value={file.language} />
        )}
        <MetaRow icon={<Tag size={12} />} label="Source" value={file.source} />
        {file.createdAt && (
          <MetaRow icon={<Clock size={12} />} label="Created" value={formatDate(file.createdAt)} />
        )}
        {file.updatedAt && (
          <MetaRow icon={<Clock size={12} />} label="Modified" value={formatDate(file.updatedAt)} />
        )}
      </div>

    </div>
  );
}

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
        <p className="break-all" style={{ color: "var(--win95-text)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function HeaderActionButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="desktop-interior-button flex items-center gap-1 px-2 py-1 text-[10px] font-bold"
      style={danger ? { color: "var(--error-red)", borderColor: "var(--error-red)" } : undefined}
      title={label}
    >
      {icon}
      <span>{label}</span>
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

function getLowerExtension(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase();
}

function resolveReaderTarget(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  file: any,
  resolvedFile: ResolvedFileContent | undefined
): ReaderTarget {
  const extension = getLowerExtension(file.name || "");
  const mimeType = (file.mimeType || resolvedFile?.mimeType || "").toLowerCase();

  if (file.fileKind === "virtual") {
    if (mimeType === "text/markdown" || extension === "md" || extension === "mdx" || extension === "markdown") {
      return { type: "markdown", source: "inline", text: file.content || "" };
    }
    return { type: "none" };
  }

  const url = resolvedFile?.url || null;
  const isPdf = mimeType.includes("pdf") || extension === "pdf";
  const isDocx =
    mimeType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    || extension === "docx";
  const isMarkdown =
    mimeType === "text/markdown" || extension === "md" || extension === "mdx" || extension === "markdown";

  if (isPdf) return { type: "pdf", url };
  if (isDocx) return { type: "docx", url };
  if (isMarkdown) return { type: "markdown", source: "url", url };

  return { type: "none" };
}

async function extractTextFromDocxArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await (mammoth as any).extractRawText({ arrayBuffer });
  return typeof result?.value === "string" ? result.value : "";
}
