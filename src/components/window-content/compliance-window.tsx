"use client";

import { useState } from "react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailability } from "@/hooks/use-app-availability";
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
  Building2,
  CheckCircle,
  FolderOpen,
  Database,
  Trash2,
  AlertTriangle,
  Shield,
  Lock,
  ArrowLeft,
  Maximize2
} from "lucide-react";
import Link from "next/link";
import { Id } from "../../../convex/_generated/dataModel";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useWindowManager } from "@/hooks/use-window-manager";
import MediaLibraryWindow from "./media-library-window";

type ViewState = "input" | "processing" | "success" | "error";
type TabType = "documents" | "data-export" | "account-deletion";
type ExportState = "idle" | "exporting" | "success" | "error";
type DeletionState = "idle" | "confirming" | "deleting" | "deleted" | "error";

interface ComplianceWindowProps {
  /** When true, shows back-to-desktop navigation (for /compliance route) */
  fullScreen?: boolean;
}

/**
 * Compliance Window
 *
 * GDPR-compliant tools for data export, account deletion, and document conversion.
 *
 * IMPORTANT: Account Deletion tab MUST always be accessible regardless of app licensing.
 * This is a GDPR requirement - users must always be able to delete their data.
 * Other features (PDF conversion, data export) may be tier-gated.
 */
export function ComplianceWindow({ fullScreen = false }: ComplianceWindowProps = {}) {
  // Tab state - default to account-deletion if Compliance app isn't fully available
  const { isAvailable: complianceAvailable, isLoading: licenseLoading } = useAppAvailability("compliance");
  const [activeTab, setActiveTab] = useState<TabType>(complianceAvailable ? "documents" : "account-deletion");

  // PDF converter state
  const [viewState, setViewState] = useState<ViewState>("input");
  const [markdownContent, setMarkdownContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [, setMediaId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Data export state
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [exportData, setExportData] = useState<string | null>(null);
  const [exportError, setExportError] = useState("");

  // Account deletion state
  const [deletionState, setDeletionState] = useState<DeletionState>("idle");
  const [deletionConfirmText, setDeletionConfirmText] = useState("");
  const [dataExportConfirmed, setDataExportConfirmed] = useState(false);
  const [deletionError, setDeletionError] = useState("");

  const { user, isLoading, sessionId, signOut } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id || user?.defaultOrgId;
  const { t } = useNamespaceTranslations("ui.compliance");
  const { openWindow } = useWindowManager();

  const convertToPdf = useAction(api.compliance.convertMarkdownToPdf);
  const exportUserData = useAction(api.compliance.exportUserData);
  const permanentlyDeleteAccount = useAction(api.compliance.permanentlyDeleteAccountImmediate);

  // NOTE: We do NOT use useAppAvailabilityGuard here because Account Deletion
  // MUST always be accessible per GDPR requirements. Instead, we conditionally
  // show/hide premium features based on licensing.

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

  // PDF Converter handlers
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

**Generated with l4yercak3 Compliance App**`);
  };

  // Data Export handlers
  const handleExportData = async () => {
    setExportState("exporting");
    setExportError("");

    try {
      const result = await exportUserData({ sessionId });

      if (result.success && result.exportData) {
        // Format JSON nicely
        const formattedData = JSON.stringify(result.exportData, null, 2);
        setExportData(formattedData);
        setExportState("success");
      } else {
        throw new Error("Data export failed");
      }
    } catch (error) {
      console.error("Data export error:", error);
      setExportError(
        error instanceof Error ? error.message : "Failed to export data. Please try again."
      );
      setExportState("error");
    }
  };

  const handleDownloadExport = () => {
    if (!exportData) return;

    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `l4yercak3-data-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResetExport = () => {
    setExportState("idle");
    setExportData(null);
    setExportError("");
  };

  // Account Deletion handlers
  const handleStartDeletion = () => {
    setDeletionState("confirming");
  };

  const handleCancelDeletion = () => {
    setDeletionState("idle");
    setDeletionConfirmText("");
    setDataExportConfirmed(false);
    setDeletionError("");
  };

  const handlePermanentDelete = async () => {
    if (deletionConfirmText !== "PERMANENTLY DELETE") {
      setDeletionError("Please type 'PERMANENTLY DELETE' exactly to confirm.");
      return;
    }

    if (!dataExportConfirmed) {
      setDeletionError("Please confirm that you have exported your data.");
      return;
    }

    setDeletionState("deleting");
    setDeletionError("");

    try {
      const result = await permanentlyDeleteAccount({
        sessionId,
        confirmationText: deletionConfirmText,
        dataExportConfirmed,
      });

      if (result.success) {
        setDeletionState("deleted");
        // Sign out after a short delay
        setTimeout(() => {
          signOut();
        }, 3000);
      } else {
        throw new Error("Account deletion failed");
      }
    } catch (error) {
      console.error("Account deletion error:", error);
      setDeletionError(
        error instanceof Error ? error.message : "Failed to delete account. Please try again."
      );
      setDeletionState("confirming");
    }
  };

  // Define tabs - Account Deletion is ALWAYS available (GDPR requirement)
  // Other tabs require Compliance app licensing
  const tabs = [
    { id: "documents" as const, label: "Documents", icon: FileText, requiresLicense: true },
    { id: "data-export" as const, label: "Data Export", icon: Database, requiresLicense: true },
    { id: "account-deletion" as const, label: "Account Deletion", icon: Trash2, requiresLicense: false },
  ];

  // Check if a tab is accessible
  const isTabAccessible = (tab: typeof tabs[0]) => {
    return !tab.requiresLicense || complianceAvailable;
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back to desktop link (full-screen mode only) */}
            {fullScreen && (
              <Link
                href="/"
                className="p-2 border-2 rounded transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--win95-text)",
                }}
                title="Back to Desktop"
              >
                <ArrowLeft size={20} />
              </Link>
            )}
            <Shield size={32} style={{ color: "var(--win95-highlight)" }} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--win95-text)" }}>
                Compliance Center
              </h1>
              <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                GDPR tools: export your data, manage documents, control your account
              </p>
            </div>
          </div>

          {/* Open full screen link (window mode only) */}
          {!fullScreen && (
            <Link
              href="/compliance"
              className="p-2 border-2 rounded transition-colors"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
              title="Open Full Screen"
            >
              <Maximize2 size={20} />
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b-2"
        style={{ borderColor: "var(--win95-border)" }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const accessible = isTabAccessible(tab);
          return (
            <button
              key={tab.id}
              onClick={() => accessible && setActiveTab(tab.id)}
              disabled={!accessible}
              title={!accessible ? "Upgrade to access this feature" : undefined}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all disabled:cursor-not-allowed"
              style={{
                background: isActive ? "var(--win95-bg)" : "var(--win95-surface)",
                color: !accessible
                  ? "var(--neutral-gray)"
                  : isActive
                    ? "var(--win95-highlight)"
                    : "var(--win95-text)",
                borderBottom: isActive ? "2px solid var(--win95-highlight)" : "2px solid transparent",
                opacity: accessible ? 1 : 0.6,
              }}
            >
              <Icon size={16} />
              {tab.label}
              {!accessible && <Lock size={12} className="ml-1" />}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* License Notice Banner - shown when Compliance isn't fully licensed */}
        {!complianceAvailable && !licenseLoading && (
          <div
            className="mb-4 p-3 border-2 rounded"
            style={{
              borderColor: "var(--win95-highlight)",
              background: "rgba(107, 70, 193, 0.1)",
            }}
          >
            <div className="flex items-start gap-3">
              <Shield size={20} style={{ color: "var(--win95-highlight)" }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                  Limited Access Mode
                </p>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Account Deletion is always available (GDPR). Upgrade to access Document Conversion and Data Export features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && complianceAvailable && (
          <>
            {viewState === "input" && (
              <div className="max-w-4xl mx-auto space-y-6">
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
          </>
        )}

        {/* Data Export Tab */}
        {activeTab === "data-export" && complianceAvailable && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div
              className="p-4 border-2 rounded"
              style={{
                borderColor: "var(--win95-highlight)",
                background: "var(--win95-bg-light)",
              }}
            >
              <div className="flex items-start gap-3">
                <Database size={24} style={{ color: "var(--win95-highlight)" }} className="flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                    Export Your Data (GDPR)
                  </h3>
                  <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                    Under GDPR Article 20, you have the right to receive your personal data in a structured,
                    commonly used, and machine-readable format. Click the button below to download all your data.
                  </p>
                </div>
              </div>
            </div>

            {exportState === "idle" && (
              <div className="text-center py-8">
                <p className="text-sm mb-4" style={{ color: "var(--win95-text)" }}>
                  Your export will include:
                </p>
                <ul className="text-sm mb-6 space-y-1" style={{ color: "var(--neutral-gray)" }}>
                  <li>• Profile information</li>
                  <li>• Organization memberships</li>
                  <li>• CRM contacts and organizations</li>
                  <li>• Invoices and transactions</li>
                  <li>• Media files metadata</li>
                  <li>• Workflows and projects</li>
                  <li>• Templates and events</li>
                  <li>• Audit logs</li>
                </ul>
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-2 px-6 py-3 rounded font-semibold transition-all mx-auto"
                  style={{
                    background: "var(--win95-highlight)",
                    color: "white",
                  }}
                >
                  <Download size={18} />
                  Export All My Data
                </button>
              </div>
            )}

            {exportState === "exporting" && (
              <div className="text-center py-12">
                <Loader2 size={64} className="animate-spin mx-auto mb-6" style={{ color: "var(--win95-highlight)" }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Exporting Your Data...
                </h2>
                <p style={{ color: "var(--neutral-gray)" }}>
                  This may take a moment depending on how much data you have.
                </p>
              </div>
            )}

            {exportState === "success" && exportData && (
              <div className="space-y-4">
                <div className="text-center">
                  <CheckCircle size={48} className="mx-auto mb-4" style={{ color: "var(--success)" }} />
                  <h2 className="text-xl font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                    Data Export Ready
                  </h2>
                  <p className="mb-4" style={{ color: "var(--neutral-gray)" }}>
                    Your data has been compiled and is ready for download.
                  </p>
                </div>

                <div
                  className="p-4 border-2 rounded max-h-64 overflow-auto font-mono text-xs"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-surface)",
                    color: "var(--win95-text)",
                  }}
                >
                  <pre>{exportData.substring(0, 2000)}...</pre>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleDownloadExport}
                    className="flex items-center gap-2 px-6 py-3 rounded font-semibold transition-all"
                    style={{
                      background: "var(--win95-highlight)",
                      color: "white",
                    }}
                  >
                    <Download size={18} />
                    Download JSON File
                  </button>

                  <button
                    onClick={handleResetExport}
                    className="flex items-center gap-2 px-6 py-3 rounded font-semibold transition-all border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-surface)",
                      color: "var(--win95-text)",
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {exportState === "error" && (
              <div className="text-center py-12">
                <AlertCircle size={64} className="mx-auto mb-6" style={{ color: "var(--error)" }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Export Failed
                </h2>
                <p className="mb-6" style={{ color: "var(--error)" }}>
                  {exportError}
                </p>
                <button
                  onClick={handleResetExport}
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
        )}

        {/* Account Deletion Tab */}
        {activeTab === "account-deletion" && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Warning Banner */}
            <div
              className="p-4 border-2 rounded"
              style={{
                borderColor: "var(--error)",
                background: "rgba(220, 38, 38, 0.1)",
              }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={24} style={{ color: "var(--error)" }} className="flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold mb-2" style={{ color: "var(--error)" }}>
                    Permanent Account Deletion
                  </h3>
                  <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                    This action will permanently delete your account and all associated data <strong>immediately</strong>.
                    Unlike the standard account deletion (which has a 2-week grace period), this action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {deletionState === "idle" && (
              <div className="space-y-6">
                <div
                  className="p-4 border-2 rounded"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg-light)",
                  }}
                >
                  <h4 className="font-semibold mb-3" style={{ color: "var(--win95-text)" }}>
                    Before you proceed:
                  </h4>
                  <ul className="text-sm space-y-2" style={{ color: "var(--neutral-gray)" }}>
                    <li>• <strong>Export your data first</strong> — Use the Data Export tab to download all your information</li>
                    <li>• <strong>This is irreversible</strong> — Your account, organizations, and all data will be permanently removed</li>
                    <li>• <strong>No grace period</strong> — Unlike standard deletion, you cannot restore your account after this</li>
                    <li>• <strong>Owned organizations will be archived</strong> — Other members will lose access</li>
                  </ul>
                </div>

                <div className="text-center">
                  <button
                    onClick={handleStartDeletion}
                    className="flex items-center gap-2 px-6 py-3 rounded font-semibold transition-all mx-auto"
                    style={{
                      background: "var(--error)",
                      color: "white",
                    }}
                  >
                    <Trash2 size={18} />
                    I Want to Permanently Delete My Account
                  </button>
                </div>
              </div>
            )}

            {deletionState === "confirming" && (
              <div className="space-y-6">
                <div
                  className="p-4 border-2 rounded"
                  style={{
                    borderColor: "var(--error)",
                    background: "rgba(220, 38, 38, 0.1)",
                  }}
                >
                  <h4 className="font-bold mb-4" style={{ color: "var(--error)" }}>
                    Final Confirmation Required
                  </h4>

                  {/* Checkbox */}
                  <label className="flex items-start gap-3 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dataExportConfirmed}
                      onChange={(e) => setDataExportConfirmed(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      I confirm that I have exported my data (or I don&apos;t need it) and I understand
                      that this action is permanent and cannot be undone.
                    </span>
                  </label>

                  {/* Confirmation Text */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                      Type <code className="px-1 py-0.5 rounded" style={{ background: "var(--win95-surface)" }}>PERMANENTLY DELETE</code> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deletionConfirmText}
                      onChange={(e) => setDeletionConfirmText(e.target.value)}
                      placeholder="PERMANENTLY DELETE"
                      className="w-full px-4 py-2 border-2 rounded font-mono"
                      style={{
                        borderColor: "var(--win95-border)",
                        background: "var(--win95-surface)",
                        color: "var(--win95-text)",
                      }}
                    />
                  </div>

                  {deletionError && (
                    <p className="text-sm mb-4" style={{ color: "var(--error)" }}>
                      {deletionError}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleCancelDeletion}
                    className="flex items-center gap-2 px-6 py-3 rounded font-semibold transition-all border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-surface)",
                      color: "var(--win95-text)",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handlePermanentDelete}
                    disabled={!dataExportConfirmed || deletionConfirmText !== "PERMANENTLY DELETE"}
                    className="flex items-center gap-2 px-6 py-3 rounded font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: "var(--error)",
                      color: "white",
                    }}
                  >
                    <Trash2 size={18} />
                    Delete My Account Forever
                  </button>
                </div>
              </div>
            )}

            {deletionState === "deleting" && (
              <div className="text-center py-12">
                <Loader2 size={64} className="animate-spin mx-auto mb-6" style={{ color: "var(--error)" }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Deleting Your Account...
                </h2>
                <p style={{ color: "var(--neutral-gray)" }}>
                  Please wait while we permanently remove all your data.
                </p>
              </div>
            )}

            {deletionState === "deleted" && (
              <div className="text-center py-12">
                <CheckCircle size={64} className="mx-auto mb-6" style={{ color: "var(--success)" }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Account Deleted
                </h2>
                <p className="mb-4" style={{ color: "var(--neutral-gray)" }}>
                  Your account has been permanently deleted. You will be logged out shortly.
                </p>
                <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                  Thank you for using l4yercak3. We wish you all the best.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
