"use client";

import { useState } from "react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { Award, Plus, List, Loader2, AlertCircle, Building2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { CertificatesList } from "./certificates-list";
import { CertificateForm } from "./certificate-form";

type ViewMode = "list" | "create" | "edit";

export function CertificatesWindow() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedCertificateId, setSelectedCertificateId] = useState<Id<"objects"> | null>(null);
  const { user, isLoading, sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id || user?.defaultOrgId;

  // Check app availability - returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "certificates",
    name: "Certificates",
    description: "Issue and manage professional certificates for CME, CLE, CPE, and other continuing education credits"
  });

  if (guard) return guard;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: "var(--primary)" }} />
            <p style={{ color: "var(--win95-text)" }}>Loading certificates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={48} style={{ color: "var(--error)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }}>Please log in to access certificates</p>
          </div>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Building2 size={48} style={{ color: "var(--warning)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }} className="font-semibold">
              No Organization Selected
            </p>
            <p style={{ color: "var(--win95-text-secondary)" }} className="text-sm mt-2">
              Please select an organization to manage certificates
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateNew = () => {
    setSelectedCertificateId(null);
    setViewMode("create");
  };

  const handleEdit = (certificateId: Id<"objects">) => {
    setSelectedCertificateId(certificateId);
    setViewMode("edit");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedCertificateId(null);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <Award size={16} />
              Professional Certificates
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Issue and manage CME, CLE, CPE, and other continuing education certificates
            </p>
          </div>
          {viewMode === "list" && (
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 text-xs font-bold flex items-center gap-2"
              style={{
                background: "var(--primary)",
                color: "white",
                border: "2px solid",
                borderColor: "var(--win95-button-border)",
                boxShadow: "var(--win95-button-shadow)"
              }}
            >
              <Plus size={14} />
              Issue Certificate
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "list" && (
          <CertificatesList
            onEdit={handleEdit}
            sessionId={sessionId!}
            organizationId={organizationId as Id<"organizations">}
          />
        )}
        {(viewMode === "create" || viewMode === "edit") && (
          <CertificateForm
            certificateId={selectedCertificateId}
            sessionId={sessionId!}
            organizationId={organizationId as Id<"organizations">}
            onBack={handleBackToList}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t-2 text-xs" style={{
        borderColor: "var(--win95-border)",
        background: "var(--win95-bg-secondary)",
        color: "var(--win95-text-secondary)"
      }}>
        {viewMode === "list" ? (
          <div className="flex items-center gap-2">
            <List size={12} />
            All certificates
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Plus size={12} />
            {viewMode === "create" ? "Create new certificate" : "Edit certificate"}
          </div>
        )}
      </div>
    </div>
  );
}
