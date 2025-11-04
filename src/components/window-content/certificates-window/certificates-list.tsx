"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Search, Filter, Award, Calendar, User, AlertCircle, FileText } from "lucide-react";
import { CertificateDetailModal } from "./certificate-detail-modal";

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

  if (!certificates) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: "var(--primary)" }} />
          <p style={{ color: "var(--win95-text)" }}>Loading certificates...</p>
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
    const badges: Record<string, { color: string; label: string }> = {
      cme: { color: "#3B82F6", label: "CME" },
      cle: { color: "#8B5CF6", label: "CLE" },
      cpe: { color: "#10B981", label: "CPE" },
      ce: { color: "#F59E0B", label: "CE" },
      pdu: { color: "#EF4444", label: "PDU" },
    };
    const badge = badges[subtype] || { color: "#6B7280", label: subtype.toUpperCase() };
    return (
      <span
        className="px-2 py-1 text-xs font-bold rounded"
        style={{ background: badge.color, color: "white" }}
      >
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; bg: string }> = {
      issued: { color: "#10B981", bg: "#D1FAE5" },
      revoked: { color: "#EF4444", bg: "#FEE2E2" },
      expired: { color: "#F59E0B", bg: "#FEF3C7" },
    };
    const badge = badges[status] || { color: "#6B7280", bg: "#F3F4F6" };
    return (
      <span
        className="px-2 py-1 text-xs font-bold rounded"
        style={{ color: badge.color, background: badge.bg }}
      >
        {status.toUpperCase()}
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
                placeholder="Search by name, email, or certificate number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs"
                style={{
                  background: "white",
                  border: "2px solid var(--win95-border)",
                  color: "var(--win95-text)",
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: "var(--neutral-gray)" }} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs"
              style={{
                background: "white",
                border: "2px solid var(--win95-border)",
                color: "var(--win95-text)",
              }}
            >
              <option value="">All Statuses</option>
              <option value="issued">Issued</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={filterPointType}
              onChange={(e) => setFilterPointType(e.target.value)}
              className="px-3 py-2 text-xs"
              style={{
                background: "white",
                border: "2px solid var(--win95-border)",
                color: "var(--win95-text)",
              }}
            >
              <option value="">All Types</option>
              <option value="cme">CME</option>
              <option value="cle">CLE</option>
              <option value="cpe">CPE</option>
              <option value="ce">CE</option>
              <option value="pdu">PDU</option>
            </select>
          </div>
        </div>

        {/* Certificates Table */}
        {filteredCertificates.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle size={48} style={{ color: "var(--neutral-gray)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }} className="font-semibold">
              No certificates found
            </p>
            <p style={{ color: "var(--neutral-gray)" }} className="text-xs mt-2">
              {searchTerm || filterStatus || filterPointType
                ? "Try adjusting your search or filters"
                : "Issue your first certificate to get started"}
            </p>
          </div>
        ) : (
          <div className="border-2" style={{ borderColor: "var(--win95-border)" }}>
            <table className="w-full">
              <thead style={{ background: "var(--win95-bg-secondary)" }}>
                <tr className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    <div className="flex items-center gap-1">
                      <FileText size={12} />
                      Certificate #
                    </div>
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      Recipient
                    </div>
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    <div className="flex items-center gap-1">
                      <Award size={12} />
                      Type
                    </div>
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    Points
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      Issued
                    </div>
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    Status
                  </th>
                  <th className="text-left p-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCertificates.map((cert) => (
                  <tr
                    key={cert._id}
                    className="text-xs hover:bg-opacity-50 cursor-pointer"
                    style={{
                      background: "white",
                      borderBottom: "1px solid var(--win95-border)",
                    }}
                    onClick={() => setSelectedCertificateId(cert._id)}
                  >
                    <td className="p-2 font-mono text-xs">
                      {cert.customProperties?.certificateNumber || "N/A"}
                    </td>
                    <td className="p-2">
                      <div>
                        <div className="font-semibold">{cert.customProperties?.recipientName}</div>
                        <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {cert.customProperties?.recipientEmail}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">{getPointTypeBadge(cert.subtype || "")}</td>
                    <td className="p-2 font-semibold">
                      {cert.customProperties?.pointsAwarded || 0} {cert.customProperties?.pointUnit || "credits"}
                    </td>
                    <td className="p-2" style={{ color: "var(--neutral-gray)" }}>
                      {cert.customProperties?.issueDate
                        ? formatDate(cert.customProperties.issueDate, true)
                        : "N/A"}
                    </td>
                    <td className="p-2">{getStatusBadge(cert.status || "issued")}</td>
                    <td className="p-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCertificateId(cert._id);
                        }}
                        className="px-2 py-1 text-xs"
                        style={{
                          background: "var(--primary)",
                          color: "white",
                          border: "1px solid var(--win95-button-border)",
                        }}
                      >
                        View
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
