"use client";

/**
 * TEACH MODE
 *
 * Multi-modal knowledge input - like NotebookLM.
 * Supports: PDFs, audio/transcripts, links, and plain text.
 * All inputs get processed and added to the org's knowledge base.
 */

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Upload,
  FileText,
  Headphones,
  Link2,
  AlignLeft,
  Plus,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";

interface TeachModeProps {
  sessionId: string;
  organizationId: Id<"organizations">;
}

type SourceType = "pdf" | "audio" | "link" | "text";

interface PendingSource {
  id: string;
  type: SourceType;
  name: string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  // Type-specific data
  file?: File;
  url?: string;
  text?: string;
}

const SOURCE_CONFIG: Record<SourceType, { icon: typeof FileText; label: string; accept?: string; placeholder?: string }> = {
  pdf: { icon: FileText, label: "PDF Document", accept: ".pdf" },
  audio: { icon: Headphones, label: "Audio / Transcript", accept: ".mp3,.wav,.m4a,.txt" },
  link: { icon: Link2, label: "Web Link", placeholder: "https://example.com/article" },
  text: { icon: AlignLeft, label: "Plain Text", placeholder: "Paste or type knowledge here..." },
};

export function TeachMode({ sessionId, organizationId }: TeachModeProps) {
  const [sources, setSources] = useState<PendingSource[]>([]);
  const [activeInput, setActiveInput] = useState<SourceType | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add a file source
  const handleFileSelect = useCallback((type: SourceType, files: FileList | null) => {
    if (!files) return;

    const newSources: PendingSource[] = Array.from(files).map((file) => ({
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      name: file.name,
      status: "pending" as const,
      file,
    }));

    setSources((prev) => [...prev, ...newSources]);
    setActiveInput(null);
  }, []);

  // Add a link source
  const handleAddLink = useCallback(() => {
    if (!linkInput.trim()) return;

    // Basic URL validation
    let url = linkInput.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const newSource: PendingSource = {
      id: `link-${Date.now()}`,
      type: "link",
      name: url,
      status: "pending",
      url,
    };

    setSources((prev) => [...prev, newSource]);
    setLinkInput("");
    setActiveInput(null);
  }, [linkInput]);

  // Add a text source
  const handleAddText = useCallback(() => {
    if (!textInput.trim()) return;

    const newSource: PendingSource = {
      id: `text-${Date.now()}`,
      type: "text",
      name: textTitle.trim() || `Text note ${sources.filter((s) => s.type === "text").length + 1}`,
      status: "pending",
      text: textInput.trim(),
    };

    setSources((prev) => [...prev, newSource]);
    setTextInput("");
    setTextTitle("");
    setActiveInput(null);
  }, [textInput, textTitle, sources]);

  // Remove a source
  const handleRemoveSource = useCallback((id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Process all sources
  const handleProcessAll = useCallback(async () => {
    if (sources.length === 0) return;

    setIsProcessing(true);

    // Process each source sequentially
    for (const source of sources) {
      if (source.status !== "pending") continue;

      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, status: "processing" as const } : s))
      );

      try {
        // TODO: Implement actual processing via Convex
        // For now, simulate processing
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setSources((prev) =>
          prev.map((s) => (s.id === source.id ? { ...s, status: "done" as const } : s))
        );
      } catch (err) {
        setSources((prev) =>
          prev.map((s) =>
            s.id === source.id
              ? { ...s, status: "error" as const, error: err instanceof Error ? err.message : "Failed to process" }
              : s
          )
        );
      }
    }

    setIsProcessing(false);
  }, [sources]);

  // Clear completed sources
  const handleClearCompleted = useCallback(() => {
    setSources((prev) => prev.filter((s) => s.status !== "done"));
  }, []);

  const pendingCount = sources.filter((s) => s.status === "pending").length;
  const processingCount = sources.filter((s) => s.status === "processing").length;
  const doneCount = sources.filter((s) => s.status === "done").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-zinc-700">
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Add Knowledge Sources</h2>
        <p className="text-sm text-zinc-500">
          Upload documents, paste links, or add text to teach the AI about your domain.
        </p>
      </div>

      {/* Source type buttons */}
      <div className="p-4 border-b border-zinc-700 bg-zinc-800/30">
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(SOURCE_CONFIG) as SourceType[]).map((type) => {
            const config = SOURCE_CONFIG[type];
            const Icon = config.icon;

            return (
              <button
                key={type}
                onClick={() => {
                  if (type === "pdf" || type === "audio") {
                    fileInputRef.current?.click();
                    // Store the type for the file input handler
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = config.accept || "";
                      fileInputRef.current.dataset.type = type;
                    }
                  } else {
                    setActiveInput(activeInput === type ? null : type);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  activeInput === type
                    ? "border-purple-500 bg-purple-900/30 text-purple-200"
                    : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{config.label}</span>
                <Plus className="w-3 h-3 opacity-60" />
              </button>
            );
          })}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const type = e.target.dataset.type as SourceType;
            handleFileSelect(type, e.target.files);
            e.target.value = ""; // Reset for re-selection
          }}
        />

        {/* Link input */}
        {activeInput === "link" && (
          <div className="mt-4 flex items-center gap-2">
            <input
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder={SOURCE_CONFIG.link.placeholder}
              className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
            />
            <button
              onClick={handleAddLink}
              disabled={!linkInput.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => setActiveInput(null)}
              className="p-2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Text input */}
        {activeInput === "text" && (
          <div className="mt-4 space-y-2">
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              autoFocus
            />
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={SOURCE_CONFIG.text.placeholder}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 min-h-[120px] resize-y"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setActiveInput(null)}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddText}
                disabled={!textInput.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50"
              >
                Add Note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sources list */}
      <div className="flex-1 overflow-y-auto p-4">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
            <Upload className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">No sources added yet.</p>
            <p className="text-xs mt-1">Click a button above to add knowledge.</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl mx-auto">
            {sources.map((source) => {
              const config = SOURCE_CONFIG[source.type];
              const Icon = config.icon;

              return (
                <div
                  key={source.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    source.status === "error"
                      ? "border-red-800/50 bg-red-900/10"
                      : source.status === "done"
                      ? "border-green-800/50 bg-green-900/10"
                      : "border-zinc-700 bg-zinc-800/50"
                  }`}
                >
                  <div
                    className={`p-2 rounded ${
                      source.status === "error"
                        ? "bg-red-900/30"
                        : source.status === "done"
                        ? "bg-green-900/30"
                        : "bg-zinc-700"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        source.status === "error"
                          ? "text-red-400"
                          : source.status === "done"
                          ? "text-green-400"
                          : "text-zinc-400"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{source.name}</p>
                    {source.error && (
                      <p className="text-xs text-red-400 mt-0.5">{source.error}</p>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-2">
                    {source.status === "processing" && (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    )}
                    {source.status === "done" && (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                    {source.status === "error" && (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    {source.status === "pending" && (
                      <button
                        onClick={() => handleRemoveSource(source.id)}
                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer actions */}
      {sources.length > 0 && (
        <div className="p-4 border-t border-zinc-700 bg-zinc-800/50">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="text-sm text-zinc-500">
              {pendingCount > 0 && <span>{pendingCount} pending</span>}
              {processingCount > 0 && <span className="ml-2">{processingCount} processing</span>}
              {doneCount > 0 && <span className="ml-2 text-green-500">{doneCount} complete</span>}
            </div>

            <div className="flex items-center gap-2">
              {doneCount > 0 && (
                <button
                  onClick={handleClearCompleted}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300"
                >
                  Clear Completed
                </button>
              )}
              <button
                onClick={handleProcessAll}
                disabled={pendingCount === 0 || isProcessing}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Process {pendingCount} Source{pendingCount !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeachMode;
