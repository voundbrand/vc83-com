"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StripeConnectSection } from "./stripe-connect-section";
import { InvoicingSection } from "./invoicing-section";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { CreditCard, Loader2, AlertCircle, Building2, FileText } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

type TabType = "stripe" | "invoicing";

export function PaymentsWindow() {
  const [activeTab, setActiveTab] = useState<TabType>("stripe");
  const { user, isLoading, sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id || user?.defaultOrgId;
  const { t } = useNamespaceTranslations("ui.payments");

  // Get organization data to check Stripe status (MUST be before any conditional returns)
  const organization = useQuery(
    api.organizations.getById,
    organizationId && sessionId
      ? { organizationId: organizationId as Id<"organizations">, sessionId }
      : "skip"
  );

  // Check app availability - returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "payments",
    name: "Payment Management",
    description: "Stripe integration, payment processing, and transaction history for your organization"
  });

  if (guard) return guard;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: "var(--primary)" }} />
            <p style={{ color: "var(--win95-text)" }}>{t("ui.payments.loading")}</p>
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
            <p style={{ color: "var(--win95-text)" }}>{t("ui.payments.please_login")}</p>
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
              {t("ui.payments.no_org_selected")}
            </p>
            <p style={{ color: "var(--win95-text-secondary)" }} className="text-sm mt-2">
              {t("ui.payments.select_org_prompt")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <CreditCard size={16} />
              {t("ui.payments.title")}
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.subtitle")}
            </p>
          </div>

          {/* Organization Info */}
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
              {currentOrganization?.name}
            </p>
            {organization?.paymentProviders?.find((p) => p.providerCode === "stripe-connect") && (
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {t("ui.payments.status")}: {organization.paymentProviders.find((p) => p.providerCode === "stripe-connect")?.status}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: activeTab === "stripe" ? "var(--win95-bg-light)" : "var(--win95-bg)",
            color: activeTab === "stripe" ? "var(--win95-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("stripe")}
        >
          <CreditCard size={14} />
          {t("ui.payments.tab_stripe")}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: activeTab === "invoicing" ? "var(--win95-bg-light)" : "var(--win95-bg)",
            color: activeTab === "invoicing" ? "var(--win95-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("invoicing")}
        >
          <FileText size={14} />
          {t("ui.payments.tab_invoicing")}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "stripe" && (
          <div className="p-4">
            <StripeConnectSection organizationId={organizationId as Id<"organizations">} organization={organization} />
          </div>
        )}

        {activeTab === "invoicing" && <InvoicingSection />}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <div className="flex justify-between items-center">
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.payments.powered_by_stripe")}
          </p>
          <p className="text-xs font-semibold" style={{
            color: organization?.paymentProviders?.find((p) => p.providerCode === "stripe-connect")?.isTestMode
              ? "var(--warning)"
              : "var(--success)"
          }}>
            {t("ui.payments.mode")}: {organization?.paymentProviders?.find((p) => p.providerCode === "stripe-connect")?.isTestMode ? t("ui.payments.mode_test") : t("ui.payments.mode_live")}
          </p>
        </div>
      </div>
    </div>
  );
}
