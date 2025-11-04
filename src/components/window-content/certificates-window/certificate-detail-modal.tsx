"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { X, Award, Calendar, User, FileText, AlertCircle, Download } from "lucide-react";

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
  const certificate = useQuery(api.certificateOntology.getCertificate, {
    sessionId,
    certificateId,
  });

  if (!certificate) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white p-6 border-2 max-w-2xl w-full mx-4"
          style={{ borderColor: "var(--win95-border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center py-8">
            <p>Loading certificate details...</p>
          </div>
        </div>
      </div>
    );
  }

  const props = certificate.customProperties || {};

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto"
        style={{ borderColor: "var(--win95-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2 flex items-center justify-between"
          style={{ borderColor: "var(--win95-border)", background: "var(--primary)", color: "white" }}
        >
          <div className="flex items-center gap-2">
            <Award size={16} />
            <span className="font-bold text-sm">Certificate Details</span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Certificate Number */}
          <div className="text-center pb-4 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
            <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              CERTIFICATE NUMBER
            </div>
            <div className="text-lg font-bold font-mono mt-1" style={{ color: "var(--primary)" }}>
              {props.certificateNumber}
            </div>
          </div>

          {/* Recipient Info */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <User size={14} />
              Recipient Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>Name</div>
                <div className="font-semibold">{props.recipientName}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>Email</div>
                <div className="font-semibold">{props.recipientEmail}</div>
              </div>
              {props.licenseNumber && (
                <div>
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>License Number</div>
                  <div className="font-semibold">{props.licenseNumber}</div>
                </div>
              )}
              {props.profession && (
                <div>
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>Profession</div>
                  <div className="font-semibold">{props.profession}</div>
                </div>
              )}
            </div>
          </div>

          {/* Credits Info */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <Award size={14} />
              Credits Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>Points Awarded</div>
                <div className="font-bold text-lg" style={{ color: "var(--primary)" }}>
                  {props.pointsAwarded} {props.pointUnit}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>Category</div>
                <div className="font-semibold">{props.pointCategory}</div>
              </div>
              {props.accreditingBody && (
                <div className="col-span-2">
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>Accrediting Body</div>
                  <div className="font-semibold">{props.accreditingBody}</div>
                </div>
              )}
            </div>
          </div>

          {/* Event Info */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <Calendar size={14} />
              Event Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>Event Name</div>
                <div className="font-semibold">{props.eventName}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>Event Date</div>
                <div className="font-semibold">
                  {props.eventDate ? formatDate(props.eventDate) : "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <FileText size={14} />
              Certificate Dates
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>Issued</div>
                <div className="font-semibold">
                  {props.issueDate ? formatDate(props.issueDate) : "N/A"}
                </div>
              </div>
              {props.expirationDate && (
                <div>
                  <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>Expires</div>
                  <div className="font-semibold">
                    {formatDate(props.expirationDate)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          {certificate.status === "revoked" && props.revokedReason && (
            <div className="p-4 border-2 rounded" style={{ borderColor: "var(--error)", background: "#FEE2E2" }}>
              <div className="flex items-start gap-2">
                <AlertCircle size={16} style={{ color: "var(--error)" }} className="mt-0.5" />
                <div>
                  <div className="font-bold text-sm" style={{ color: "var(--error)" }}>
                    Certificate Revoked
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--error)" }}>
                    Reason: {props.revokedReason}
                  </div>
                  {props.revokedAt && (
                    <div className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      Revoked on: {formatDate(props.revokedAt)}
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
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-secondary)" }}
        >
          {props.certificatePdfUrl && (
            <button
              onClick={() => window.open(props.certificatePdfUrl, "_blank")}
              className="px-4 py-2 text-xs font-bold flex items-center gap-2"
              style={{
                background: "var(--primary)",
                color: "white",
                border: "2px solid var(--win95-button-border)",
              }}
            >
              <Download size={14} />
              Download PDF
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold"
            style={{
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
              border: "2px solid var(--win95-button-border)",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
