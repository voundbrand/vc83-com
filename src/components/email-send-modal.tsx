"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { X, Send, Eye, Loader2 } from "lucide-react";
import { TemplateSelector } from "./template-selector";

/**
 * Email Send Modal Props
 *
 * Reusable modal for sending emails (invoices, tickets, certificates, etc.)
 */
export interface EmailSendModalProps {
  // Document info
  documentType: "invoice" | "ticket" | "certificate" | "receipt";
  documentId: Id<"objects">;
  recipientEmail: string;
  recipientName: string;
  organizationId: Id<"organizations">;

  // Customization
  emailTemplateCategory?: "luxury" | "minimal" | "internal" | "transactional" | "marketing" | "event" | "support" | "newsletter" | "all"; // All email template categories
  pdfTemplateCategory?: "invoice" | "ticket" | "certificate" | "receipt" | "badge" | "all";
  allowPdfAttachment?: boolean;
  allowIcsAttachment?: boolean;
  defaultLanguage?: "de" | "en" | "es" | "fr";

  // Email sending handlers (provided by parent)
  onPreview: (config: EmailSendConfig) => Promise<{ html: string; subject: string }>;
  onPreviewPdf?: (config: EmailSendConfig) => Promise<{ pdfUrl: string } | null>; // Optional PDF preview
  onSendTest: (config: EmailSendConfig & { testEmail: string }) => Promise<EmailSendResult>;
  onSendReal: (config: EmailSendConfig) => Promise<EmailSendResult>;

  // Callbacks
  onClose: () => void;
  onSuccess?: (result: EmailSendResult) => void;

  // Optional translations
  translations?: {
    title?: string;
    domainLabel?: string;
    systemDefaultsLabel?: string;
    emailTemplateLabel?: string;
    pdfTemplateLabel?: string;
    languageLabel?: string;
    attachmentsLabel?: string;
    pdfAttachmentLabel?: string;
    icsAttachmentLabel?: string;
    testEmailLabel?: string;
    testEmailPlaceholder?: string;
    previewButton?: string;
    testButton?: string;
    sendButton?: string;
    confirmSend?: string;
  };
}

/**
 * Email Send Configuration
 */
export interface EmailSendConfig {
  domainConfigId?: Id<"objects">;
  emailTemplateId?: Id<"objects">;
  pdfTemplateId?: Id<"objects">;
  language: "de" | "en" | "es" | "fr";
  includePdfAttachment: boolean;
  includeIcsAttachment: boolean;
}

/**
 * Email Send Result
 */
export interface EmailSendResult {
  success: boolean;
  message: string;
  messageId?: string;
  attachments?: {
    pdf: boolean;
    ics: boolean;
  };
}

/**
 * Email Send Modal Component
 *
 * Reusable modal for sending emails with:
 * - Domain configuration selector (with system defaults fallback)
 * - Email template selector
 * - PDF template selector
 * - Language selector
 * - Attachment controls
 * - Preview/Test/Send actions
 */
export function EmailSendModal({
  documentType,
  recipientEmail,
  recipientName,
  organizationId,
  emailTemplateCategory = "all",
  pdfTemplateCategory,
  allowPdfAttachment = true,
  allowIcsAttachment = false,
  defaultLanguage = "de",
  onPreview,
  onPreviewPdf,
  onSendTest,
  onSendReal,
  onClose,
  onSuccess,
  translations = {},
}: EmailSendModalProps) {
  // State
  const [selectedDomainId, setSelectedDomainId] = useState<Id<"objects"> | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"de" | "en" | "es" | "fr">(defaultLanguage);
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<Id<"objects"> | null>(null);
  const [selectedPdfTemplateId, setSelectedPdfTemplateId] = useState<Id<"objects"> | null>(null);
  const [includePdfAttachment, setIncludePdfAttachment] = useState(allowPdfAttachment);
  const [includeIcsAttachment, setIncludeIcsAttachment] = useState(allowIcsAttachment);
  const [emailAction, setEmailAction] = useState<"preview" | "previewPdf" | "test" | "send" | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string>("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [emailResult, setEmailResult] = useState<EmailSendResult | null>(null);

  // Create a stable session ID for domain configs query
  const domainConfigSessionId = useMemo(() => `email_modal_${Date.now()}`, []);

  // Get domain configs for organization
  const domainConfigs = useQuery(
    api.domainConfigOntology.listDomainConfigs,
    organizationId ? { sessionId: domainConfigSessionId, organizationId } : "skip"
  );

  // Build email config
  const getEmailConfig = (): EmailSendConfig => ({
    domainConfigId: selectedDomainId || undefined,
    emailTemplateId: selectedEmailTemplateId || undefined,
    pdfTemplateId: selectedPdfTemplateId || undefined,
    language: selectedLanguage,
    includePdfAttachment,
    includeIcsAttachment,
  });

  // Handlers
  const handlePreview = async () => {
    setEmailAction("preview");
    setIsSendingEmail(true);
    setEmailResult(null);
    setPdfPreviewUrl(""); // Clear PDF preview when showing email
    try {
      const result = await onPreview(getEmailConfig());
      setEmailPreviewHtml(result.html);
    } catch (error) {
      console.error("Failed to preview email:", error);
      setEmailResult({
        success: false,
        message: error instanceof Error ? error.message : "Preview failed",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!onPreviewPdf) return;

    setEmailAction("previewPdf");
    setIsSendingEmail(true);
    setEmailResult(null);
    setEmailPreviewHtml(""); // Clear email preview when showing PDF
    try {
      const result = await onPreviewPdf(getEmailConfig());
      if (result && result.pdfUrl) {
        setPdfPreviewUrl(result.pdfUrl);
      } else {
        setEmailResult({
          success: false,
          message: "No PDF available to preview",
        });
      }
    } catch (error) {
      console.error("Failed to preview PDF:", error);
      setEmailResult({
        success: false,
        message: error instanceof Error ? error.message : "PDF preview failed",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) return;

    setEmailAction("test");
    setIsSendingEmail(true);
    setEmailResult(null);
    try {
      const result = await onSendTest({
        ...getEmailConfig(),
        testEmail,
      });
      setEmailResult(result);
    } catch (error) {
      console.error("Failed to send test email:", error);
      setEmailResult({
        success: false,
        message: error instanceof Error ? error.message : "Test email failed",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendReal = async () => {
    const confirmMessage = translations.confirmSend || `Send email to ${recipientEmail}?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setEmailAction("send");
    setIsSendingEmail(true);
    setEmailResult(null);
    try {
      const result = await onSendReal(getEmailConfig());
      setEmailResult(result);
      if (result.success && onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      setEmailResult({
        success: false,
        message: error instanceof Error ? error.message : "Send failed",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Language options
  const languageOptions = [
    { value: "de", label: "🇩🇪 Deutsch (German)", emoji: "🇩🇪" },
    { value: "en", label: "🇬🇧 English", emoji: "🇬🇧" },
    { value: "es", label: "🇪🇸 Español (Spanish)", emoji: "🇪🇸" },
    { value: "fr", label: "🇫🇷 Français (French)", emoji: "🇫🇷" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.7)" }}
      onClick={onClose}
    >
      <div
        className="border-4 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
          boxShadow: "4px 4px 0 rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: "var(--win95-highlight)" }}>
            <Send size={20} className="inline mr-2" />
            {translations.title || `Send ${documentType} Email`}
          </h3>
          <button
            onClick={onClose}
            className="p-1 border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
            }}
          >
            <X size={16} style={{ color: "var(--win95-text)" }} />
          </button>
        </div>

        {/* Recipient Info */}
        <div className="mb-4 p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
            📧 Recipient
          </p>
          <p className="text-sm" style={{ color: "var(--win95-text)" }}>
            {recipientName} ({recipientEmail})
          </p>
        </div>

        {/* Domain Config Selector */}
        <div className="mb-4 p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            {translations.domainLabel || "📮 Email Domain Configuration"}
          </label>
          <select
            value={selectedDomainId || ""}
            onChange={(e) => setSelectedDomainId(e.target.value as Id<"objects">)}
            className="w-full px-3 py-2 border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-text)",
            }}
          >
            <option value="">
              {translations.systemDefaultsLabel || "🏠 System Defaults (tickets@mail.l4yercak3.com)"}
            </option>
            {domainConfigs && domainConfigs.length > 0 && (
              <>
                <option disabled>──────────</option>
                {domainConfigs.map((config) => {
                  const props = config.customProperties as any;
                  return (
                    <option key={config._id} value={config._id}>
                      {props?.domainName} ({props?.email?.senderEmail})
                    </option>
                  );
                })}
              </>
            )}
          </select>
          {!selectedDomainId && (
            <p className="text-xs mt-2" style={{ color: "var(--win95-text-secondary)" }}>
              ℹ️ Using platform defaults: Gold branding, luxury template
            </p>
          )}
        </div>

        {/* Email Template Selector */}
        <TemplateSelector
          category={emailTemplateCategory}
          templateType="email"
          value={selectedEmailTemplateId}
          onChange={(templateId) => setSelectedEmailTemplateId(templateId || null)}
          organizationId={organizationId}
          label={translations.emailTemplateLabel || "📧 Email Template"}
          description="Select which email template to use for this email. System default will be used if not selected."
          allowNull={true}
          nullLabel="Use system default email template"
        />

        {/* PDF Template Selector */}
        {pdfTemplateCategory && (
          <TemplateSelector
            category={pdfTemplateCategory}
            templateType="pdf"
            value={selectedPdfTemplateId}
            onChange={(templateId) => setSelectedPdfTemplateId(templateId || null)}
            organizationId={organizationId}
            label={translations.pdfTemplateLabel || `📄 PDF ${documentType} Template`}
            description={`Select which PDF template to use for the ${documentType} attachment. System default will be used if not selected.`}
            allowNull={true}
            nullLabel={`Use system default ${documentType} template`}
          />
        )}

        {/* Attachment Controls */}
        {(allowPdfAttachment || allowIcsAttachment) && (
          <div className="mb-4 p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              {translations.attachmentsLabel || "📎 Email Attachments"}
            </label>
            <div className="space-y-2">
              {allowPdfAttachment && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePdfAttachment}
                    onChange={(e) => setIncludePdfAttachment(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                    {translations.pdfAttachmentLabel || `Include PDF ${documentType} (${selectedPdfTemplateId ? 'Custom' : 'Default'} template)`}
                  </span>
                </label>
              )}
              {allowIcsAttachment && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeIcsAttachment}
                    onChange={(e) => setIncludeIcsAttachment(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                    {translations.icsAttachmentLabel || "Include ICS Calendar File"}
                  </span>
                </label>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
              Choose which files to attach to the email.
            </p>
          </div>
        )}

        {/* Language Selector */}
        <div className="mb-4 p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
          <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
            {translations.languageLabel || "🌐 Email Language"}
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as "de" | "en" | "es" | "fr")}
            className="w-full px-3 py-2 border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-text)",
            }}
          >
            {languageOptions.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
            Select the language for the email template.
          </p>
        </div>

        {/* Email Preview */}
        {emailAction === "preview" && emailPreviewHtml && (
          <div className="mb-4 border-2" style={{ borderColor: "var(--win95-border)", background: "white", maxHeight: "400px", overflow: "auto" }}>
            <div className="p-2 text-xs font-bold" style={{ background: "var(--win95-highlight)", color: "var(--win95-titlebar-text)" }}>
              📧 Email Preview
            </div>
            <iframe
              srcDoc={emailPreviewHtml}
              style={{
                width: "100%",
                height: "400px",
                border: "none",
                background: "white"
              }}
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        )}

        {/* PDF Preview */}
        {emailAction === "previewPdf" && pdfPreviewUrl && (
          <div className="mb-4 border-2" style={{ borderColor: "var(--win95-border)", background: "white", maxHeight: "500px", overflow: "auto" }}>
            <div className="p-2 text-xs font-bold" style={{ background: "var(--win95-highlight)", color: "var(--win95-titlebar-text)" }}>
              📄 PDF Preview
            </div>
            <iframe
              src={pdfPreviewUrl}
              style={{
                width: "100%",
                height: "500px",
                border: "none",
                background: "white"
              }}
              title="PDF Preview"
            />
          </div>
        )}

        {/* Test Email Input */}
        {emailAction === "test" && (
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              {translations.testEmailLabel || "📧 Test Email Address"}
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={translations.testEmailPlaceholder || "your.email@example.com"}
              className="w-full px-3 py-2 border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
                color: "var(--win95-text)",
              }}
            />
          </div>
        )}

        {/* Email Result */}
        {emailResult && (
          <div
            className="mb-4 p-3 border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: emailResult.success ? "var(--success)" : "var(--error)",
              color: "white",
            }}
          >
            <p className="text-sm font-bold">{emailResult.message}</p>
            {emailResult.attachments && (
              <p className="text-xs mt-2">
                📎 Attachments:
                {emailResult.attachments.pdf ? " ✅ PDF" : " ❌ PDF"}
                {emailResult.attachments.ics ? " ✅ ICS" : " ❌ ICS"}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={handlePreview}
            disabled={isSendingEmail}
            className="px-4 py-2 border-2 flex items-center justify-center gap-2 hover:bg-opacity-90 disabled:opacity-50 transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            {isSendingEmail && emailAction === "preview" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Eye size={16} />
            )}
            <span className="text-sm">📧 {translations.previewButton || "Preview Email"}</span>
          </button>

          <button
            onClick={handlePreviewPdf}
            disabled={isSendingEmail || !includePdfAttachment || !onPreviewPdf}
            className="px-4 py-2 border-2 flex items-center justify-center gap-2 hover:bg-opacity-90 disabled:opacity-50 transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
            title={!includePdfAttachment ? "Enable 'Include PDF' to preview" : !onPreviewPdf ? "PDF preview not available" : "Preview PDF attachment"}
          >
            {isSendingEmail && emailAction === "previewPdf" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Eye size={16} />
            )}
            <span className="text-sm">📄 Preview PDF</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">


          <button
            onClick={() => {
              setEmailAction("test");
              if (testEmail) {
                handleSendTest();
              }
            }}
            disabled={isSendingEmail}
            className="retro-button-primary px-4 py-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSendingEmail && emailAction === "test" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            <span className="text-sm">{translations.testButton || "Test"}</span>
          </button>

          <button
            onClick={handleSendReal}
            disabled={isSendingEmail}
            className="px-4 py-2 border-2 flex items-center justify-center gap-2 hover:bg-opacity-90 disabled:opacity-50 transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--success)",
              color: "var(--win95-titlebar-text)",
            }}
          >
            {isSendingEmail && emailAction === "send" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            <span className="text-sm">{translations.sendButton || "Send"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
