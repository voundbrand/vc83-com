"use client";

/**
 * FILE PREVIEW PANEL - Right-side panel for previewing selected files
 * Supports: images, markdown/text documents, video, audio, PDF, and generic files
 */

import { X, FileText, Image as ImageIcon, Film, Music, File, Download, Star, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface PreviewItem {
  _id: Id<"organizationMedia">;
  filename: string;
  mimeType?: string;
  sizeBytes: number;
  url?: string | null;
  isStarred?: boolean;
  folderId?: string | null;
  createdAt: number;
  documentContent?: string;
  itemType?: string;
  description?: string;
  tags?: string[];
  [key: string]: unknown;
}

interface FilePreviewPanelProps {
  item: PreviewItem;
  sessionId: string | null;
  onClose: () => void;
}

export function FilePreviewPanel({ item, sessionId, onClose }: FilePreviewPanelProps) {
  const starMedia = useMutation(api.organizationMedia.starMedia);
  const unstarMedia = useMutation(api.organizationMedia.unstarMedia);

  const handleStar = async () => {
    if (!sessionId) return;
    try {
      if (item.isStarred) {
        await unstarMedia({ sessionId, mediaId: item._id });
      } else {
        await starMedia({ sessionId, mediaId: item._id });
      }
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  const isImage = item.mimeType?.startsWith("image/");
  const isVideo = item.mimeType?.startsWith("video/");
  const isAudio = item.mimeType?.startsWith("audio/");
  const isPdf = item.mimeType === "application/pdf";
  const isMarkdown = item.itemType === "layercake_document" || item.filename.endsWith(".md");
  const isText = item.mimeType?.startsWith("text/") || isMarkdown;

  const getFileIcon = () => {
    if (isImage) return <ImageIcon size={20} />;
    if (isVideo) return <Film size={20} />;
    if (isAudio) return <Music size={20} />;
    if (isText || isMarkdown) return <FileText size={20} />;
    return <File size={20} />;
  };

  return (
    <div
      className="h-full flex flex-col border-l-2"
      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b-2 flex-shrink-0"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ color: "var(--win95-highlight)" }}>{getFileIcon()}</span>
          <span
            className="text-xs font-bold truncate"
            style={{ color: "var(--win95-text)" }}
            title={item.filename}
          >
            {item.filename}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleStar}
            className="p-1 rounded transition-colors"
            title={item.isStarred ? "Unstar" : "Star"}
          >
            <Star
              size={16}
              fill={item.isStarred ? "#fbbf24" : "none"}
              stroke={item.isStarred ? "#fbbf24" : "var(--neutral-gray)"}
            />
          </button>
          {item.url && (
            <a
              href={item.url}
              download={item.filename}
              className="p-1 rounded transition-colors"
              title="Download"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={16} style={{ color: "var(--neutral-gray)" }} />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            title="Close preview"
          >
            <X size={16} style={{ color: "var(--neutral-gray)" }} />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Image Preview */}
        {isImage && item.url && (
          <div className="p-4">
            <div className="relative w-full aspect-auto rounded overflow-hidden border-2" style={{ borderColor: "var(--win95-border)" }}>
              <Image
                src={item.url}
                alt={item.filename}
                width={600}
                height={400}
                className="w-full h-auto object-contain"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Video Preview */}
        {isVideo && item.url && (
          <div className="p-4">
            <video
              src={item.url}
              controls
              className="w-full rounded border-2"
              style={{ borderColor: "var(--win95-border)" }}
            >
              Your browser does not support video playback.
            </video>
          </div>
        )}

        {/* Audio Preview */}
        {isAudio && item.url && (
          <div className="p-4">
            <div
              className="flex flex-col items-center gap-4 p-8 rounded border-2"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
            >
              <Music size={48} style={{ color: "var(--neutral-gray)" }} />
              <audio src={item.url} controls className="w-full">
                Your browser does not support audio playback.
              </audio>
            </div>
          </div>
        )}

        {/* PDF Preview */}
        {isPdf && item.url && (
          <div className="p-4 h-full">
            <iframe
              src={item.url}
              className="w-full h-full min-h-[400px] rounded border-2"
              style={{ borderColor: "var(--win95-border)" }}
              title={item.filename}
            />
          </div>
        )}

        {/* Markdown / Text Preview */}
        {isMarkdown && item.documentContent && (
          <div className="p-4">
            <div
              className="prose prose-sm max-w-none p-4 rounded border-2 text-xs leading-relaxed"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg-light)",
                color: "var(--win95-text)",
              }}
            >
              <MarkdownPreview content={item.documentContent} />
            </div>
          </div>
        )}

        {/* Generic file fallback */}
        {!isImage && !isVideo && !isAudio && !isPdf && !isMarkdown && (
          <div className="p-4">
            <div
              className="flex flex-col items-center gap-4 p-12 rounded border-2 text-center"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
            >
              <File size={64} style={{ color: "var(--neutral-gray)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--win95-text)" }}>
                Preview not available
              </p>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {item.mimeType || "Unknown file type"}
              </p>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold border-2 rounded transition-colors"
                  style={{
                    background: "var(--win95-highlight)",
                    borderColor: "var(--win95-border)",
                    color: "white",
                  }}
                >
                  <ExternalLink size={14} />
                  Open File
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* File Details Footer */}
      <div
        className="flex-shrink-0 px-4 py-3 border-t-2 space-y-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <DetailRow label="Size" value={formatBytes(item.sizeBytes)} />
        <DetailRow label="Created" value={new Date(item.createdAt).toLocaleString()} />
        {item.mimeType && <DetailRow label="Type" value={item.mimeType} />}
        {item.description && <DetailRow label="Description" value={item.description} />}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded border"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-highlight-bg)",
                  color: "var(--win95-highlight)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="font-bold flex-shrink-0 w-16" style={{ color: "var(--neutral-gray)" }}>
        {label}:
      </span>
      <span className="break-all" style={{ color: "var(--win95-text)" }}>
        {value}
      </span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Simple markdown preview - renders basic markdown as HTML
 * Handles: headings, bold, italic, code blocks, lists, links, paragraphs
 */
function MarkdownPreview({ content }: { content: string }) {
  const html = simpleMarkdownToHtml(content);
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className="markdown-preview"
      style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
    />
  );
}

function simpleMarkdownToHtml(md: string): string {
  const html = md
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Code blocks (fenced)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.05); padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 11px;"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.05); padding: 1px 4px; border-radius: 2px; font-size: 11px;">$1</code>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3 style="font-size: 14px; font-weight: bold; margin: 12px 0 4px 0;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size: 16px; font-weight: bold; margin: 16px 0 6px 0;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size: 18px; font-weight: bold; margin: 16px 0 8px 0;">$1</h1>')
    // Bold & Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--win95-highlight); text-decoration: underline;">$1</a>')
    // Unordered lists
    .replace(/^[*-] (.+)$/gm, '<li style="margin-left: 16px; list-style-type: disc;">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-left: 16px; list-style-type: decimal;">$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid var(--win95-border); margin: 12px 0;" />')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p style="margin: 8px 0;">');

  return `<p style="margin: 8px 0;">${html}</p>`;
}
