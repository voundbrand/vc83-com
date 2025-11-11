"use client";

import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { X, Download, Printer, User, Mail, Phone, Calendar, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import Image from "next/image";
import QRCode from "qrcode";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";

interface TicketDetailModalProps {
  ticket: Doc<"objects">;
  onClose: () => void;
}

export function TicketDetailModal({ ticket, onClose }: TicketDetailModalProps) {
  const { t } = useNamespaceTranslations("ui.tickets");
  const [qrCode, setQrCode] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);

  // PDF generation action
  const generateTicketPDF = useAction(api.pdfGeneration.generateTicketPDF);

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
      </div>
    </div>
  );
}
