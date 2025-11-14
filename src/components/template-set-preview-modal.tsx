"use client";

import { useState, useEffect } from "react";
import { X, Package, CheckCircle, FileText, Receipt, Mail, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface TemplateSetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateSetId: Id<"objects">;
  onUseSet?: () => void;
  t: (key: string) => string; // Translation function passed from parent
}

/**
 * Template Set Preview Modal
 *
 * Shows all 3 templates (ticket, invoice, email) side-by-side for preview.
 * Allows users to see the complete template set before using it.
 *
 * Layout:
 * ```
 * ┌─ VIP Premium Set Preview ──────────────────────────────┐
 * │                                                         │
 * │  📦 VIP Premium Set                                     │
 * │  Luxury event suite for premium customers              │
 * │                                                         │
 * │  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
 * │  │ 🎫 Ticket  │  │ 💰 Invoice │  │ 📧 Email   │       │
 * │  │            │  │            │  │            │       │
 * │  │  [Large    │  │  [Large    │  │  [Large    │       │
 * │  │   Preview] │  │   Preview] │  │   Preview] │       │
 * │  │            │  │            │  │            │       │
 * │  └────────────┘  └────────────┘  └────────────┘       │
 * │                                                         │
 * │  [Use This Set]  [Close]                               │
 * └─────────────────────────────────────────────────────────┘
 * ```
 */
export function TemplateSetPreviewModal({
  isOpen,
  onClose,
  templateSetId,
  onUseSet,
  t,
}: TemplateSetPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"ticket" | "invoice" | "email">("ticket");
  const [previewHtml, setPreviewHtml] = useState<{ ticket?: string; invoice?: string; email?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch template set details with linked templates
  const templateSetData = useQuery(
    api.templateSetQueries.getTemplateSetById,
    isOpen ? { setId: templateSetId } : "skip"
  );

  const templateSet = templateSetData?.set;
  const templates = templateSetData?.templates;

  // Load template previews when templates are available
  useEffect(() => {
    if (!templates) return;

    const loadPreviews = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const previews: { ticket?: string; invoice?: string; email?: string } = {};

        // Load ticket template preview (PDF)
        if (templates.ticket) {
          try {
            const pdfRegistry = await import("../../convex/pdfTemplateRegistry");
            const templateRenderer = await import("@/lib/template-renderer");

            const getTemplateByCode = pdfRegistry.getTemplateByCode;
            const renderTemplate = templateRenderer.renderTemplate;
            const createMockTicketData = templateRenderer.createMockTicketData;

            const templateCode = templates.ticket.customProperties?.templateCode as string;
            if (templateCode) {
              const template = getTemplateByCode(templateCode);
              if (template) {
                const mockData = createMockTicketData(templateCode);
                const renderedHtml = renderTemplate(template.template.html, mockData);
                const renderedCss = renderTemplate(template.template.css, mockData);
                previews.ticket = `
                  <!DOCTYPE html>
                  <html>
                    <head><style>${renderedCss}</style></head>
                    <body>${renderedHtml}</body>
                  </html>
                `;
              }
            }
          } catch (err) {
            console.error("Failed to load ticket template:", err);
          }
        }

        // Load invoice template preview (PDF)
        if (templates.invoice) {
          try {
            const { getTemplateByCode } = await import("../../convex/pdfTemplateRegistry");
            const { renderTemplate, createMockInvoiceData } = await import("@/lib/template-renderer");

            const templateCode = templates.invoice.customProperties?.templateCode as string;
            if (templateCode) {
              const template = getTemplateByCode(templateCode);
              if (template) {
                const mockData = createMockInvoiceData(templateCode);
                const renderedHtml = renderTemplate(template.template.html, mockData);
                const renderedCss = renderTemplate(template.template.css, mockData);
                previews.invoice = `
                  <!DOCTYPE html>
                  <html>
                    <head><style>${renderedCss}</style></head>
                    <body>${renderedHtml}</body>
                  </html>
                `;
              }
            }
          } catch (err) {
            console.error("Failed to load invoice template:", err);
          }
        }

        // Load email template preview
        if (templates.email) {
          try {
            const { getEmailTemplate } = await import("@/templates/emails/registry");
            const templateCode = templates.email.customProperties?.templateCode as string;
            if (templateCode) {
              const emailTemplate = getEmailTemplate(templateCode);
              if (emailTemplate) {
                const mockData = createMockEmailData();
                const result = emailTemplate(mockData);
                previews.email = result.html;
              }
            }
          } catch (err) {
            console.error("Failed to load email template:", err);
          }
        }

        setPreviewHtml(previews);
      } catch (err) {
        console.error("Failed to load template previews:", err);
        setError("Failed to load previews");
      } finally {
        setIsLoading(false);
      }
    };

    loadPreviews();
  }, [templates]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div
        className="border-2 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--win95-bg)",
          borderColor: "var(--win95-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b-2 sticky top-0 z-10"
          style={{
            backgroundColor: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <Package size={20} style={{ color: "var(--win95-highlight)" }} />
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                {templateSet?.name || t("ui.templates.template_set.preview.title")}
              </h3>
              {templateSet?.description && (
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  {templateSet.description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: "var(--neutral-gray)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--win95-text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--neutral-gray)")}
          >
            <X size={24} />
          </button>
        </div>

        {/* Template Tabs */}
        <div
          className="flex border-b-2 px-4 gap-2 sticky top-[72px] z-10"
          style={{
            backgroundColor: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
          }}
        >
          <button
            onClick={() => setActiveTab("ticket")}
            className="px-4 py-2 text-xs font-bold border-2 border-b-0 -mb-[2px] transition-colors"
            style={{
              borderColor: activeTab === "ticket" ? "var(--win95-border)" : "transparent",
              backgroundColor: activeTab === "ticket" ? "var(--win95-bg)" : "var(--win95-bg-light)",
              color: activeTab === "ticket" ? "var(--win95-text)" : "var(--neutral-gray)",
              borderBottomColor: activeTab === "ticket" ? "var(--win95-bg)" : "var(--win95-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <FileText size={14} />
              {t("ui.templates.template_set.preview.ticket_tab")}
            </div>
          </button>
          <button
            onClick={() => setActiveTab("invoice")}
            className="px-4 py-2 text-xs font-bold border-2 border-b-0 -mb-[2px] transition-colors"
            style={{
              borderColor: activeTab === "invoice" ? "var(--win95-border)" : "transparent",
              backgroundColor: activeTab === "invoice" ? "var(--win95-bg)" : "var(--win95-bg-light)",
              color: activeTab === "invoice" ? "var(--win95-text)" : "var(--neutral-gray)",
              borderBottomColor: activeTab === "invoice" ? "var(--win95-bg)" : "var(--win95-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <Receipt size={14} />
              {t("ui.templates.template_set.preview.invoice_tab")}
            </div>
          </button>
          <button
            onClick={() => setActiveTab("email")}
            className="px-4 py-2 text-xs font-bold border-2 border-b-0 -mb-[2px] transition-colors"
            style={{
              borderColor: activeTab === "email" ? "var(--win95-border)" : "transparent",
              backgroundColor: activeTab === "email" ? "var(--win95-bg)" : "var(--win95-bg-light)",
              color: activeTab === "email" ? "var(--win95-text)" : "var(--neutral-gray)",
              borderBottomColor: activeTab === "email" ? "var(--win95-bg)" : "var(--win95-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <Mail size={14} />
              {t("ui.templates.template_set.preview.email_tab")}
            </div>
          </button>
        </div>

        {/* Preview Content */}
        <div className="p-6">
          {activeTab === "ticket" && (
            <div>
              <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
                {t("ui.templates.template_set.preview.ticket_title")}
              </h4>
              {templates?.ticket ? (
                <div
                  className="border-2 rounded overflow-hidden"
                  style={{
                    borderColor: "var(--win95-border)",
                    backgroundColor: "white",
                    minHeight: "500px",
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
                    </div>
                  ) : error || !previewHtml.ticket ? (
                    <div className="text-center py-12">
                      <FileText size={64} style={{ color: "var(--neutral-gray)" }} className="mx-auto mb-4" />
                      <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                        {templates.ticket.name}
                      </p>
                      <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
                        {error || t("ui.templates.template_set.preview.placeholder")}
                      </p>
                    </div>
                  ) : (
                    <iframe
                      srcDoc={previewHtml.ticket}
                      style={{
                        width: "100%",
                        height: "500px",
                        border: "none",
                        backgroundColor: "white",
                      }}
                      title="Ticket template preview"
                      sandbox="allow-same-origin"
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: "var(--neutral-gray)" }}>
                  <p className="text-sm">{t("ui.templates.template_set.preview.no_ticket")}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "invoice" && (
            <div>
              <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
                {t("ui.templates.template_set.preview.invoice_title")}
              </h4>
              {templates?.invoice ? (
                <div
                  className="border-2 rounded overflow-hidden"
                  style={{
                    borderColor: "var(--win95-border)",
                    backgroundColor: "white",
                    minHeight: "500px",
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
                    </div>
                  ) : error || !previewHtml.invoice ? (
                    <div className="text-center py-12">
                      <Receipt size={64} style={{ color: "var(--neutral-gray)" }} className="mx-auto mb-4" />
                      <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                        {templates.invoice.name}
                      </p>
                      <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
                        {error || t("ui.templates.template_set.preview.placeholder")}
                      </p>
                    </div>
                  ) : (
                    <iframe
                      srcDoc={previewHtml.invoice}
                      style={{
                        width: "100%",
                        height: "500px",
                        border: "none",
                        backgroundColor: "white",
                      }}
                      title="Invoice template preview"
                      sandbox="allow-same-origin"
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: "var(--neutral-gray)" }}>
                  <p className="text-sm">{t("ui.templates.template_set.preview.no_invoice")}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "email" && (
            <div>
              <h4 className="text-sm font-bold mb-3" style={{ color: "var(--win95-text)" }}>
                {t("ui.templates.template_set.preview.email_title")}
              </h4>
              {templates?.email ? (
                <div
                  className="border-2 rounded overflow-hidden"
                  style={{
                    borderColor: "var(--win95-border)",
                    backgroundColor: "white",
                    minHeight: "500px",
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={32} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
                    </div>
                  ) : error || !previewHtml.email ? (
                    <div className="text-center py-12">
                      <Mail size={64} style={{ color: "var(--neutral-gray)" }} className="mx-auto mb-4" />
                      <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                        {templates.email.name}
                      </p>
                      <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
                        {error || t("ui.templates.template_set.preview.placeholder")}
                      </p>
                    </div>
                  ) : (
                    <iframe
                      srcDoc={previewHtml.email}
                      style={{
                        width: "100%",
                        height: "500px",
                        border: "none",
                        backgroundColor: "white",
                      }}
                      title="Email template preview"
                      sandbox="allow-same-origin"
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: "var(--neutral-gray)" }}>
                  <p className="text-sm">{t("ui.templates.template_set.preview.no_email")}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="flex gap-3 p-4 border-t-2 sticky bottom-0"
          style={{
            backgroundColor: "var(--win95-bg)",
            borderColor: "var(--win95-border)",
          }}
        >
          {onUseSet && (
            <button
              onClick={onUseSet}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded transition-colors"
              style={{
                backgroundColor: "var(--win95-highlight)",
                color: "var(--win95-titlebar-text)",
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: "color-mix(in srgb, var(--win95-highlight) 80%, black)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--win95-highlight) 90%, black)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--win95-highlight)";
              }}
            >
              <CheckCircle size={16} />
              {t("ui.templates.template_set.preview.button.use_set")}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold rounded transition-colors"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              color: "var(--win95-text)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderColor: "var(--win95-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--win95-bg-light) 95%, black)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--win95-bg-light)";
            }}
          >
            {t("ui.templates.preview.button.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Create mock email data for preview
 */
function createMockEmailData() {
  return {
    ticket: {
      _id: "mock_ticket_id" as Id<"objects">,
      name: "Sample Ticket",
      ticketNumber: "TKT-001234",
      status: "issued" as const,
      customProperties: {
        guestCount: 2,
        attendeeFirstName: "John",
        attendeeLastName: "Doe",
        attendeeEmail: "john.doe@example.com",
        purchaseDate: Date.now(),
        pricePaid: 5000,
      },
    },
    event: {
      _id: "mock_event_id" as Id<"objects">,
      name: "Exclusive VIP Event",
      customProperties: {
        startDate: "Saturday, December 21, 2024",
        startTime: "19:00",
        location: "Grand Venue, Main Street",
        durationHours: 4,
        description: "An unforgettable evening of luxury and entertainment",
      },
    },
    attendee: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      guestCount: 2,
    },
    domain: {
      domainName: "example.com",
      siteUrl: "https://example.com",
      mapsUrl: "https://maps.google.com",
    },
    branding: {
      primaryColor: "#6B46C1",
      secondaryColor: "#9F7AEA",
      accentColor: "#F59E0B",
      logoUrl: undefined,
    },
    language: "en" as const,
    isTest: true,
  };
}
