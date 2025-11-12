"use client";

import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { X, Download, Printer, User, Mail, Phone, Calendar, Loader2, Send, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import Image from "next/image";
import QRCode from "qrcode";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

interface TicketDetailModalProps {
  ticket: Doc<"objects">;
  onClose: () => void;
}

export function TicketDetailModal({ ticket, onClose }: TicketDetailModalProps) {
  const { t } = useNamespaceTranslations("ui.tickets");
  const [qrCode, setQrCode] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);

  // Email state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAction, setEmailAction] = useState<"preview" | "test" | "send" | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [emailResult, setEmailResult] = useState<{success: boolean; message: string} | null>(null);

  // Get current user and organization
  const { user } = useAuth();
  const currentOrgId = user?.defaultOrgId;

  // PDF generation action
  const generateTicketPDF = useAction(api.pdfGeneration.generateTicketPDF);

  // Email actions
  const previewTicketEmail = useAction(api.ticketEmailService.previewTicketEmail);
  const sendTicketEmail = useAction(api.ticketEmailService.sendTicketConfirmationEmail);

  // Get domain configs for organization
  const domainConfigs = useQuery(
    api.domainConfigOntology.listDomainConfigs,
    currentOrgId ? { sessionId: `ticket_modal_${Date.now()}`, organizationId: currentOrgId as Id<"organizations"> } : "skip"
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
      alert(t("ui.tickets.detail.error.no_checkout_session"));
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
      alert(t("ui.tickets.detail.error.download_failed"));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = () => {
    // Check if domain config exists
    if (!domainConfigs || domainConfigs.length === 0) {
      alert("Please create a domain configuration first in Settings → Domains");
      return;
    }

    setShowEmailModal(true);
    setEmailResult(null);
  };

  const handleEmailPreview = async () => {
    if (!domainConfigs || domainConfigs.length === 0) return;

    setEmailAction("preview");
    setIsSendingEmail(true);
    try {
      const result = await previewTicketEmail({
        ticketId: ticket._id,
        domainConfigId: domainConfigs[0]._id,
      });

      setEmailPreviewHtml(result.html);
    } catch (error) {
      console.error("Failed to preview email:", error);
      alert("Failed to generate email preview");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!domainConfigs || domainConfigs.length === 0 || !testEmail) return;

    setEmailAction("test");
    setIsSendingEmail(true);
    setEmailResult(null);
    try {
      const result = await sendTicketEmail({
        ticketId: ticket._id,
        domainConfigId: domainConfigs[0]._id,
        isTest: true,
        testRecipient: testEmail,
      });

      if (result.success) {
        setEmailResult({
          success: true,
          message: `Test email sent to ${testEmail}! Check your inbox.`
        });
      } else {
        setEmailResult({
          success: false,
          message: "Failed to send test email. Check console for details."
        });
      }
    } catch (error) {
      console.error("Failed to send test email:", error);
      setEmailResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendRealEmail = async () => {
    if (!domainConfigs || domainConfigs.length === 0) return;

    const customProps = ticket.customProperties || {};
    const recipientEmail = customProps.holderEmail || customProps.attendeeEmail;

    if (!recipientEmail) {
      alert("This ticket has no email address associated with it.");
      return;
    }

    if (!confirm(`Send confirmation email to ${recipientEmail}?`)) {
      return;
    }

    setEmailAction("send");
    setIsSendingEmail(true);
    setEmailResult(null);
    try {
      const result = await sendTicketEmail({
        ticketId: ticket._id,
        domainConfigId: domainConfigs[0]._id,
        isTest: false,
      });

      if (result.success) {
        setEmailResult({
          success: true,
          message: `✅ Confirmation email sent to ${recipientEmail}!`
        });
      } else {
        setEmailResult({
          success: false,
          message: "Failed to send email. Check console for details."
        });
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      setEmailResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      });
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
                <span className="text-sm font-bold">Send Email</span>
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
                  Send Confirmation Email
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

              {/* Domain Config Info */}
              {domainConfigs && domainConfigs.length > 0 && (
                <div className="mb-4 p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                    Using Domain: {(domainConfigs[0].customProperties as any)?.domainName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    From: {(domainConfigs[0].customProperties as any)?.email?.senderEmail}
                  </p>
                </div>
              )}

              {/* Email Preview */}
              {emailAction === "preview" && emailPreviewHtml && (
                <div className="mb-4 border-2 p-4" style={{ borderColor: "var(--win95-border)", background: "white", maxHeight: "400px", overflow: "auto" }}>
                  <div dangerouslySetInnerHTML={{ __html: emailPreviewHtml }} />
                </div>
              )}

              {/* Test Email Input */}
              {emailAction === "test" && (
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                    Test Email Address:
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your.email@example.com"
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
                  <span className="text-sm">Preview</span>
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
                  <span className="text-sm">Test</span>
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
                  <span className="text-sm font-bold">Send Real</span>
                </button>
              </div>

              <p className="text-xs mt-3 text-center" style={{ color: "var(--neutral-gray)" }}>
                Preview the email, send a test to yourself, then send the real confirmation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
