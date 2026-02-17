"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StripeConnectSection } from "./stripe-connect-section";
import { InvoicingSection } from "./invoicing-section";
import { ProvidersTab } from "./providers-tab";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { CreditCard, Loader2, AlertCircle, Building2, FileText, LayoutGrid, ArrowLeft, Maximize2 } from "lucide-react";
import Link from "next/link";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  InteriorHeader,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTabButton,
  InteriorTabRow,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";

type TabType = "providers" | "stripe" | "invoicing";

interface PaymentsWindowProps {
  /** When true, shows back-to-desktop navigation (for /payments route) */
  fullScreen?: boolean;
}

export function PaymentsWindow({ fullScreen = false }: PaymentsWindowProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>("providers");
  const { user, isLoading, sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id || user?.defaultOrgId;
  const { t } = useNamespaceTranslations("ui.payments");
  const useMutationUntyped = useMutation as (mutation: unknown) => (args: unknown) => Promise<unknown>;
  // @ts-ignore TS2589: Convex generated mutation type may exceed instantiation depth in this component.
  const handleOAuthCallback = useMutationUntyped((api as unknown as {
    stripeConnect: { handleOAuthCallback: unknown };
  }).stripeConnect.handleOAuthCallback) as (args: {
    sessionId: string;
    organizationId: Id<"organizations">;
    code: string;
    state: string;
    isTestMode: boolean;
  }) => Promise<unknown>;

  // Handle Stripe OAuth callback immediately when component mounts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state && sessionId && organizationId) {
      console.log('[PaymentsWindow] Processing Stripe OAuth callback immediately...');

      // Clean up URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);

      // Process OAuth callback
      handleOAuthCallback({
        sessionId,
        organizationId: state as Id<"organizations">,
        code,
        state,
        isTestMode: false, // Default to live mode
      }).then(() => {
        console.log('[PaymentsWindow] OAuth callback processed - switching to providers tab');
        setActiveTab("providers"); // Show providers list so they can see the connected status
      }).catch((error) => {
        console.error('[PaymentsWindow] OAuth callback failed:', error);
      });
    }
  }, [sessionId, organizationId, handleOAuthCallback]);

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
      <InteriorRoot className="flex h-full flex-col">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: "var(--primary)" }} />
            <p style={{ color: "var(--window-document-text)" }}>{t("ui.payments.loading")}</p>
          </div>
        </div>
      </InteriorRoot>
    );
  }

  if (!user) {
    return (
      <InteriorRoot className="flex h-full flex-col">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={48} style={{ color: "var(--error)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--window-document-text)" }}>{t("ui.payments.please_login")}</p>
          </div>
        </div>
      </InteriorRoot>
    );
  }

  if (!organizationId) {
    return (
      <InteriorRoot className="flex h-full flex-col">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Building2 size={48} style={{ color: "var(--warning)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--window-document-text)" }} className="font-semibold">
              {t("ui.payments.no_org_selected")}
            </p>
            <p style={{ color: "var(--desktop-menu-text-muted)" }} className="text-sm mt-2">
              {t("ui.payments.select_org_prompt")}
            </p>
          </div>
        </div>
      </InteriorRoot>
    );
  }

  // Check if user has access to the organization
  if (organization === null && organizationId && sessionId) {
    return (
      <InteriorRoot className="flex h-full flex-col">
        <div className="flex items-center justify-center h-full">
          <div className="max-w-md mx-auto p-6">
            <div className="border-2 p-4" style={{ borderColor: "var(--error)", background: "var(--error-bg)" }}>
              <div className="flex items-start gap-3">
                <AlertCircle size={24} style={{ color: "var(--error)" }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm mb-2" style={{ color: "var(--error)" }}>
                    {t("ui.payments.access_denied") || "Access Denied"}
                  </h4>
                  <p className="text-xs mb-2" style={{ color: "var(--window-document-text)" }}>
                    {t("ui.payments.no_permission") || "You don't have permission to view payment settings for this organization."}
                  </p>
                  <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {t("ui.payments.contact_admin") || "Please contact your organization administrator if you need access to payment management."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </InteriorRoot>
    );
  }

  return (
    <InteriorRoot className="flex h-full flex-col">
      {/* Header */}
      <InteriorHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Back to desktop link (full-screen mode only) */}
          {fullScreen && (
            <Link
              href="/"
              className="desktop-interior-button mr-3 inline-flex h-9 items-center gap-2 px-3 text-xs"
              title="Back to Desktop"
            >
              <ArrowLeft size={14} />
            </Link>
          )}
          <div>
            <InteriorTitle className="flex items-center gap-2 text-sm">
              <CreditCard size={16} />
              {t("ui.payments.title")}
            </InteriorTitle>
            <InteriorSubtitle className="mt-1 text-xs">
              {t("ui.payments.subtitle")}
            </InteriorSubtitle>
          </div>

          {/* Organization Info */}
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              {currentOrganization?.name}
            </p>
            {organization?.paymentProviders?.find((p) => p.providerCode === "stripe-connect") && (
              <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {t("ui.payments.status")}: {organization.paymentProviders.find((p) => p.providerCode === "stripe-connect")?.status}
              </p>
            )}
          </div>

          {/* Open full screen link (window mode only) */}
          {!fullScreen && (
            <Link
              href="/payments"
              className="desktop-interior-button inline-flex h-9 items-center gap-2 px-3 text-xs"
              title="Open Full Screen"
            >
              <Maximize2 size={14} />
            </Link>
          )}
        </div>
      </InteriorHeader>

      {/* Tabs */}
      <InteriorTabRow className="gap-2 border-b">
        <InteriorTabButton active={activeTab === "providers"} className="flex items-center gap-2" onClick={() => setActiveTab("providers")}>
          <LayoutGrid size={14} />
          Providers
        </InteriorTabButton>
        <InteriorTabButton active={activeTab === "stripe"} className="flex items-center gap-2" onClick={() => setActiveTab("stripe")}>
          <CreditCard size={14} />
          {t("ui.payments.tab_stripe")}
        </InteriorTabButton>
        <InteriorTabButton active={activeTab === "invoicing"} className="flex items-center gap-2" onClick={() => setActiveTab("invoicing")}>
          <FileText size={14} />
          Invoicing (+Stripe)
        </InteriorTabButton>
      </InteriorTabRow>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "providers" && (
          <ProvidersTab onSelectProvider={(tabId) => setActiveTab(tabId)} />
        )}

        {activeTab === "stripe" && (
          <div className="p-4">
            <StripeConnectSection organizationId={organizationId as Id<"organizations">} organization={organization} />
          </div>
        )}

        {activeTab === "invoicing" && <InvoicingSection />}
      </div>

      {/* Footer */}
      <div
        className="border-t px-4 py-3"
        style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}
      >
        <div className="flex justify-between items-center">
          <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
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
    </InteriorRoot>
  );
}
