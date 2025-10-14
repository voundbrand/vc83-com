"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StripeConnectSection } from "./stripe-connect-section";
import { TransactionsSection } from "./transactions-section";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { CreditCard, History, Loader2, AlertCircle, Building2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

type TabType = "connect" | "transactions";

export function PaymentsWindow() {
  const [activeTab, setActiveTab] = useState<TabType>("connect");
  const { user, isLoading, sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id || user?.defaultOrgId;

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
            <p style={{ color: "var(--win95-text)" }}>Loading payment settings...</p>
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
            <p style={{ color: "var(--win95-text)" }}>Please log in to access payment settings</p>
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
              Please select an organization to manage payment settings
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
              Payment Management
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Manage Stripe Connect and view transactions
            </p>
          </div>

          {/* Organization Info */}
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
              {currentOrganization?.name}
            </p>
            {organization?.paymentProviders?.find((p) => p.providerCode === "stripe-connect") && (
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                Status: {organization.paymentProviders.find((p) => p.providerCode === "stripe-connect")?.status}
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
            background: activeTab === "connect" ? "var(--win95-bg-light)" : "var(--win95-bg)",
            color: activeTab === "connect" ? "var(--win95-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("connect")}
        >
          <CreditCard size={14} />
          Stripe Connect
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: activeTab === "transactions" ? "var(--win95-bg-light)" : "var(--win95-bg)",
            color: activeTab === "transactions" ? "var(--win95-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("transactions")}
        >
          <History size={14} />
          Transactions
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "connect" && (
          <StripeConnectSection organizationId={organizationId as Id<"organizations">} organization={organization} />
        )}

        {activeTab === "transactions" && (
          <TransactionsSection organizationId={organizationId as Id<"organizations">} />
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <div className="flex justify-between items-center">
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Powered by Stripe Connect
          </p>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Mode: Test
          </p>
        </div>
      </div>
    </div>
  );
}
