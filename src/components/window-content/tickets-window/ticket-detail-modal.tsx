"use client";

import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { X, Download, Printer, User, Mail, Phone, Calendar, Loader2, Send, RefreshCw, UserCheck, Tag, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useNotification } from "@/hooks/use-notification";
import { useOrganizationCurrency } from "@/hooks/use-organization-currency";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import Image from "next/image";
import QRCode from "qrcode";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { EmailSendModal, type EmailSendConfig, type EmailSendResult } from "@/components/email-send-modal";

interface TicketDetailModalProps {
  ticket: Doc<"objects">;
  onClose: () => void;
}

export function TicketDetailModal({ ticket, onClose }: TicketDetailModalProps) {
  const { t } = useNamespaceTranslations("ui.tickets");
  const notification = useNotification();
  const [qrCode, setQrCode] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [latestPdfUrl, setLatestPdfUrl] = useState<string | undefined>(
    () => (ticket.customProperties?.pdfUrl as string | undefined)
  );

  // Email state - simplified to just show/hide modal
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Available ticket templates
  const ticketTemplates = [
    { code: "ticket_professional_v1", name: "Professional (Uses Your Branding)" },
    { code: "ticket_modern_v1", name: "Modern (Uses Your Branding)" },
    { code: "ticket_retro_v1", name: "Retro (Uses Your Branding)" },
    { code: "ticket_elegant_gold_v1", name: "Elegant Gold (Uses Your Branding)" },
    { code: "ticket_vip_premium_v1", name: "VIP Premium (Fixed Gold Colors)" },
  ];

  // Get current user and organization
  const { user, sessionId: userSessionId } = useAuth();
  const currentOrgId = user?.defaultOrgId;

  // Load organization locale settings for email language
  const orgLocaleSettings = useQuery(
    api.organizationOntology.getOrganizationSettings,
    currentOrgId ? { organizationId: currentOrgId, subtype: "locale" } : "skip"
  );

  // Extract language from organization settings (fallback to "de")
  const organizationLanguage = (() => {
    console.log("🌍 [Email Language] Organization locale settings:", orgLocaleSettings);
    if (!orgLocaleSettings || Array.isArray(orgLocaleSettings)) {
      console.log("🌍 [Email Language] No settings found, defaulting to: de");
      return "de";
    }
    const lang = orgLocaleSettings.customProperties?.language as string | undefined;
    console.log("🌍 [Email Language] Raw language from org settings:", lang);
    if (!lang) {
      console.log("🌍 [Email Language] Language not set, defaulting to: de");
      return "de";
    }
    // Normalize language code (e.g., "de-DE" → "de", "en-US" → "en")
    const normalized = lang.toLowerCase().split("-")[0];
    console.log("🌍 [Email Language] Normalized language:", normalized);
    // Ensure it's a supported language
    if (["de", "en", "es", "fr"].includes(normalized)) {
      console.log("🌍 [Email Language] ✅ Using language:", normalized);
      return normalized as "de" | "en" | "es" | "fr";
    }
    console.log("🌍 [Email Language] Unsupported language, defaulting to: de");
    return "de";
  })();

  // PDF generation actions
  const generateTicketPDF = useAction(api.pdfGeneration.generateTicketPDF);
  const regenerateTicketPDF = useAction(api.pdfGeneration.regenerateTicketPDF);

  // Get linked CRM contact if exists
  const crmContactId = ticket.customProperties?.crmContactId as Id<"objects"> | undefined;
  const linkedContact = useQuery(
    api.crmOntology.getContact,
    crmContactId && userSessionId
      ? { sessionId: userSessionId, contactId: crmContactId }
      : "skip"
  );

  // Get the product for this ticket
  const productId = ticket.customProperties?.productId as Id<"objects"> | undefined;
  const ticketProduct = useQuery(
    api.productOntology.getProduct,
    productId && userSessionId && currentOrgId
      ? { sessionId: userSessionId, productId }
      : "skip"
  );

  // Email actions
  const previewTicketEmail = useAction(api.ticketEmailService.previewTicketEmail);
  const sendTicketEmail = useAction(api.ticketEmailService.sendTicketConfirmationEmail);

  useEffect(() => {
    // Generate QR code for ticket
    const generateQRCode = async () => {
      try {
        // Create ticket verification URL or ticket ID
        const ticketData = JSON.stringify({
          id: ticket._id,
          holderName: ticket.customProperties?.holderName,
          holderEmail: ticket.customProperties?.holderEmail,
          eventId: ticket.customProperties?.eventId,
          ticketNumber: ticket.customProperties?.ticketNumber,
        });

        // Get theme colors for QR code
        const isDarkTheme = getComputedStyle(document.documentElement)
          .getPropertyValue('--win95-text')
          .trim() === '#ffffff';

        const qrDataUrl = await QRCode.toDataURL(ticketData, {
          width: 200,
          margin: 2,
          color: {
            dark: isDarkTheme ? "#ffffff" : "#000000", // Use theme-aware colors
            light: isDarkTheme ? "#2d2d2d" : "#ffffff",
          },
        });

        setQrCode(qrDataUrl);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      }
    };

    generateQRCode();
  }, [ticket]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get organization currency settings (SINGLE SOURCE OF TRUTH)
  const { currency: orgCurrency } = useOrganizationCurrency();

  // Currency formatting hook
  const { formatCurrency } = useFormatCurrency({
    currency: orgCurrency,
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      issued: { label: t("ui.tickets.status.issued"), color: "var(--success)" },
      redeemed: { label: t("ui.tickets.status.redeemed"), color: "var(--tone-accent-strong)" },
      cancelled: { label: t("ui.tickets.status.cancelled"), color: "var(--error)" },
      transferred: { label: t("ui.tickets.status.transferred"), color: "var(--tone-accent-strong)" },
    };
    const badge = badges[status as keyof typeof badges] || badges.issued;
    return (
      <span
        className="px-3 py-1 text-sm font-bold rounded-lg"
        style={{ background: badge.color, color: "var(--win95-titlebar-text)" }}
      >
        {badge.label}
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const customProps = ticket.customProperties || {};
    const pdfUrl = customProps.pdfUrl as string | undefined;

    // If PDF URL exists, trigger download
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `ticket-${ticket._id.substring(0, 12)}.pdf`;
      link.target = "_blank"; // Fallback if download attribute not supported
      link.click();
      return;
    }

    // Fallback: try to generate PDF if checkoutSessionId exists
    const checkoutSessionId = customProps.checkoutSessionId as Id<"objects"> | undefined;

    if (!checkoutSessionId) {
      notification.error(
        "No PDF Available",
        "Please regenerate the ticket PDF first."
      );
      return;
    }

    setIsDownloading(true);
    try {
      const pdf = await generateTicketPDF({
        ticketId: ticket._id,
        checkoutSessionId,
      });

      if (pdf) {
        // Create download link
        const link = document.createElement("a");
        link.href = `data:${pdf.contentType};base64,${pdf.content}`;
        link.download = pdf.filename;
        link.click();
      }
    } catch (error) {
      console.error("Failed to download ticket:", error);
      notification.error(
        t("ui.tickets.detail.error.download_failed"),
        error instanceof Error ? error.message : ""
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRegeneratePDF = async (templateCode?: string) => {
    if (!userSessionId) return;

    setIsRegenerating(true);
    try {
      const pdfAttachment = await regenerateTicketPDF({
        sessionId: userSessionId,
        ticketId: ticket._id,
        templateCode: templateCode || selectedTemplate || undefined,
      });

      if (pdfAttachment && pdfAttachment.content) {
        // Store the new PDF URL for email preview
        if (pdfAttachment.downloadUrl) {
          setLatestPdfUrl(pdfAttachment.downloadUrl);
        }

        // Convert base64 to blob and trigger download
        const byteCharacters = atob(pdfAttachment.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        // Trigger download instead of opening in new window
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `ticket-${ticket._id.substring(0, 12)}.pdf`;
        link.click();

        // Clean up the blob URL after download
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

        notification.success(
          "PDF Generated Successfully",
          "The PDF has been downloaded. You can also use the Download PDF button to download it again."
        );
      } else {
        notification.error("PDF Generation Failed", "Please try again.");
      }
    } catch (error) {
      console.error("Failed to regenerate PDF:", error);
      notification.error(
        "PDF Generation Failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  // Email handlers for EmailSendModal
  const handleEmailPreview = async (config: EmailSendConfig) => {
    if (!userSessionId) throw new Error("No valid session");

    return await previewTicketEmail({
      sessionId: userSessionId,
      ticketId: ticket._id,
      domainConfigId: config.domainConfigId,
      emailTemplateId: config.emailTemplateId,
      ticketPdfTemplateId: config.pdfTemplateId,
      language: config.language,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePdfPreview = async (config: EmailSendConfig) => {
    // Return the latest PDF URL (including regenerated PDFs)
    if (latestPdfUrl) {
      return { pdfUrl: latestPdfUrl };
    }
    return null;
  };

  const handleSendTestEmail = async (config: EmailSendConfig & { testEmail: string }): Promise<EmailSendResult> => {
    if (!userSessionId) throw new Error("No valid session");

    const result = await sendTicketEmail({
      sessionId: userSessionId,
      ticketId: ticket._id,
      domainConfigId: config.domainConfigId,
      emailTemplateId: config.emailTemplateId,
      ticketPdfTemplateId: config.pdfTemplateId,
      language: config.language,
      includePdfAttachment: config.includePdfAttachment,
      includeIcsAttachment: config.includeIcsAttachment,
      isTest: true,
      testRecipient: config.testEmail,
    });

    return {
      success: result.success,
      message: result.success
        ? `Test email sent to ${config.testEmail}`
        : "Failed to send test email",
      messageId: result.messageId,
      attachments: result.attachments,
    };
  };

  const handleSendRealEmail = async (config: EmailSendConfig): Promise<EmailSendResult> => {
    if (!userSessionId) throw new Error("No valid session");

    const customProps = ticket.customProperties || {};
    const recipientEmail = customProps.holderEmail || customProps.attendeeEmail;

    if (!recipientEmail) {
      throw new Error("No recipient email address found");
    }

    const result = await sendTicketEmail({
      sessionId: userSessionId,
      ticketId: ticket._id,
      domainConfigId: config.domainConfigId,
      emailTemplateId: config.emailTemplateId,
      ticketPdfTemplateId: config.pdfTemplateId,
      language: config.language,
      includePdfAttachment: config.includePdfAttachment,
      includeIcsAttachment: config.includeIcsAttachment,
      isTest: false,
    });

    return {
      success: result.success,
      message: result.success
        ? `Ticket sent successfully to ${recipientEmail}`
        : "Failed to send ticket email",
      messageId: result.messageId,
      attachments: result.attachments,
    };
  };

  const customProps = ticket.customProperties || {};
  const formResponses = customProps.formResponses || {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--modal-overlay-bg)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-xl border"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-bg)",
          boxShadow: "var(--modal-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 gap-3" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onClose}
              className="desktop-interior-button h-8 px-3 text-xs shrink-0"
              title={t("ui.tickets.button.back_to_list")}
            >
              <ArrowLeft size={14} />
              <span>{t("ui.tickets.button.back_to_list")}</span>
            </button>
            <h2 className="text-base font-bold truncate" style={{ color: "var(--tone-accent-strong)" }}>
              {ticket.name}
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              {getStatusBadge(ticket.status || "issued")}
              <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {customProps.ticketNumber
                  ? `${t("ui.tickets.detail.field.ticket_id")} #${customProps.ticketNumber}`
                  : t("ui.tickets.detail.field.ticket_number_na")}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="desktop-interior-button h-9 w-9 p-0 shrink-0"
            aria-label="Close"
          >
            <X size={20} style={{ color: "var(--window-document-text)" }} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(92vh-112px)] px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* First Column - QR Code and Actions */}
          <div className="space-y-4">
            {/* QR Code */}
            {qrCode && (
              <div
                className="border rounded-lg p-4 flex flex-col items-center"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--desktop-shell-accent)",
                }}
              >
                <Image
                  src={qrCode}
                  alt="Ticket QR Code"
                  width={192}
                  height={192}
                  className="w-48 h-48 mb-2"
                />
                <p className="text-xs text-center" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.tickets.detail.qr_scan")}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="desktop-interior-button w-full h-9"
                  style={{
                    color: "var(--window-document-text)",
                  }}
                >
                {isDownloading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">{t("ui.tickets.detail.button.downloading")}</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span className="text-sm">{t("ui.tickets.detail.button.download")}</span>
                  </>
                )}
              </button>
              <button
                onClick={handlePrint}
                className="desktop-interior-button w-full h-9"
                style={{
                  color: "var(--window-document-text)",
                }}
              >
                <Printer size={16} />
                <span className="text-sm">{t("ui.tickets.detail.button.print")}</span>
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="desktop-interior-button w-full h-9"
                style={{
                  background: "var(--success)",
                  color: "white",
                }}
              >
                <Send size={16} />
                <span className="text-sm font-bold">{t("ui.tickets.email.button.send")}</span>
              </button>

              {/* PDF Regeneration */}
              <div className="pt-4 border-t" style={{ borderColor: "var(--window-document-border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="change-template"
                    checked={showTemplatePicker}
                    onChange={(e) => setShowTemplatePicker(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <label
                    htmlFor="change-template"
                    className="text-xs cursor-pointer"
                    style={{ color: "var(--window-document-text)" }}
                  >
                    Change Template
                  </label>
                </div>

                {showTemplatePicker && (
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-2 py-2 border rounded-lg text-sm mb-2"
                    style={{
                      borderColor: "var(--window-document-border)",
                      background: "var(--win95-input-bg)",
                      color: "var(--window-document-text)",
                    }}
                  >
                    <option value="">Use Previous Template</option>
                    {ticketTemplates.map((tpl) => (
                      <option key={tpl.code} value={tpl.code}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => handleRegeneratePDF()}
                  disabled={isRegenerating}
                  className="desktop-interior-button w-full h-9"
                  style={{
                    background: "var(--tone-accent-strong)",
                    color: "var(--win95-titlebar-text)",
                  }}
                  title="Regenerate ticket PDF with current branding and settings"
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm font-bold">Generating...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      <span className="text-sm font-bold">Regenerate PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Second Column - Ticket Holder Info */}
          <div className="space-y-4">
            {/* Product Info */}
            {ticketProduct && (
              <div
                className="border rounded-lg p-4"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--desktop-shell-accent)",
                }}
              >
                <h3 className="font-bold text-sm mb-3" style={{ color: "var(--tone-accent-strong)" }}>
                  Product
                </h3>
                <div className="flex items-start gap-2">
                  <Tag size={16} className="mt-0.5" style={{ color: "var(--tone-accent-strong)" }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                      {ticketProduct.name}
                    </p>
                    {ticketProduct.description && (
                      <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                        {ticketProduct.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div
              className="border rounded-lg p-4"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--desktop-shell-accent)",
              }}
            >
              <h3 className="font-bold text-sm mb-3" style={{ color: "var(--tone-accent-strong)" }}>
                {t("ui.tickets.detail.section.holder")}
              </h3>

              <div className="space-y-3">
                {/* Name */}
                <div className="flex items-start gap-2">
                  <User size={16} className="mt-0.5" style={{ color: "var(--neutral-gray)" }} />
                  <div>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.tickets.detail.field.name")}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                      {customProps.holderName || t("ui.tickets.detail.field.not_provided")}
                    </p>
                  </div>
                </div>

                {/* Email */}
                {customProps.holderEmail && (
                  <div className="flex items-start gap-2">
                    <Mail size={16} className="mt-0.5" style={{ color: "var(--neutral-gray)" }} />
                    <div>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {t("ui.tickets.detail.field.email")}
                      </p>
                      <p className="text-sm" style={{ color: "var(--window-document-text)" }}>
                        {customProps.holderEmail}
                      </p>
                    </div>
                  </div>
                )}

                {/* Phone (from form responses) */}
                {formResponses.phone && (
                  <div className="flex items-start gap-2">
                    <Phone size={16} className="mt-0.5" style={{ color: "var(--neutral-gray)" }} />
                    <div>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {t("ui.tickets.detail.field.phone")}
                      </p>
                      <p className="text-sm" style={{ color: "var(--window-document-text)" }}>
                        {formResponses.phone}
                      </p>
                    </div>
                  </div>
                )}

                {/* Purchase Date */}
                {customProps.purchaseDate && (
                  <div className="flex items-start gap-2">
                    <Calendar
                      size={16}
                      className="mt-0.5"
                      style={{ color: "var(--neutral-gray)" }}
                    />
                    <div>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {t("ui.tickets.detail.field.purchased")}
                      </p>
                      <p className="text-sm" style={{ color: "var(--window-document-text)" }}>
                        {formatDate(customProps.purchaseDate)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Linked CRM Contact */}
                {linkedContact && (
                  <div className="flex items-start gap-2 pt-2 border-t" style={{ borderColor: "var(--window-document-border)" }}>
                    <UserCheck
                      size={16}
                      className="mt-0.5"
                      style={{ color: "var(--success)" }}
                    />
                    <div>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        CRM Contact
                      </p>
                      <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                        {linkedContact.name}
                      </p>
                      {(() => {
                        const contactEmail = (linkedContact.customProperties as Record<string, unknown> | undefined)?.email;
                        return contactEmail ? (
                          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                            {String(contactEmail)}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Information */}
            <div
              className="border rounded-lg p-4"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--desktop-shell-accent)",
              }}
            >
              <h3 className="font-bold text-sm mb-3" style={{ color: "var(--tone-accent-strong)" }}>
                {t("ui.tickets.detail.section.pricing")}
              </h3>

              <div className="space-y-2">
                {customProps.pricePaid !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.tickets.detail.field.base_price")}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                      {formatCurrency(customProps.pricePaid)}
                    </span>
                  </div>
                )}

                {customProps.paymentStatus && (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.tickets.detail.field.payment_status")}
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color:
                          customProps.paymentStatus === "awaiting_employer_payment"
                            ? "var(--tone-accent-strong)"
                            : "var(--success)",
                      }}
                    >
                      {customProps.paymentStatus === "awaiting_employer_payment"
                        ? t("ui.tickets.detail.payment.pending_employer")
                        : customProps.paymentStatus}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Third Column - Additional Information */}
          <div className="space-y-4">
            {/* Form Responses */}
            {Object.keys(formResponses).length > 0 && (
              <div
                className="border rounded-lg p-4"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--desktop-shell-accent)",
                }}
              >
                <h3 className="font-bold text-sm mb-3" style={{ color: "var(--tone-accent-strong)" }}>
                  {t("ui.tickets.detail.section.registration")}
                </h3>

                <div className="space-y-2">
                  {Object.entries(formResponses).map(([key, value]) => {
                    // Skip internal fields
                    if (
                      key === "name" ||
                      key === "email" ||
                      key === "phone" ||
                      typeof value === "object"
                    ) {
                      return null;
                    }

                    return (
                      <div key={key}>
                        <p className="text-xs capitalize" style={{ color: "var(--neutral-gray)" }}>
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </p>
                        <p className="text-sm" style={{ color: "var(--window-document-text)" }}>
                          {String(value)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Checkout Session Info */}
            {customProps.checkoutSessionId && (
              <div
                className="border rounded-lg p-4"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--desktop-shell-accent)",
                }}
              >
                <h3 className="font-bold text-sm mb-3" style={{ color: "var(--tone-accent-strong)" }}>
                  {t("ui.tickets.detail.section.transaction")}
                </h3>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.tickets.detail.field.checkout_session")}
                    </p>
                    <p
                      className="text-xs font-mono break-all"
                      style={{ color: "var(--window-document-text)" }}
                    >
                      {customProps.checkoutSessionId}
                    </p>
                  </div>

                  {customProps.totalTickets && customProps.ticketNumber && (
                    <div>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {t("ui.tickets.detail.field.ticket_number_of")
                          .replace("{number}", String(customProps.ticketNumber))
                          .replace("{total}", String(customProps.totalTickets))}
                      </p>
                    </div>
                  )}

                  {customProps.purchaseItemId && (
                    <div>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {t("ui.tickets.detail.field.purchase_item_id")}
                      </p>
                      <p
                        className="text-xs font-mono break-all"
                        style={{ color: "var(--window-document-text)" }}
                      >
                        {customProps.purchaseItemId}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* System Information */}
            <div
              className="border rounded-lg p-4"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--desktop-shell-accent)",
              }}
            >
              <h3 className="font-bold text-sm mb-3" style={{ color: "var(--tone-accent-strong)" }}>
                {t("ui.tickets.detail.section.system")}
              </h3>

              <div className="space-y-2">
                <div>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.tickets.detail.field.ticket_id")}
                  </p>
                  <p className="text-xs font-mono break-all" style={{ color: "var(--window-document-text)" }}>
                    {ticket._id}
                  </p>
                </div>

                <div>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.tickets.detail.field.created_at")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--window-document-text)" }}>
                    {formatDate(ticket.createdAt)}
                  </p>
                </div>

                {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                  <div>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.tickets.detail.field.last_updated")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--window-document-text)" }}>
                      {formatDate(ticket.updatedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Email Send Modal */}
        {showEmailModal && currentOrgId && (customProps.holderEmail || customProps.attendeeEmail) && (
          <EmailSendModal
            documentType="ticket"
            documentId={ticket._id}
            recipientEmail={(customProps.holderEmail || customProps.attendeeEmail) as string}
            recipientName={(customProps.holderName || ticket.name) as string}
            organizationId={currentOrgId as Id<"organizations">}
            emailTemplateCategory="all"
            pdfTemplateCategory="ticket"
            allowPdfAttachment={true}
            allowIcsAttachment={true}
            defaultLanguage={organizationLanguage}
            onPreview={handleEmailPreview}
            onPreviewPdf={handlePdfPreview}
            onSendTest={handleSendTestEmail}
            onSendReal={handleSendRealEmail}
            onClose={() => setShowEmailModal(false)}
            onSuccess={(result) => {
              notification.success(
                t("ui.tickets.email.button.send"),
                result.message
              );
              setShowEmailModal(false);
            }}
            translations={{
              title: t("ui.tickets.email.modal.title"),
              pdfTemplateLabel: "🎫 PDF Ticket Template",
              pdfAttachmentLabel: "Include PDF Ticket",
              icsAttachmentLabel: "Include ICS Calendar File",
              confirmSend: t("ui.tickets.email.confirm.send", {
                email: (customProps.holderEmail || customProps.attendeeEmail) as string
              }),
            }}
          />
        )}

      </div>
    </div>
  );
}
