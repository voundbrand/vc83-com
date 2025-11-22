"use client";

import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { X, Download, Printer, User, Mail, Phone, Calendar, Loader2, Send, Eye } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useNotification } from "@/hooks/use-notification";
import Image from "next/image";
import QRCode from "qrcode";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { TemplateSelector } from "@/components/template-selector";

interface TicketDetailModalProps {
  ticket: Doc<"objects">;
  onClose: () => void;
}

export function TicketDetailModal({ ticket, onClose }: TicketDetailModalProps) {
  const { t } = useNamespaceTranslations("ui.tickets");
  const notification = useNotification();
  const [qrCode, setQrCode] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);

  // Email state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAction, setEmailAction] = useState<"preview" | "test" | "send" | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [emailResult, setEmailResult] = useState<{success: boolean; message: string; attachments?: {pdf: boolean; ics: boolean}} | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<Id<"objects"> | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"de" | "en" | "es" | "fr">("de");
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<Id<"objects"> | null>(null);
  const [selectedPdfTemplateId, setSelectedPdfTemplateId] = useState<Id<"objects"> | null>(null);

  // Attachment controls
  const [includePdfAttachment, setIncludePdfAttachment] = useState(true);
  const [includeIcsAttachment, setIncludeIcsAttachment] = useState(true);

  // Get current user and organization
  const { user, sessionId: userSessionId } = useAuth();
  const currentOrgId = user?.defaultOrgId;

  // Create a stable session ID for domain configs query (doesn't need auth)
  const domainConfigSessionId = useMemo(() => `ticket_modal_${Date.now()}`, []);

  // PDF generation action
  const generateTicketPDF = useAction(api.pdfGeneration.generateTicketPDF);

  // Email actions
  const previewTicketEmail = useAction(api.ticketEmailService.previewTicketEmail);
  const sendTicketEmail = useAction(api.ticketEmailService.sendTicketConfirmationEmail);

  // Get domain configs for organization
  const domainConfigs = useQuery(
    api.domainConfigOntology.listDomainConfigs,
    currentOrgId ? { sessionId: domainConfigSessionId, organizationId: currentOrgId as Id<"organizations"> } : "skip"
  );

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

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      issued: { label: t("ui.tickets.status.issued"), color: "var(--success)" },
      redeemed: { label: t("ui.tickets.status.redeemed"), color: "var(--win95-highlight)" },
      cancelled: { label: t("ui.tickets.status.cancelled"), color: "var(--error)" },
      transferred: { label: t("ui.tickets.status.transferred"), color: "var(--win95-highlight)" },
    };
    const badge = badges[status as keyof typeof badges] || badges.issued;
    return (
      <span
        className="px-3 py-1 text-sm font-bold rounded"
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
    const checkoutSessionId = customProps.checkoutSessionId as Id<"objects"> | undefined;

    if (!checkoutSessionId) {
      notification.error(
        t("ui.tickets.detail.error.no_checkout_session"),
        ""
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

  const handleSendEmail = () => {
    // Domain config is now optional - system defaults will be used if not selected
    setShowEmailModal(true);
    setEmailResult(null);
  };

  const handleEmailPreview = async () => {
    // Domain is now optional - system defaults will be used if not selected
    setEmailAction("preview");
    setIsSendingEmail(true);
    try {
      if (!userSessionId) {
        throw new Error("No valid session");
      }

      const result = await previewTicketEmail({
        sessionId: userSessionId,
        ticketId: ticket._id,
        domainConfigId: selectedDomainId || undefined, // undefined = use system defaults
        emailTemplateId: selectedEmailTemplateId || undefined, // undefined = use default template
        language: selectedLanguage,
        ticketPdfTemplateId: selectedPdfTemplateId || undefined, // PDF template for ticket attachment
      });

      setEmailPreviewHtml(result.html);
    } catch (error) {
      console.error("Failed to preview email:", error);
      notification.error(
        t("ui.tickets.email.error.preview_failed"),
        error instanceof Error ? error.message : ""
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    // Domain is optional now, only validate required fields
    if (!testEmail || !userSessionId) return;

    setEmailAction("test");
    setIsSendingEmail(true);
    setEmailResult(null);
    try {
      const result = await sendTicketEmail({
        sessionId: userSessionId,
        ticketId: ticket._id,
        domainConfigId: selectedDomainId || undefined, // undefined = use system defaults
        emailTemplateId: selectedEmailTemplateId || undefined, // undefined = use default template
        ticketPdfTemplateId: selectedPdfTemplateId || undefined, // PDF template for ticket attachment
        isTest: true,
        testRecipient: testEmail,
        language: selectedLanguage,
        includePdfAttachment,
        includeIcsAttachment,
      });

      if (result.success) {
        const attachmentInfo = result.attachments
          ? `\nAttachments: ${result.attachments.pdf ? '✅ PDF' : '❌ PDF'}, ${result.attachments.ics ? '✅ ICS' : '❌ ICS'}`
          : '';
        const message = t("ui.tickets.email.success.test_sent", { email: testEmail }) + attachmentInfo;
        setEmailResult({
          success: true,
          message,
          attachments: result.attachments
        });
        notification.success(
          t("ui.tickets.email.button.test"),
          message
        );
      } else {
        const message = t("ui.tickets.email.error.send_failed");
        setEmailResult({
          success: false,
          message
        });
        notification.error(
          t("ui.tickets.email.button.test"),
          message
        );
      }
    } catch (error) {
      console.error("Failed to send test email:", error);
      const message = error instanceof Error ? error.message : t("ui.tickets.email.error.send_failed");
      setEmailResult({
        success: false,
        message
      });
      notification.error(
        t("ui.tickets.email.button.test"),
        message
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendRealEmail = async () => {
    // Domain is optional now, only validate recipient email
    const customProps = ticket.customProperties || {};
    const recipientEmail = customProps.holderEmail || customProps.attendeeEmail;

    if (!recipientEmail) {
      notification.error(
        t("ui.tickets.email.error.no_email"),
        t("ui.tickets.email.error.no_email_message")
      );
      return;
    }

    if (!confirm(t("ui.tickets.email.confirm.send", { email: recipientEmail }))) {
      return;
    }

    if (!userSessionId) {
      notification.error("Error", "No valid session");
      return;
    }

    setEmailAction("send");
    setIsSendingEmail(true);
    setEmailResult(null);
    try {
      const result = await sendTicketEmail({
        sessionId: userSessionId,
        ticketId: ticket._id,
        domainConfigId: selectedDomainId || undefined, // undefined = use system defaults
        emailTemplateId: selectedEmailTemplateId || undefined, // undefined = use default template
        ticketPdfTemplateId: selectedPdfTemplateId || undefined, // PDF template for ticket attachment
        isTest: false,
        language: selectedLanguage,
        includePdfAttachment,
        includeIcsAttachment,
      });

      if (result.success) {
        const attachmentInfo = result.attachments
          ? `\n📎 Attachments: ${result.attachments.pdf ? '✅ PDF' : '❌ PDF'}, ${result.attachments.ics ? '✅ ICS' : '❌ ICS'}`
          : '';
        const message = t("ui.tickets.email.success.sent", { email: recipientEmail }) + attachmentInfo;
        setEmailResult({
          success: true,
          message,
          attachments: result.attachments
        });
        notification.success(
          t("ui.tickets.email.button.send"),
          message
        );
      } else {
        const message = t("ui.tickets.email.error.send_failed");
        setEmailResult({
          success: false,
          message
        });
        notification.error(
          t("ui.tickets.email.button.send"),
          message
        );
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      const message = error instanceof Error ? error.message : t("ui.tickets.email.error.send_failed");
      setEmailResult({
        success: false,
        message
      });
      notification.error(
        t("ui.tickets.email.button.send"),
        message
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const customProps = ticket.customProperties || {};
  const formResponses = customProps.formResponses || {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="border-4 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--win95-bg-light)",
          boxShadow: "4px 4px 0 rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--win95-highlight)" }}>
              {ticket.name}
            </h2>
            <div className="flex items-center gap-3">
              {getStatusBadge(ticket.status || "issued")}
              <span className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                {customProps.ticketNumber
                  ? `${t("ui.tickets.detail.field.ticket_id")} #${customProps.ticketNumber}`
                  : t("ui.tickets.detail.field.ticket_number_na")}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 border-2 hover:bg-opacity-50 transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
            }}
          >
            <X size={20} style={{ color: "var(--win95-text)" }} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - QR Code and Actions */}
          <div className="space-y-4">
            {/* QR Code */}
            {qrCode && (
              <div
                className="border-2 p-4 flex flex-col items-center"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
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
                className="w-full px-4 py-2 border-2 flex items-center justify-center gap-2 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--win95-text)",
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
                className="w-full px-4 py-2 border-2 flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-button-face)",
                  color: "var(--win95-text)",
                }}
              >
                <Printer size={16} />
                <span className="text-sm">{t("ui.tickets.detail.button.print")}</span>
              </button>
              <button
                onClick={handleSendEmail}
                className="w-full px-4 py-2 border-2 flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--success)",
                  color: "white",
                }}
              >
                <Send size={16} />
                <span className="text-sm font-bold">{t("ui.tickets.email.button.send")}</span>
              </button>
            </div>
          </div>

          {/* Middle Column - Ticket Holder Info */}
          <div className="space-y-4">
            <div
              className="border-2 p-4"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
              }}
            >
              <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
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
                    <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
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
                      <p className="text-sm" style={{ color: "var(--win95-text)" }}>
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
                      <p className="text-sm" style={{ color: "var(--win95-text)" }}>
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
                      <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                        {formatDate(customProps.purchaseDate)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Information */}
            <div
              className="border-2 p-4"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
              }}
            >
              <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
                {t("ui.tickets.detail.section.pricing")}
              </h3>

              <div className="space-y-2">
                {customProps.pricePaid !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.tickets.detail.field.base_price")}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
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
                            ? "var(--win95-highlight)"
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

          {/* Right Column - Additional Information */}
          <div className="space-y-4">
            {/* Form Responses */}
            {Object.keys(formResponses).length > 0 && (
              <div
                className="border-2 p-4"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                }}
              >
                <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
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
                        <p className="text-sm" style={{ color: "var(--win95-text)" }}>
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
                className="border-2 p-4"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                }}
              >
                <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
                  {t("ui.tickets.detail.section.transaction")}
                </h3>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.tickets.detail.field.checkout_session")}
                    </p>
                    <p
                      className="text-xs font-mono break-all"
                      style={{ color: "var(--win95-text)" }}
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
                        style={{ color: "var(--win95-text)" }}
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
              className="border-2 p-4"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
              }}
            >
              <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-highlight)" }}>
                {t("ui.tickets.detail.section.system")}
              </h3>

              <div className="space-y-2">
                <div>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.tickets.detail.field.ticket_id")}
                  </p>
                  <p className="text-xs font-mono break-all" style={{ color: "var(--win95-text)" }}>
                    {ticket._id}
                  </p>
                </div>

                <div>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.tickets.detail.field.created_at")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--win95-text)" }}>
                    {formatDate(ticket.createdAt)}
                  </p>
                </div>

                {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                  <div>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.tickets.detail.field.last_updated")}
                    </p>
                    <p className="text-xs" style={{ color: "var(--win95-text)" }}>
                      {formatDate(ticket.updatedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0, 0, 0, 0.7)" }}
            onClick={() => setShowEmailModal(false)}
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
              {/* Email Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: "var(--win95-highlight)" }}>
                  <Send size={20} className="inline mr-2" />
                  {t("ui.tickets.email.modal.title")}
                </h3>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-1 border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-button-face)",
                  }}
                >
                  <X size={16} style={{ color: "var(--win95-text)" }} />
                </button>
              </div>

              {/* Domain Config Selector - Always show with system defaults option */}
              <div className="mb-4 p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  {t("ui.tickets.email.domain.label")}
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
                    🏠 System Defaults (tickets@mail.l4yercak3.com)
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
              {currentOrgId && (
                <TemplateSelector
                  category="all"
                  value={selectedEmailTemplateId}
                  onChange={(templateId) => setSelectedEmailTemplateId(templateId || null)}
                  organizationId={currentOrgId as Id<"organizations">}
                  label="📧 Email Template"
                  description="Select which email template to use for this email. System default will be used if not selected."
                  allowNull={true}
                  nullLabel="Use system default email template"
                />
              )}

              {/* PDF Template Selector */}
              {currentOrgId && (
                <TemplateSelector
                  category="ticket"
                  value={selectedPdfTemplateId}
                  onChange={(templateId) => setSelectedPdfTemplateId(templateId || null)}
                  organizationId={currentOrgId as Id<"organizations">}
                  label="🎫 PDF Ticket Template"
                  description="Select which PDF template to use for the ticket attachment. System default will be used if not selected."
                  allowNull={true}
                  nullLabel="Use system default ticket template"
                />
              )}

              {/* Attachment Controls */}
              <div className="mb-4 p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  📎 Email Attachments
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePdfAttachment}
                      onChange={(e) => setIncludePdfAttachment(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      Include PDF Ticket ({selectedPdfTemplateId ? 'Custom' : 'Default'} template)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeIcsAttachment}
                      onChange={(e) => setIncludeIcsAttachment(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      Include ICS Calendar File
                    </span>
                  </label>
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
                  Choose which files to attach to the email. At least one attachment is recommended.
                </p>
              </div>

              {/* Language Selector */}
              <div className="mb-4 p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  🌐 Email Language
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
                  <option value="de">🇩🇪 Deutsch (German)</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="es">🇪🇸 Español (Spanish)</option>
                  <option value="fr">🇫🇷 Français (French)</option>
                </select>
                <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
                  Select the language for the email template. The email will include PDF ticket and ICS calendar attachments.
                </p>
              </div>

              {/* Email Preview - Isolated in iframe to prevent CSS bleed */}
              {emailAction === "preview" && emailPreviewHtml && (
                <div className="mb-4 border-2" style={{ borderColor: "var(--win95-border)", background: "white", maxHeight: "400px", overflow: "auto" }}>
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

              {/* Test Email Input */}
              {emailAction === "test" && (
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                    {t("ui.tickets.email.test.label")}
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder={t("ui.tickets.email.test.placeholder")}
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
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleEmailPreview}
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
                  <span className="text-sm">{t("ui.tickets.email.button.preview")}</span>
                </button>

                <button
                  onClick={() => {
                    setEmailAction("test");
                    if (testEmail) {
                      handleSendTestEmail();
                    }
                  }}
                  disabled={isSendingEmail}
                  className="px-4 py-2 border-2 flex items-center justify-center gap-2 hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-highlight)",
                    color: "white",
                  }}
                >
                  {isSendingEmail && emailAction === "test" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span className="text-sm">{t("ui.tickets.email.button.test")}</span>
                </button>

                <button
                  onClick={handleSendRealEmail}
                  disabled={isSendingEmail}
                  className="px-4 py-2 border-2 flex items-center justify-center gap-2 hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--success)",
                    color: "white",
                  }}
                >
                  {isSendingEmail && emailAction === "send" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span className="text-sm font-bold">{t("ui.tickets.email.button.send_real")}</span>
                </button>
              </div>

              <p className="text-xs mt-3 text-center" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.tickets.email.footer")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
