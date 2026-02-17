"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { X, Award, Calendar, User, FileText, AlertCircle, Download, ArrowLeft } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

// Simple date formatter
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface CertificateDetailModalProps {
  certificateId: Id<"objects">;
  sessionId: string;
  onClose: () => void;
  onEdit: () => void;
}

export function CertificateDetailModal({
  certificateId,
  sessionId,
  onClose,
}: CertificateDetailModalProps) {
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.certificates");
  const certificate = useQuery(api.certificateOntology.getCertificate, {
    sessionId,
    certificateId,
  });

  if (translationsLoading || !certificate) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ background: "var(--modal-overlay-bg)" }}
        onClick={onClose}
      >
        <div
          className="p-6 border rounded-xl max-w-2xl w-full"
          style={{ background: "var(--desktop-shell-accent)", borderColor: "var(--window-document-border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center py-8">
            <p style={{ color: "var(--window-document-text)" }}>
              {translationsLoading ? "Loading..." : t("ui.certificates.detail.loading")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const props = certificate.customProperties || {};

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "var(--modal-overlay-bg)" }}
      onClick={onClose}
    >
      <div
        className="border rounded-xl max-w-4xl w-full max-h-[92vh] overflow-hidden"
        style={{ background: "var(--window-document-bg)", borderColor: "var(--window-document-border)", boxShadow: "var(--modal-shadow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between gap-3"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg)",
            color: "var(--window-document-text)"
          }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onClose}
              className="desktop-interior-button h-8 px-3 text-xs shrink-0"
            >
              <ArrowLeft size={14} />
              <span>{t("ui.certificates.button.back_to_list")}</span>
            </button>
            <Award size={16} style={{ color: "var(--tone-accent-strong)" }} />
            <span className="font-bold text-sm truncate">{t("ui.certificates.detail.title")}</span>
          </div>
          <button
            onClick={onClose}
            className="desktop-interior-button h-9 w-9 p-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(92vh-124px)] p-6 space-y-6">
          {/* Certificate Number */}
          <div className="text-center pb-4 border-b" style={{ borderColor: "var(--window-document-border)" }}>
            <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.certificates.detail.certificate_number_label")}
            </div>
            <div className="text-lg font-bold font-mono mt-1" style={{ color: "var(--tone-accent-strong)" }}>
              {props.certificateNumber}
            </div>
          </div>

          {/* Recipient Info */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <User size={14} />
              {t("ui.certificates.detail.section.recipient")}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.name")}
                </div>
                <div className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {props.recipientName}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.email")}
                </div>
                <div className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {props.recipientEmail}
                </div>
              </div>
              {props.licenseNumber && (
                <div>
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.certificates.detail.field.license_number")}
                  </div>
                  <div className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                    {props.licenseNumber}
                  </div>
                </div>
              )}
              {props.profession && (
                <div>
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.certificates.detail.field.profession")}
                  </div>
                  <div className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                    {props.profession}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Credits Info */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <Award size={14} />
              {t("ui.certificates.detail.section.credits")}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.points_awarded")}
                </div>
                <div className="font-bold text-lg" style={{ color: "var(--tone-accent-strong)" }}>
                  {props.pointsAwarded} {props.pointUnit}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.category")}
                </div>
                <div className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {props.pointCategory}
                </div>
              </div>
              {props.accreditingBody && (
                <div className="col-span-2">
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.certificates.detail.field.accrediting_body")}
                  </div>
                  <div className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                    {props.accreditingBody}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event Info */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <Calendar size={14} />
              {t("ui.certificates.detail.section.event")}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.event_name")}
                </div>
                <div className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {props.eventName}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.event_date")}
                </div>
                <div className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {props.eventDate ? formatDate(props.eventDate) : t("ui.certificates.list.na")}
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
              <FileText size={14} />
              {t("ui.certificates.detail.section.dates")}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.issued")}
                </div>
                <div className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {props.issueDate ? formatDate(props.issueDate) : t("ui.certificates.list.na")}
                </div>
              </div>
              {props.expirationDate && (
                <div>
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.certificates.detail.field.expires")}
                  </div>
                  <div className="font-semibold" style={{ color: "var(--window-document-text)" }}>
                    {formatDate(props.expirationDate)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          {certificate.status === "revoked" && props.revokedReason && (
            <div
              className="p-4 border rounded-lg"
              style={{
                borderColor: "var(--error)",
                background: "var(--desktop-shell-accent)"
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={16} style={{ color: "var(--error)" }} className="mt-0.5" />
                <div>
                  <div className="font-bold text-sm" style={{ color: "var(--error)" }}>
                    {t("ui.certificates.detail.revoked_title")}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--error)" }}>
                    {t("ui.certificates.detail.revoked_reason")} {props.revokedReason}
                  </div>
                  {props.revokedAt && (
                    <div className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      {t("ui.certificates.detail.revoked_on")} {formatDate(props.revokedAt)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t flex items-center justify-end gap-2"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg)"
          }}
        >
          {props.certificatePdfUrl && (
            <button
              onClick={() => window.open(props.certificatePdfUrl, "_blank")}
              className="px-4 py-2 text-xs font-bold flex items-center gap-2 border"
              style={{
                background: "var(--tone-accent-strong)",
                color: "var(--desktop-shell-accent)",
                borderColor: "var(--window-document-border)",
                cursor: "pointer"
              }}
            >
              <Download size={14} />
              {t("ui.certificates.detail.button.download_pdf")}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold retro-button"
          >
            {t("ui.certificates.detail.button.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
