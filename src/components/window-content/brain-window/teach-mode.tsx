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
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
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
  Trash2,
} from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  InteriorButton,
  InteriorHeader,
  InteriorHelperText,
  InteriorInput,
  InteriorPanel,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";
import type { BrainTranslate } from "./index";

interface TeachModeProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  tr: BrainTranslate;
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

export function TeachMode({ sessionId, organizationId, tr }: TeachModeProps) {
  const [sources, setSources] = useState<PendingSource[]>([]);
  const [activeInput, setActiveInput] = useState<SourceType | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.organizationMedia.generateUploadUrl);
  const saveMedia = useMutation(api.organizationMedia.saveMedia);
  const createLayerCakeDocument = useMutation(api.organizationMedia.createLayerCakeDocument);
  const registerMediaKnowledgeItem = useMutation(api.brainKnowledge.registerMediaKnowledgeItem);
  const ingestLinkKnowledgeItem = useMutation(api.brainKnowledge.ingestLinkKnowledgeItem);
  const recordIngestionFailure = useMutation(api.brainKnowledge.recordIngestionFailure);

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
    setProcessingError(null);
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
    setProcessingError(null);
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
    setProcessingError(null);
    setTextInput("");
    setTextTitle("");
    setActiveInput(null);
  }, [textInput, textTitle, sources]);

  // Remove a source
  const handleRemoveSource = useCallback((id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const uploadFileToStorage = useCallback(
    async (file: File) => {
      const uploadUrl = await generateUploadUrl({
        sessionId,
        organizationId,
        estimatedSizeBytes: file.size,
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed for "${file.name}".`);
      }

      const uploadPayload = await uploadResponse.json() as { storageId?: Id<"_storage"> };
      if (!uploadPayload.storageId) {
        throw new Error(`Upload storage ID missing for "${file.name}".`);
      }

      return uploadPayload.storageId;
    },
    [generateUploadUrl, organizationId, sessionId],
  );

  const processSource = useCallback(
    async (source: PendingSource) => {
      switch (source.type) {
        case "pdf":
        case "audio": {
          if (!source.file) {
            throw new Error("Selected file is missing.");
          }

          const storageId = await uploadFileToStorage(source.file);
          const media = await saveMedia({
            sessionId,
            organizationId,
            storageId,
            filename: source.file.name,
            mimeType: source.file.type || "application/octet-stream",
            sizeBytes: source.file.size,
          });

          await registerMediaKnowledgeItem({
            sessionId,
            organizationId,
            mediaId: media.mediaId,
            sourceType: source.type,
          });
          break;
        }

        case "text": {
          if (!source.text?.trim()) {
            throw new Error("Text note is empty.");
          }

          const document = await createLayerCakeDocument({
            sessionId,
            organizationId,
            filename: source.name,
            documentContent: source.text,
            description: "Teach mode note",
            tags: ["brain", "teach", "note"],
          });

          await registerMediaKnowledgeItem({
            sessionId,
            organizationId,
            mediaId: document.docId,
            sourceType: "text",
          });
          break;
        }

        case "link": {
          if (!source.url?.trim()) {
            throw new Error("Link URL is missing.");
          }

          await ingestLinkKnowledgeItem({
            sessionId,
            organizationId,
            url: source.url,
            title: source.name,
          });
          break;
        }
      }
    },
    [
      createLayerCakeDocument,
      ingestLinkKnowledgeItem,
      organizationId,
      registerMediaKnowledgeItem,
      saveMedia,
      sessionId,
      uploadFileToStorage,
    ],
  );

  // Process all sources
  const handleProcessAll = useCallback(async () => {
    if (sources.length === 0) return;

    setIsProcessing(true);
    setProcessingError(null);

    for (const source of sources) {
      if (source.status !== "pending") continue;

      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, status: "processing" as const, error: undefined } : s))
      );

      try {
        await processSource(source);

        setSources((prev) =>
          prev.map((s) => (s.id === source.id ? { ...s, status: "done" as const } : s))
        );
      } catch (err) {
        const failureMessage = err instanceof Error ? err.message : "Failed to process source.";

        try {
          await recordIngestionFailure({
            sessionId,
            organizationId,
            sourceType: source.type,
            sourceName: source.name,
            sourceUrl: source.type === "link" ? source.url : undefined,
            failureReason: failureMessage,
          });
        } catch {
          // Best-effort: the UI still surfaces source-level error if failure logging fails.
        }

        setSources((prev) =>
          prev.map((s) =>
            s.id === source.id
              ? { ...s, status: "error" as const, error: failureMessage }
              : s
          )
        );
        setProcessingError(
          "Some sources failed to ingest. Failures were saved with explicit reasons.",
        );
      }
    }

    setIsProcessing(false);
  }, [organizationId, processSource, recordIngestionFailure, sessionId, sources]);

  // Clear completed sources
  const handleClearCompleted = useCallback(() => {
    setSources((prev) => prev.filter((s) => s.status !== "done"));
  }, []);

  const pendingCount = sources.filter((s) => s.status === "pending").length;
  const processingCount = sources.filter((s) => s.status === "processing").length;
  const doneCount = sources.filter((s) => s.status === "done").length;
  const { t } = useNamespaceTranslations("ui.brain");
  const trLocal = useCallback(
    (key: string, fallback: string, params?: Record<string, string | number>) => {
      const value = t(key, params);
      return value === key ? fallback : value;
    },
    [t],
  );
  const tx = tr ?? trLocal;

  return (
    <InteriorRoot className="flex h-full flex-col">
      <InteriorHeader className="px-4 py-3">
        <InteriorTitle className="text-base">
          {tx("ui.brain.teach.title", "Add Knowledge Sources")}
        </InteriorTitle>
        <InteriorSubtitle className="mt-1">
          {tx(
            "ui.brain.teach.subtitle",
            "Upload documents, paste links, or add text to teach the AI about your domain.",
          )}
        </InteriorSubtitle>
      </InteriorHeader>

      <div className="border-b px-4 py-3" style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(SOURCE_CONFIG) as SourceType[]).map((type) => {
            const config = SOURCE_CONFIG[type];
            const Icon = config.icon;
            const isActive = activeInput === type;
            return (
              <InteriorButton
                key={type}
                variant={isActive ? "primary" : "subtle"}
                size="sm"
                onClick={() => {
                  if (type === "pdf" || type === "audio") {
                    fileInputRef.current?.click();
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = config.accept || "";
                      fileInputRef.current.dataset.type = type;
                    }
                  } else {
                    setActiveInput(activeInput === type ? null : type);
                  }
                }}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                <span>{config.label}</span>
                <Plus className="h-3.5 w-3.5" />
              </InteriorButton>
            );
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const type = e.target.dataset.type as SourceType;
            handleFileSelect(type, e.target.files);
            e.target.value = "";
          }}
        />

        {activeInput === "link" && (
          <div className="mt-3 flex items-center gap-2">
            <InteriorInput
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder={SOURCE_CONFIG.link.placeholder}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
            />
            <InteriorButton onClick={handleAddLink} disabled={!linkInput.trim()} variant="primary">
              {tx("ui.brain.teach.actions.add", "Add")}
            </InteriorButton>
            <InteriorButton onClick={() => setActiveInput(null)} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </InteriorButton>
          </div>
        )}

        {activeInput === "text" && (
          <div className="mt-3 space-y-2">
            <InteriorInput
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder={tx("ui.brain.teach.input.title_placeholder", "Title (optional)")}
              autoFocus
            />
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={SOURCE_CONFIG.text.placeholder}
              className="desktop-interior-textarea min-h-[120px]"
            />
            <div className="flex items-center justify-end gap-2">
              <InteriorButton onClick={() => setActiveInput(null)} variant="ghost">
                {tx("ui.brain.teach.actions.cancel", "Cancel")}
              </InteriorButton>
              <InteriorButton onClick={handleAddText} disabled={!textInput.trim()} variant="primary">
                {tx("ui.brain.teach.actions.add_note", "Add Note")}
              </InteriorButton>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {sources.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Upload className="mb-3 h-10 w-10" style={{ color: "var(--desktop-menu-text-muted)" }} />
            <InteriorTitle className="text-sm">
              {tx("ui.brain.teach.empty.title", "No sources added yet.")}
            </InteriorTitle>
            <InteriorHelperText className="mt-1">
              {tx("ui.brain.teach.empty.body", "Choose a source type above to add knowledge.")}
            </InteriorHelperText>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-2">
            {sources.map((source) => {
              const config = SOURCE_CONFIG[source.type];
              const Icon = config.icon;
              const isError = source.status === "error";
              const isDone = source.status === "done";
              const panelStyle = isError
                ? { borderColor: "var(--error)", background: "var(--error-bg)" }
                : isDone
                  ? { borderColor: "var(--success)", background: "var(--success-bg)" }
                  : undefined;

              return (
                <InteriorPanel key={source.id} className="flex items-center gap-3 p-3" style={panelStyle}>
                  <div
                    className="rounded border p-1.5"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--window-document-bg)",
                    }}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{
                        color: isError
                          ? "var(--error)"
                          : isDone
                            ? "var(--success)"
                            : "var(--desktop-menu-text-muted)",
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--window-document-text)" }}>
                      {source.name}
                    </p>
                    {source.error && (
                      <p className="mt-0.5 text-xs" style={{ color: "var(--error)" }}>
                        {source.error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {source.status === "processing" && (
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
                    )}
                    {source.status === "done" && (
                      <CheckCircle className="h-4 w-4" style={{ color: "var(--success)" }} />
                    )}
                    {source.status === "error" && (
                      <AlertCircle className="h-4 w-4" style={{ color: "var(--error)" }} />
                    )}
                    {source.status === "pending" && (
                      <InteriorButton
                        onClick={() => handleRemoveSource(source.id)}
                        disabled={isProcessing}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        title={tx("ui.brain.teach.actions.remove", "Remove")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </InteriorButton>
                    )}
                  </div>
                </InteriorPanel>
              );
            })}
          </div>
        )}
      </div>

      {sources.length > 0 && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}>
          <div className="mx-auto max-w-3xl">
            {processingError && (
              <InteriorPanel className="mb-3 p-3" style={{ borderColor: "var(--error)", background: "var(--error-bg)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--error)" }}>
                  {tx("ui.brain.teach.error.title", "Ingestion failures captured")}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>{processingError}</p>
              </InteriorPanel>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <InteriorHelperText>
                {pendingCount > 0 ? `${pendingCount} ${tx("ui.brain.teach.stats.pending", "pending")}` : ""}
                {processingCount > 0 ? ` ${processingCount} ${tx("ui.brain.teach.stats.processing", "processing")}` : ""}
                {doneCount > 0 ? ` ${doneCount} ${tx("ui.brain.teach.stats.complete", "complete")}` : ""}
              </InteriorHelperText>

              <div className="flex items-center gap-2">
                {doneCount > 0 && (
                  <InteriorButton onClick={handleClearCompleted} variant="ghost">
                    {tx("ui.brain.teach.actions.clear_completed", "Clear Completed")}
                  </InteriorButton>
                )}
                <InteriorButton
                  onClick={handleProcessAll}
                  disabled={pendingCount === 0 || isProcessing}
                  variant="primary"
                  className="gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {tx("ui.brain.teach.actions.processing", "Processing...")}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {tx(
                        "ui.brain.teach.actions.process_sources",
                        `Process ${pendingCount} Source${pendingCount !== 1 ? "s" : ""}`,
                        { count: pendingCount },
                      )}
                    </>
                  )}
                </InteriorButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </InteriorRoot>
  );
}

export default TeachMode;
