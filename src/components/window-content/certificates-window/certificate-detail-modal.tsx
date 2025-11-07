"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { X, Award, Calendar, User, FileText, AlertCircle, Download } from "lucide-react";
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
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: "rgba(0, 0, 0, 0.5)" }}
        onClick={onClose}
      >
        <div
          className="p-6 border-2 max-w-2xl w-full mx-4"
          style={{ background: "var(--win95-bg-light)", borderColor: "var(--win95-border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center py-8">
            <p style={{ color: "var(--win95-text)" }}>
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
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="border-2 max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto"
        style={{ background: "var(--win95-bg-light)", borderColor: "var(--win95-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2 flex items-center justify-between"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-highlight)",
            color: "var(--win95-bg-light)"
          }}
        >
          <div className="flex items-center gap-2">
            <Award size={16} />
            <span className="font-bold text-sm">{t("ui.certificates.detail.title")}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--win95-bg-light)"
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Certificate Number */}
          <div className="text-center pb-4 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
            <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.certificates.detail.certificate_number_label")}
            </div>
            <div className="text-lg font-bold font-mono mt-1" style={{ color: "var(--win95-highlight)" }}>
              {props.certificateNumber}
            </div>
          </div>

          {/* Recipient Info */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <User size={14} />
              {t("ui.certificates.detail.section.recipient")}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.name")}
                </div>
                <div className="font-semibold" style={{ color: "var(--win95-text)" }}>
                  {props.recipientName}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.email")}
                </div>
                <div className="font-semibold" style={{ color: "var(--win95-text)" }}>
                  {props.recipientEmail}
                </div>
              </div>
              {props.licenseNumber && (
                <div>
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.certificates.detail.field.license_number")}
                  </div>
                  <div className="font-semibold" style={{ color: "var(--win95-text)" }}>
                    {props.licenseNumber}
                  </div>
                </div>
              )}
              {props.profession && (
                <div>
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.certificates.detail.field.profession")}
                  </div>
                  <div className="font-semibold" style={{ color: "var(--win95-text)" }}>
                    {props.profession}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Credits Info */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <Award size={14} />
              {t("ui.certificates.detail.section.credits")}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.points_awarded")}
                </div>
                <div className="font-bold text-lg" style={{ color: "var(--win95-highlight)" }}>
                  {props.pointsAwarded} {props.pointUnit}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.category")}
                </div>
                <div className="font-semibold" style={{ color: "var(--win95-text)" }}>
                  {props.pointCategory}
                </div>
              </div>
              {props.accreditingBody && (
                <div className="col-span-2">
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.certificates.detail.field.accrediting_body")}
                  </div>
                  <div className="font-semibold" style={{ color: "var(--win95-text)" }}>
                    {props.accreditingBody}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event Info */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <Calendar size={14} />
              {t("ui.certificates.detail.section.event")}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.event_name")}
                </div>
                <div className="font-semibold" style={{ color: "var(--win95-text)" }}>
                  {props.eventName}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.event_date")}
                </div>
                <div className="font-semibold" style={{ color: "var(--win95-text)" }}>
                  {props.eventDate ? formatDate(props.eventDate) : t("ui.certificates.list.na")}
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <FileText size={14} />
              {t("ui.certificates.detail.section.dates")}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.certificates.detail.field.issued")}
                </div>
                <div className="font-semibold" style={{ color: "var(--win95-text)" }}>
                  {props.issueDate ? formatDate(props.issueDate) : t("ui.certificates.list.na")}
                </div>
              </div>
              {props.expirationDate && (
                <div>
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {t("ui.certificates.detail.field.expires")}
                  </div>
                  <div className="font-semibold" style={{ color: "var(--win95-text)" }}>
                    {formatDate(props.expirationDate)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          {certificate.status === "revoked" && props.revokedReason && (
            <div
              className="p-4 border-2 rounded"
              style={{
                borderColor: "var(--error)",
                background: "var(--win95-bg-light)"
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
          className="px-4 py-3 border-t-2 flex items-center justify-end gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg)"
          }}
        >
          {props.certificatePdfUrl && (
            <button
              onClick={() => window.open(props.certificatePdfUrl, "_blank")}
              className="px-4 py-2 text-xs font-bold flex items-center gap-2"
              style={{
                background: "var(--win95-highlight)",
                color: "var(--win95-bg-light)",
                border: "2px solid var(--win95-border)",
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
