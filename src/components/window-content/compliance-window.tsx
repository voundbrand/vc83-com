"use client";

import { useState } from "react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { FileText, Download, Loader2, AlertCircle, Building2, CheckCircle, FolderOpen } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useWindowManager } from "@/hooks/use-window-manager";
import MediaLibraryWindow from "./media-library-window";

type ViewState = "input" | "processing" | "success" | "error";

export function ComplianceWindow() {
  const [viewState, setViewState] = useState<ViewState>("input");
  const [markdownContent, setMarkdownContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { user, isLoading, sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id || user?.defaultOrgId;
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.compliance");
  const { openWindow } = useWindowManager();

  const convertToPdf = useAction(api.compliance.convertMarkdownToPdf);

  // Check app availability
  const guard = useAppAvailabilityGuard({
    code: "compliance",
    name: "Compliance",
    description: "Convert legal markdown documents to beautiful PDFs using your existing PDF generation infrastructure"
  });

  if (guard) return guard;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: "var(--win95-highlight)" }} />
            <p style={{ color: "var(--win95-text)" }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !sessionId) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={48} style={{ color: "var(--error)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }}>Please log in to use the Compliance app</p>
          </div>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Building2 size={48} style={{ color: "var(--win95-highlight)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }} className="font-semibold">
              No Organization Selected
            </p>
            <p style={{ color: "var(--neutral-gray)" }} className="text-sm mt-2">
              Please select an organization to use the Compliance app
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleConvert = async () => {
    if (!markdownContent.trim() || !documentTitle.trim()) {
      setErrorMessage("Please provide both a document title and markdown content");
      setViewState("error");
      return;
    }

    setViewState("processing");
    setErrorMessage("");

    try {
      const result = await convertToPdf({
        sessionId,
        organizationId: organizationId as Id<"organizations">,
        markdownContent,
        documentTitle,
      });

      if (result.success && result.url) {
        setPdfUrl(result.url);
        setMediaId(result.mediaId);
        setViewState("success");
      } else {
        throw new Error("PDF generation failed");
      }
    } catch (error) {
      console.error("PDF conversion error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to generate PDF. Please try again."
      );
      setViewState("error");
    }
  };

  const handleOpenMediaLibrary = () => {
    openWindow(
      "media-library",
      "Media Library",
      <MediaLibraryWindow />,
      { x: 120, y: 60 },
      { width: 1000, height: 700 },
      'ui.app.media_library'
    );
  };

  const handleReset = () => {
    setViewState("input");
    setMarkdownContent("");
    setDocumentTitle("");
    setPdfUrl("");
    setErrorMessage("");
  };

  const handleLoadExample = () => {
    setDocumentTitle("Sample Legal Agreement");
    setMarkdownContent(`# SOFTWARE-AS-A-SERVICE AGREEMENT

## PARTIES

This Agreement is entered into between:

**Provider**: LayerCake GmbH
**Client**: [Client Name]

## 1. SERVICES

The Provider agrees to provide the following services:

- Cloud-based SaaS platform access
- Technical support during business hours
- Regular security updates
- Data backup and recovery

## 2. TERM

This Agreement shall commence on the Effective Date and continue for a period of twelve (12) months.

## 3. FEES

| Service Tier | Monthly Fee | Annual Fee |
|--------------|-------------|------------|
| Standard     | €100        | €1,000     |
| Professional | €250        | €2,500     |
| Enterprise   | €500        | €5,000     |

## 4. CONFIDENTIALITY

Both parties agree to maintain confidentiality of all proprietary information shared during the course of this Agreement.

## 5. TERMINATION

Either party may terminate this Agreement with thirty (30) days written notice.

---

**Generated with L4YERCAK3 Compliance App**`);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Header */}
      <div
        className="p-4 border-b-2"
        style={{
          borderColor: "var(--win95-highlight)",
          background: "linear-gradient(to bottom, var(--win95-bg) 0%, var(--win95-surface) 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <FileText size={32} style={{ color: "var(--win95-highlight)" }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--win95-text)" }}>
              Compliance Document Converter
            </h1>
            <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
              Convert markdown legal documents to professional PDFs
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {viewState === "input" && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Document Title */}
            <div>
              <label
                htmlFor="documentTitle"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--win95-text)" }}
              >
                Document Title
              </label>
              <input
                id="documentTitle"
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="e.g., Software License Agreement"
                className="w-full px-4 py-2 border-2 rounded"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-surface)",
                  color: "var(--win95-text)",
                }}
              />
            </div>

            {/* Markdown Content */}
            <div>
              <label
                htmlFor="markdownContent"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--win95-text)" }}
              >
                Markdown Content
              </label>
              <textarea
                id="markdownContent"
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                placeholder="Paste your markdown content here..."
                className="w-full h-96 px-4 py-3 border-2 rounded font-mono text-sm"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-surface)",
                  color: "var(--win95-text)",
                  resize: "vertical",
                }}
              />
              <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
                Supports headers, bold, italic, lists, and tables
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleConvert}
                disabled={!markdownContent.trim() || !documentTitle.trim()}
                className="flex items-center gap-2 px-6 py-3 rounded font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "var(--win95-highlight)",
                  color: "white",
                }}
              >
                <FileText size={18} />
                Generate PDF
              </button>

              <button
                onClick={handleLoadExample}
                className="flex items-center gap-2 px-6 py-3 rounded font-semibold transition-all border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-surface)",
                  color: "var(--win95-text)",
                }}
              >
                Load Example
              </button>
            </div>
          </div>
        )}

        {viewState === "processing" && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <Loader2 size={64} className="animate-spin mx-auto mb-6" style={{ color: "var(--win95-highlight)" }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Generating PDF...
            </h2>
            <p style={{ color: "var(--neutral-gray)" }}>
              Converting your markdown document to a professional PDF
            </p>
          </div>
        )}

        {viewState === "success" && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <CheckCircle size={64} className="mx-auto mb-6" style={{ color: "var(--success)" }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              {t("ui.compliance.success.title")}
            </h2>
            <p className="mb-6" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.compliance.success.subtitle", { documentTitle })}
            </p>

            <div className="flex flex-col gap-3 items-center">
              <div className="flex gap-3 justify-center">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded font-semibold transition-all"
                  style={{
                    background: "var(--win95-highlight)",
                    color: "white",
                  }}
                >
                  <Download size={18} />
                  {t("ui.compliance.success.download")}
                </a>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 rounded font-semibold transition-all border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-surface)",
                    color: "var(--win95-text)",
                  }}
                >
                  {t("ui.compliance.success.create_another")}
                </button>
              </div>

              <div
                className="mt-4 p-4 border-2 rounded max-w-md"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-bg-light)",
                }}
              >
                <p className="text-sm mb-3" style={{ color: "var(--win95-text)" }}>
                  {t("ui.compliance.success.media_library_message")}
                </p>
                <button
                  onClick={handleOpenMediaLibrary}
                  className="flex items-center gap-2 px-4 py-2 rounded font-semibold transition-all border-2 mx-auto"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-surface)",
                    color: "var(--win95-text)",
                  }}
                >
                  <FolderOpen size={16} />
                  {t("ui.compliance.success.open_media_library")}
                </button>
              </div>
            </div>
          </div>
        )}

        {viewState === "error" && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <AlertCircle size={64} className="mx-auto mb-6" style={{ color: "var(--error)" }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Error Generating PDF
            </h2>
            <p className="mb-6" style={{ color: "var(--error)" }}>
              {errorMessage}
            </p>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 rounded font-semibold transition-all mx-auto"
              style={{
                background: "var(--win95-highlight)",
                color: "white",
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
