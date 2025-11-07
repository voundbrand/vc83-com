"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Search, Filter, Award, Calendar, User, AlertCircle, FileText } from "lucide-react";
import { CertificateDetailModal } from "./certificate-detail-modal";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

// Simple date formatter
function formatDate(timestamp: number, short = true): string {
  if (short) {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface CertificatesListProps {
  onEdit: (certificateId: Id<"objects">) => void;
  sessionId: string;
  organizationId: Id<"organizations">;
}

export function CertificatesList({ onEdit, sessionId, organizationId }: CertificatesListProps) {
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.certificates");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPointType, setFilterPointType] = useState<string>("");
  const [selectedCertificateId, setSelectedCertificateId] = useState<Id<"objects"> | null>(null);

  // Fetch certificates with filters
  const certificates = useQuery(
    api.certificateOntology.getCertificates,
    {
      sessionId,
      organizationId,
      ...(filterStatus && { status: filterStatus }),
      ...(filterPointType && { pointType: filterPointType }),
    }
  );

  if (translationsLoading || !certificates) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: "var(--win95-highlight)" }} />
          <p style={{ color: "var(--win95-text)" }}>
            {translationsLoading ? "Loading..." : t("ui.certificates.loading")}
          </p>
        </div>
      </div>
    );
  }

  // Filter by search term (recipient name or email)
  const filteredCertificates = certificates.filter((cert) => {
    const recipientName = cert.customProperties?.recipientName?.toLowerCase() || "";
    const recipientEmail = cert.customProperties?.recipientEmail?.toLowerCase() || "";
    const certificateNumber = cert.customProperties?.certificateNumber?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();

    return (
      recipientName.includes(search) ||
      recipientEmail.includes(search) ||
      certificateNumber.includes(search)
    );
  });

  const getPointTypeBadge = (subtype: string) => {
    const badges: Record<string, { colorVar: string; label: string }> = {
      cme: { colorVar: "--win95-highlight", label: t("ui.certificates.type.cme") },
      cle: { colorVar: "--win95-highlight", label: t("ui.certificates.type.cle") },
      cpe: { colorVar: "--success", label: t("ui.certificates.type.cpe") },
      ce: { colorVar: "--win95-highlight", label: t("ui.certificates.type.ce") },
      pdu: { colorVar: "--error", label: t("ui.certificates.type.pdu") },
    };
    const badge = badges[subtype] || { colorVar: "--neutral-gray", label: subtype.toUpperCase() };
    return (
      <span
        className="px-2 py-1 text-xs font-bold rounded"
        style={{ background: `var(${badge.colorVar})`, color: "var(--win95-bg-light)" }}
      >
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { colorVar: string; bgVar: string; label: string }> = {
      issued: { colorVar: "--success", bgVar: "--win95-bg-light", label: t("ui.certificates.status.issued") },
      revoked: { colorVar: "--error", bgVar: "--win95-bg-light", label: t("ui.certificates.status.revoked") },
      expired: { colorVar: "--win95-highlight", bgVar: "--win95-bg-light", label: t("ui.certificates.status.expired") },
    };
    const badge = badges[status] || { colorVar: "--neutral-gray", bgVar: "--win95-bg", label: status.toUpperCase() };
    return (
      <span
        className="px-2 py-1 text-xs font-bold rounded"
        style={{ color: `var(${badge.colorVar})`, background: `var(${badge.bgVar})`, border: `1px solid var(${badge.colorVar})` }}
      >
        {badge.label}
      </span>
    );
  };

  return (
    <>
      <div className="p-4">
        {/* Search and Filters */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search
                size={14}
                className="absolute left-2 top-1/2 transform -translate-y-1/2"
                style={{ color: "var(--neutral-gray)" }}
              />
              <input
                type="text"
                placeholder={t("ui.certificates.list.search_placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs retro-input"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: "var(--neutral-gray)" }} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs retro-input"
            >
              <option value="">{t("ui.certificates.list.filter.all_statuses")}</option>
              <option value="issued">{t("ui.certificates.status.issued")}</option>
              <option value="revoked">{t("ui.certificates.status.revoked")}</option>
              <option value="expired">{t("ui.certificates.status.expired")}</option>
            </select>

            <select
              value={filterPointType}
              onChange={(e) => setFilterPointType(e.target.value)}
              className="px-3 py-2 text-xs retro-input"
            >
              <option value="">{t("ui.certificates.list.filter.all_types")}</option>
              <option value="cme">{t("ui.certificates.type.cme")}</option>
              <option value="cle">{t("ui.certificates.type.cle")}</option>
              <option value="cpe">{t("ui.certificates.type.cpe")}</option>
              <option value="ce">{t("ui.certificates.type.ce")}</option>
              <option value="pdu">{t("ui.certificates.type.pdu")}</option>
            </select>
          </div>
        </div>

        {/* Certificates Table */}
        {filteredCertificates.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle size={48} style={{ color: "var(--neutral-gray)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }} className="font-semibold">
              {t("ui.certificates.list.no_certificates_found")}
            </p>
            <p style={{ color: "var(--neutral-gray)" }} className="text-xs mt-2">
              {searchTerm || filterStatus || filterPointType
                ? t("ui.certificates.list.adjust_filters")
                : t("ui.certificates.list.issue_first")}
            </p>
          </div>
        ) : (
          <div className="border-2" style={{ borderColor: "var(--win95-border)" }}>
            <table className="w-full">
              <thead style={{ background: "var(--win95-bg-light)" }}>
                <tr className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    <div className="flex items-center gap-1">
                      <FileText size={12} />
                      {t("ui.certificates.list.table.certificate_number")}
                    </div>
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      {t("ui.certificates.list.table.recipient")}
                    </div>
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    <div className="flex items-center gap-1">
                      <Award size={12} />
                      {t("ui.certificates.list.table.type")}
                    </div>
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    {t("ui.certificates.list.table.points")}
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {t("ui.certificates.list.table.issued")}
                    </div>
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    {t("ui.certificates.list.table.status")}
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    {t("ui.certificates.list.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCertificates.map((cert) => (
                  <tr
                    key={cert._id}
                    className="text-xs hover:bg-opacity-50 cursor-pointer"
                    style={{
                      background: "var(--win95-bg-light)",
                      borderBottom: "1px solid var(--win95-border)",
                    }}
                    onClick={() => setSelectedCertificateId(cert._id)}
                  >
                    <td className="p-2 font-mono text-xs">
                      {cert.customProperties?.certificateNumber || t("ui.certificates.list.na")}
                    </td>
                    <td className="p-2">
                      <div>
                        <div className="font-semibold" style={{ color: "var(--win95-text)" }}>
                          {cert.customProperties?.recipientName}
                        </div>
                        <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {cert.customProperties?.recipientEmail}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">{getPointTypeBadge(cert.subtype || "")}</td>
                    <td className="p-2 font-semibold" style={{ color: "var(--win95-text)" }}>
                      {cert.customProperties?.pointsAwarded || 0} {cert.customProperties?.pointUnit || t("ui.certificates.common.credits")}
                    </td>
                    <td className="p-2" style={{ color: "var(--neutral-gray)" }}>
                      {cert.customProperties?.issueDate
                        ? formatDate(cert.customProperties.issueDate, true)
                        : t("ui.certificates.list.na")}
                    </td>
                    <td className="p-2">{getStatusBadge(cert.status || "issued")}</td>
                    <td className="p-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCertificateId(cert._id);
                        }}
                        className="px-2 py-1 text-xs retro-button"
                      >
                        {t("ui.certificates.list.button.view")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Certificate Detail Modal */}
      {selectedCertificateId && (
        <CertificateDetailModal
          certificateId={selectedCertificateId}
          sessionId={sessionId}
          onClose={() => setSelectedCertificateId(null)}
          onEdit={() => {
            onEdit(selectedCertificateId);
            setSelectedCertificateId(null);
          }}
        />
      )}
    </>
  );
}
