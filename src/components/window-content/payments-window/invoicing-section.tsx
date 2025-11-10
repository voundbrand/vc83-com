"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useWindowManager } from "@/hooks/use-window-manager";
import { InvoicingWindow } from "@/components/window-content/invoicing-window";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Settings,
  CircleDot
} from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

/**
 * Invoicing Section for Payment Management
 *
 * Shows:
 * 1. Invoice payment status and setup checklist
 * 2. Quick statistics (invoices sent, paid, pending)
 * 3. Stripe Invoice integration toggle
 * 4. Link to full Invoicing Window
 */
export function InvoicingSection() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [isEnabling, setIsEnabling] = useState(false);
  const { openWindow } = useWindowManager();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.payments.invoicing");

  // Check if invoice payment is available
  const invoiceAvailability = useQuery(
    api.paymentProviders.invoiceAvailability.checkInvoicePaymentAvailability,
    sessionId && currentOrg
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  // Get invoice statistics
  const invoiceStats = useQuery(
    api.invoicingOntology.getInvoiceStats,
    sessionId && currentOrg
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  // Get organization to check Stripe Invoice settings
  const organization = useQuery(
    api.organizations.getById,
    sessionId && currentOrg
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  const handleEnableInvoicing = async () => {
    if (!sessionId || !currentOrg) return;

    setIsEnabling(true);
    try {
      alert("To enable invoicing, please contact your system administrator to enable the 'B2B/B2C Invoicing' app for your organization in the App Store.");
    } catch (error) {
      console.error("Failed to enable invoicing:", error);
    } finally {
      setIsEnabling(false);
    }
  };

  // Check Stripe Invoice settings
  const stripeProvider = organization?.paymentProviders?.find(
    (p) => p.providerCode === "stripe" || p.providerCode === "stripe-connect"
  );
  // Check if Stripe Invoice is enabled (stored in metadata)
  const hasStripeInvoiceEnabled = Boolean(stripeProvider?.metadata?.stripeInvoiceEnabled);

  // Setup checklist
  const setupItems = translationsLoading ? [] : [
    {
      label: t("ui.payments.invoicing.requirements.title"),
      status: invoiceAvailability?.available ? "complete" : "incomplete",
      action: invoiceAvailability?.available ? null : t("ui.payments.invoicing.buttons.enable"),
      onClick: invoiceAvailability?.available ? null : handleEnableInvoicing,
    },
    {
      label: t("ui.payments.invoicing.requirements.business_profile"),
      status: invoiceAvailability?.crmOrganizationsCount ?? 0 > 0 ? "complete" : "optional",
      description: `${invoiceAvailability?.crmOrganizationsCount ?? 0} employer organizations in CRM (will be created during checkout)`,
    },
    {
      label: t("ui.payments.invoicing.config.stripe_mode"),
      status: hasStripeInvoiceEnabled ? "complete" : "optional",
      description: hasStripeInvoiceEnabled
        ? t("ui.payments.invoicing.status.enabled.description")
        : t("ui.payments.invoicing.not_setup.description"),
    },
  ];

  if (translationsLoading) {
    return (
      <div className="p-4">
        <p style={{ color: "var(--win95-text)" }}>Loading translations...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <FileText size={16} />
          {t("ui.payments.invoicing.manage.title")}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.payments.invoicing.manage.description")}
        </p>
      </div>

      {/* Status Card */}
      <div
        className="p-4 rounded border-2"
        style={{
          background: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {invoiceAvailability?.available ? (
              <>
                <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
                <span className="text-sm font-bold" style={{ color: "var(--success)" }}>
                  {t("ui.payments.invoicing.status.enabled.title")}
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={20} style={{ color: "var(--warning)" }} />
                <span className="text-sm font-bold" style={{ color: "var(--warning)" }}>
                  {t("ui.payments.invoicing.not_setup.title")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Setup Checklist */}
        <div className="space-y-2 mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            {t("ui.payments.invoicing.requirements.title")}
          </p>
          {setupItems.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              {item.status === "complete" ? (
                <CheckCircle2 size={16} style={{ color: "var(--success)" }} className="mt-0.5 flex-shrink-0" />
              ) : item.status === "optional" ? (
                <CircleDot size={16} style={{ color: "var(--neutral-gray)" }} className="mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle size={16} style={{ color: "var(--warning)" }} className="mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                  {item.label}
                </p>
                {item.description && (
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {item.description}
                  </p>
                )}
                {item.action && (
                  <button
                    onClick={item.onClick || undefined}
                    disabled={isEnabling}
                    className="text-xs font-semibold mt-1 hover:underline"
                    style={{ color: "var(--win95-highlight)" }}
                  >
                    {isEnabling ? t("ui.payments.invoicing.buttons.enabling") : item.action}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        {invoiceStats && (
          <div className="pt-3 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
              Quick Stats:
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Total Invoices</p>
                <p className="text-lg font-bold" style={{ color: "var(--win95-text)" }}>
                  {invoiceStats.totalCount || 0}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Paid</p>
                <p className="text-lg font-bold" style={{ color: "var(--success)" }}>
                  {invoiceStats.paidCount || 0}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Pending</p>
                <p className="text-lg font-bold" style={{ color: "var(--warning)" }}>
                  {invoiceStats.pendingCount || 0}
                </p>
              </div>
            </div>
            {invoiceStats.totalAmountInCents !== undefined && (
              <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--win95-border)" }}>
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Total Amount</p>
                <p className="text-lg font-bold" style={{ color: "var(--win95-text)" }}>
                  €{((invoiceStats.totalAmountInCents || 0) / 100).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stripe Invoice Integration */}
      <div
        className="p-4 rounded border-2"
        style={{
          background: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <CreditCard size={20} style={{ color: "var(--win95-highlight)" }} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              {t("ui.payments.invoicing.status.enabled.title")}
            </h4>
            <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.invoicing.status.enabled.description")}
            </p>
            <div className="flex items-center gap-2">
              <div
                className="px-2 py-1 rounded text-xs font-semibold border-2"
                style={{
                  background: hasStripeInvoiceEnabled ? "var(--success)" : "var(--win95-bg)",
                  borderColor: hasStripeInvoiceEnabled ? "var(--success)" : "var(--win95-border)",
                  color: hasStripeInvoiceEnabled ? "white" : "var(--neutral-gray)"
                }}
              >
                {hasStripeInvoiceEnabled ? `✓ ${t("ui.payments.invoicing.config.enabled")}` : `○ ${t("ui.payments.invoicing.not_setup.title")}`}
              </div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: Navigate to Stripe settings tab
                  alert("Navigate to Stripe settings to enable Stripe Invoice integration");
                }}
                className="text-xs font-semibold hover:underline flex items-center gap-1"
                style={{ color: "var(--win95-highlight)" }}
              >
                <Settings size={12} />
                Configure in Stripe Settings
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            openWindow(
              "invoicing",
              "B2B/B2C Invoicing",
              <InvoicingWindow />,
              { x: 120, y: 80 },
              { width: 900, height: 600 }
            );
          }}
          className="flex-1 px-4 py-2 text-sm font-bold rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          style={{
            background: "var(--win95-highlight)",
            color: "var(--win95-titlebar-text)",
            border: "2px solid var(--win95-border)",
          }}
        >
          <Building2 size={16} />
          {t("ui.payments.invoicing.manage.title")}
        </button>
      </div>

      {/* Help Text */}
      <div className="text-xs space-y-1" style={{ color: "var(--neutral-gray)" }}>
        <p>
          <strong>{t("ui.payments.invoicing.how_to.title")}</strong>
        </p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>{t("ui.payments.invoicing.features.branding")}</li>
          <li>{t("ui.payments.invoicing.features.auto_send")}</li>
          <li>{t("ui.payments.invoicing.features.online_payment")}</li>
          <li>{t("ui.payments.invoicing.features.tracking")}</li>
        </ul>
      </div>
    </div>
  );
}
