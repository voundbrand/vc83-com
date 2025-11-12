"use client";

import { useState, useEffect } from "react";
import { X, Eye, Monitor, Smartphone, Languages, Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { EmailLanguage, EmailTemplateMetadata } from "@/templates/emails/types";
import {
  getEmailTemplateMetadata,
  getEmailTemplate,
} from "@/templates/emails/registry";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateType: "email" | "pdf";
  templateCode: string;
  sampleTicketId?: Id<"objects">;
  sampleDomainId?: Id<"objects">;
  onSelect?: (templateCode: string) => void;
}

/**
 * UNIVERSAL TEMPLATE PREVIEW MODAL
 *
 * Shows preview of email or PDF templates before selection.
 * Features:
 * - Multi-language preview (for email templates)
 * - Desktop/mobile view toggle
 * - Live preview with mock data
 * - Template metadata display
 * - Future-proof for PDF templates
 */
export function TemplatePreviewModal({
  isOpen,
  onClose,
  templateType,
  templateCode,
  sampleTicketId,
  sampleDomainId,
  onSelect,
}: TemplatePreviewModalProps) {
  const { t } = useNamespaceTranslations("ui.templates");
  const [selectedLanguage, setSelectedLanguage] = useState<EmailLanguage>("en");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [isLoading, setIsLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [templateMetadata, setTemplateMetadata] = useState<EmailTemplateMetadata | null>(null);

  // Get email template data (for preview generation)
  const getEmailTemplateData = useAction(api.emailTemplateRenderer.getEmailTemplateData);

  // Load template preview when modal opens or language changes
  useEffect(() => {
    if (!isOpen) return;

    const loadPreview = async () => {
      setIsLoading(true);
      try {
        if (templateType === "email") {
          // Get template metadata
          const metadata = getEmailTemplateMetadata(templateCode);
          setTemplateMetadata(metadata);

          // For email templates, we need to generate the HTML
          if (sampleTicketId && sampleDomainId) {
            // Use real ticket data
            const sessionId = `preview_${Date.now()}`;
            const templateData = await getEmailTemplateData({
              sessionId,
              ticketId: sampleTicketId,
              domainConfigId: sampleDomainId,
              language: selectedLanguage,
            });

            // Generate HTML using the template
            const template = getEmailTemplate(templateCode);
            const result = template({
              ticket: templateData.ticket,
              event: templateData.event,
              attendee: templateData.attendee,
              domain: templateData.domain,
              branding: templateData.branding,
              language: selectedLanguage,
            });

            setPreviewHtml(result.html);
          } else {
            // Use mock data
            const mockData = createMockEmailData(selectedLanguage);
            const template = getEmailTemplate(templateCode);
            const result = template(mockData);
            setPreviewHtml(result.html);
          }
        } else if (templateType === "pdf") {
          // TODO: PDF template preview
          // For now, show a placeholder
          setPreviewHtml(`
            <div style="padding: 40px; text-align: center; font-family: system-ui, sans-serif;">
              <h2>PDF Template Preview</h2>
              <p>Template: ${templateCode}</p>
              <p>PDF preview coming soon...</p>
            </div>
          `);
        }
      } catch (error) {
        console.error("Failed to load template preview:", error);
        setPreviewHtml(`
          <div style="padding: 40px; text-align: center; color: red; font-family: system-ui, sans-serif;">
            <h2>Preview Error</h2>
            <p>${error instanceof Error ? error.message : "Failed to load preview"}</p>
          </div>
        `);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [isOpen, templateCode, templateType, selectedLanguage, sampleTicketId, sampleDomainId, getEmailTemplateData]);

  const handleSelect = () => {
    if (onSelect) {
      onSelect(templateCode);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-6xl max-h-[95vh] flex flex-col border-4"
        style={{
          backgroundColor: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
          boxShadow: "8px 8px 0 rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b-4 flex items-center justify-between"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-titlebar)",
            color: "var(--win95-titlebar-text)",
          }}
        >
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Eye size={16} />
            {t("ui.templates.preview.title", { name: templateMetadata?.name || templateCode })}
          </h3>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div
          className="px-4 py-2 border-b-2 flex items-center justify-between gap-4"
          style={{
            borderColor: "var(--win95-border)",
            backgroundColor: "var(--win95-bg-light)",
          }}
        >
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("desktop")}
              className={`px-3 py-1 text-xs font-bold border-2 transition-colors flex items-center gap-1 ${
                viewMode === "desktop" ? "opacity-100" : "opacity-50"
              }`}
              style={{
                borderColor: "var(--win95-border)",
                background: viewMode === "desktop" ? "var(--win95-highlight)" : "var(--win95-button-face)",
                color: viewMode === "desktop" ? "white" : "var(--win95-text)",
              }}
            >
              <Monitor size={12} />
              {t("ui.templates.preview.view.desktop")}
            </button>
            <button
              onClick={() => setViewMode("mobile")}
              className={`px-3 py-1 text-xs font-bold border-2 transition-colors flex items-center gap-1 ${
                viewMode === "mobile" ? "opacity-100" : "opacity-50"
              }`}
              style={{
                borderColor: "var(--win95-border)",
                background: viewMode === "mobile" ? "var(--win95-highlight)" : "var(--win95-button-face)",
                color: viewMode === "mobile" ? "white" : "var(--win95-text)",
              }}
            >
              <Smartphone size={12} />
              {t("ui.templates.preview.view.mobile")}
            </button>
          </div>

          {/* Language Switcher (for email templates) */}
          {templateType === "email" && templateMetadata && (
            <div className="flex items-center gap-2">
              <Languages size={14} style={{ color: "var(--win95-text)" }} />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as EmailLanguage)}
                className="px-2 py-1 text-xs border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  backgroundColor: "var(--win95-input-bg)",
                  color: "var(--win95-text)",
                }}
              >
                {templateMetadata.supportedLanguages.map((lang: EmailLanguage) => (
                  <option key={lang} value={lang}>
                    {languageLabels[lang]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Template Info */}
          {templateMetadata && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
              <span className="px-2 py-1 rounded border" style={{ borderColor: "var(--win95-border)" }}>
                {templateMetadata.category}
              </span>
              <span>v{templateMetadata.version}</span>
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div
          className="flex-1 overflow-auto p-4"
          style={{
            backgroundColor: "var(--win95-bg-dark)",
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin mx-auto mb-2" style={{ color: "var(--win95-highlight)" }} />
                <p className="text-xs" style={{ color: "var(--win95-text)" }}>{t("ui.templates.preview.loading")}</p>
              </div>
            </div>
          ) : (
            <div
              className="mx-auto border-4 overflow-auto"
              style={{
                width: viewMode === "desktop" ? "100%" : "375px",
                maxWidth: viewMode === "desktop" ? "800px" : "375px",
                minHeight: "600px",
                borderColor: "var(--win95-border)",
                backgroundColor: "white",
                boxShadow: "4px 4px 0 rgba(0,0,0,0.2)",
              }}
            >
              <iframe
                srcDoc={previewHtml}
                style={{
                  width: "100%",
                  minHeight: "600px",
                  border: "none",
                  background: "white",
                }}
                title="Template Preview"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>

        {/* Footer with metadata and actions */}
        <div
          className="px-4 py-3 border-t-4 flex items-center justify-between"
          style={{
            borderColor: "var(--win95-border)",
            backgroundColor: "var(--win95-bg-light)",
          }}
        >
          {/* Template Description */}
          {templateMetadata && (
            <div className="flex-1 mr-4">
              <p className="text-xs" style={{ color: "var(--win95-text)" }}>
                {templateMetadata.description}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                By {templateMetadata.author}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border-2"
              style={{
                backgroundColor: "var(--win95-button-face)",
                color: "var(--win95-text)",
                borderColor: "var(--win95-border)",
              }}
            >
              {t("ui.templates.preview.button.close")}
            </button>
            {onSelect && (
              <button
                onClick={handleSelect}
                className="px-4 py-2 text-xs font-semibold border-2"
                style={{
                  backgroundColor: "var(--success)",
                  color: "white",
                  borderColor: "var(--win95-border)",
                }}
              >
                {t("ui.templates.preview.button.select")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Language labels for display
 */
const languageLabels: Record<EmailLanguage, string> = {
  de: "🇩🇪 Deutsch (German)",
  en: "🇬🇧 English",
  es: "🇪🇸 Español (Spanish)",
  fr: "🇫🇷 Français (French)",
};

/**
 * Create mock email data for preview (when no real ticket is provided)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockEmailData(language: EmailLanguage): any {
  return {
    ticket: {
      _id: "mock_ticket_id" as Id<"objects">,
      name: "Sample Ticket",
      ticketNumber: "TKT-001234",
      status: "issued",
      customProperties: {
        guestCount: 2,
        attendeeFirstName: "John",
        attendeeLastName: "Doe",
        attendeeEmail: "john.doe@example.com",
        purchaseDate: Date.now(),
        pricePaid: 5000, // 50.00 EUR in cents
      },
    },
    event: {
      _id: "mock_event_id" as Id<"objects">,
      name: "Exclusive Cigar & Whiskey Evening",
      customProperties: {
        startDate: "Saturday, December 21, 2024",
        startTime: "19:00",
        location: "The Gentleman's Lounge, Mainz",
        durationHours: 4,
        description: "An evening of premium cigars, fine whiskey, and distinguished company.",
      },
    },
    attendee: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      guestCount: 2,
    },
    domain: {
      domainName: "pluseins.gg",
      siteUrl: "https://pluseins.gg",
      mapsUrl: "https://maps.app.goo.gl/example",
    },
    branding: {
      primaryColor: "#d4af37", // Gold
      secondaryColor: "#8b7355", // Bronze
      accentColor: "#ffffff",
      logoUrl: undefined,
    },
    language,
    isTest: true,
  };
}
