"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useWindowManager } from "@/hooks/use-window-manager";
import { InvoicingWindow } from "@/components/window-content/invoicing-window";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useNotification } from "@/hooks/use-notification";
import {
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Settings,
  CircleDot,
  Loader2,
  Info,
  Zap,
  Mail,
  Bell,
  RefreshCw,
  Link2,
  Clock,
} from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

/**
 * Invoicing Section for Payment Management
 *
 * This tab focuses on STRIPE INVOICING INTEGRATION:
 * - Connect your internal invoicing system to Stripe
 * - Enable online payment collection via Stripe-hosted payment pages
 * - Automatic payment status sync via webhooks
 * - Payment reminders and dunning (future)
 *
 * Internal invoice settings (prefix, numbering, payment terms) are managed
 * in the Invoicing Window → Settings tab
 */
export function InvoicingSection() {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [isEnabling, setIsEnabling] = useState(false);
  const [isTogglingStripe, setIsTogglingStripe] = useState(false);
  const { openWindow } = useWindowManager();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.payments.invoicing");
  const notification = useNotification();

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

  // Get invoice settings (includes useStripeInvoices toggle)
  const invoiceSettings = useQuery(
    api.organizationInvoiceSettings.getInvoiceSettings,
    sessionId && currentOrg
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  // Mutation to update invoice settings
  const updateInvoiceSettings = useMutation(api.organizationInvoiceSettings.updateInvoiceSettings);

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

  const handleToggleStripeInvoices = async () => {
    if (!sessionId || !currentOrg) return;

    setIsTogglingStripe(true);
    try {
      const newValue = !invoiceSettings?.useStripeInvoices;

      await updateInvoiceSettings({
        sessionId,
        organizationId: currentOrg.id as Id<"organizations">,
        useStripeInvoices: newValue,
      });

      notification.success(
        newValue ? "Stripe Invoices Enabled" : "Stripe Invoices Disabled",
        newValue
          ? "Invoices will now be synced to Stripe for payment collection"
          : "Invoices will only be generated as PDFs"
      );
    } catch (error) {
      console.error("Failed to toggle Stripe invoices:", error);
      notification.error(
        "Update Failed",
        error instanceof Error ? error.message : "Failed to update Stripe invoice settings"
      );
    } finally {
      setIsTogglingStripe(false);
    }
  };

  const handleOpenInvoicingApp = () => {
    openWindow(
      "invoicing",
      "B2B/B2C Invoicing",
      <InvoicingWindow />,
      { x: 120, y: 80 },
      { width: 900, height: 600 }
    );
  };

  const handleOpenInvoicingSettings = () => {
    openWindow(
      "invoicing",
      "B2B/B2C Invoicing",
      <InvoicingWindow initialTab="settings" />,
      { x: 120, y: 80 },
      { width: 900, height: 600 }
    );
  };

  // Check Stripe Invoice settings - use backend useStripeInvoices setting
  const stripeProvider = organization?.paymentProviders?.find(
    (p) => p.providerCode === "stripe" || p.providerCode === "stripe-connect"
  );
  const hasStripeConnected = Boolean(stripeProvider && stripeProvider.status === "active");
  const hasStripeInvoiceEnabled = Boolean(invoiceSettings?.useStripeInvoices);

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
      description: `${invoiceAvailability?.crmOrganizationsCount ?? 0} employer organizations in CRM`,
    },
    {
      label: "Stripe Invoicing Connected",
      status: hasStripeInvoiceEnabled ? "complete" : "optional",
      description: hasStripeInvoiceEnabled
        ? "Online payment collection enabled"
        : "Optional: Enable for online payments",
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
      {/* Header with explanation */}
      <div>
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <CreditCard size={16} />
          Stripe Invoicing Integration
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Connect your invoicing system to Stripe for online payment collection. When enabled, invoices are synced to Stripe where customers can pay via credit card, bank transfer, and more.
        </p>
      </div>

      {/* Internal Settings Note */}
      <div
        className="p-3 rounded border-2 flex items-start gap-3"
        style={{
          borderColor: "var(--win95-highlight)",
          background: "rgba(99, 91, 255, 0.05)",
        }}
      >
        <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--win95-highlight)" }} />
        <div className="flex-1">
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--win95-highlight)" }}>
            Internal Invoice Settings
          </p>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Invoice numbering, prefix, and default payment terms are configured in the{" "}
            <button
              onClick={handleOpenInvoicingSettings}
              className="font-bold hover:underline"
              style={{ color: "var(--win95-highlight)" }}
            >
              Invoicing App → Settings
            </button>
          </p>
        </div>
      </div>

      {/* How It Works Section */}
      <div
        className="p-4 rounded border-2"
        style={{
          background: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <Zap size={14} />
          How Stripe Invoicing Works
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "var(--win95-highlight)", color: "white" }}>1</div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>Invoice Created</p>
              <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>Create invoice in your system (checkout or manual)</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "var(--win95-highlight)", color: "white" }}>2</div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>Synced to Stripe</p>
              <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>Invoice is automatically created in Stripe</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "var(--win95-highlight)", color: "white" }}>3</div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>Customer Pays Online</p>
              <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>Customer receives payment link (card, bank transfer)</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "var(--win95-highlight)", color: "white" }}>4</div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>Status Synced Back</p>
              <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>Payment status updates automatically via webhooks</p>
            </div>
          </div>
        </div>
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
                  Invoicing Available
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={20} style={{ color: "var(--warning)" }} />
                <span className="text-sm font-bold" style={{ color: "var(--warning)" }}>
                  Invoicing Not Enabled
                </span>
              </>
            )}
          </div>
        </div>

        {/* Setup Checklist */}
        <div className="space-y-2 mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            Setup Checklist:
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
                    {isEnabling ? "Enabling..." : item.action}
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

      {/* Stripe Invoice Integration Toggle */}
      <div
        className="p-4 rounded border-2"
        style={{
          background: "var(--win95-bg-light)",
          borderColor: hasStripeInvoiceEnabled ? "var(--success)" : "var(--win95-border)",
        }}
      >
        <div className="flex items-start gap-3">
          <CreditCard size={20} style={{ color: hasStripeInvoiceEnabled ? "var(--success)" : "var(--win95-highlight)" }} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Enable Stripe Invoicing
            </h4>
            <p className="text-xs mb-3" style={{ color: "var(--neutral-gray)" }}>
              When enabled, invoices are synced to Stripe for online payment collection. Customers receive a Stripe-hosted payment page to pay via credit card, bank transfer, or other methods.
            </p>

            {!hasStripeConnected ? (
              <div className="flex items-center gap-2 p-2 rounded" style={{ background: "var(--win95-bg)", border: "1px solid var(--win95-border)" }}>
                <AlertCircle size={16} style={{ color: "var(--warning)" }} />
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Connect Stripe first in the "Stripe Connect" tab to enable Stripe Invoicing
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Toggle Switch */}
                <div className="flex items-center justify-between p-3 rounded" style={{ background: "var(--win95-bg)", border: "1px solid var(--win95-border)" }}>
                  <div className="flex-1">
                    <p className="text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                      Sync Invoices to Stripe
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {hasStripeInvoiceEnabled
                        ? "Invoices are synced to Stripe with payment links"
                        : "Invoices are internal-only (PDF generation only)"}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleStripeInvoices}
                    disabled={isTogglingStripe}
                    className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ml-3"
                    style={{
                      background: hasStripeInvoiceEnabled ? "var(--success)" : "var(--neutral-gray)",
                      opacity: isTogglingStripe ? 0.5 : 1,
                      cursor: isTogglingStripe ? "not-allowed" : "pointer"
                    }}
                  >
                    {isTogglingStripe ? (
                      <Loader2 size={16} className="animate-spin mx-auto" style={{ color: "white" }} />
                    ) : (
                      <span
                        className="inline-block w-4 h-4 transform bg-white rounded-full transition-transform"
                        style={{
                          transform: hasStripeInvoiceEnabled ? "translateX(1.5rem)" : "translateX(0.25rem)"
                        }}
                      />
                    )}
                  </button>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <div
                    className="px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      background: hasStripeInvoiceEnabled ? "var(--success)" : "var(--win95-bg)",
                      color: hasStripeInvoiceEnabled ? "white" : "var(--neutral-gray)",
                      border: "1px solid",
                      borderColor: hasStripeInvoiceEnabled ? "var(--success)" : "var(--win95-border)"
                    }}
                  >
                    {hasStripeInvoiceEnabled ? " Stripe Invoicing Active" : "○ Internal Only"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Future Features Section (Coming Soon) */}
      {hasStripeInvoiceEnabled && (
        <div
          className="p-4 rounded border-2"
          style={{
            background: "var(--win95-bg-light)",
            borderColor: "var(--win95-border)",
            opacity: 0.7,
          }}
        >
          <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "var(--neutral-gray)" }}>
            <Clock size={14} />
            Coming Soon: Advanced Stripe Invoicing
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2 p-2 rounded" style={{ background: "var(--win95-bg)" }}>
              <Mail size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--neutral-gray)" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--neutral-gray)" }}>Auto-Send via Stripe</p>
                <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>Automatically send invoices through Stripe's email system</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded" style={{ background: "var(--win95-bg)" }}>
              <Bell size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--neutral-gray)" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--neutral-gray)" }}>Payment Reminders</p>
                <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>Automatic reminder emails for overdue invoices</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded" style={{ background: "var(--win95-bg)" }}>
              <RefreshCw size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--neutral-gray)" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--neutral-gray)" }}>Smart Retry (Dunning)</p>
                <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>Automatic retry of failed payment attempts</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded" style={{ background: "var(--win95-bg)" }}>
              <Link2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--neutral-gray)" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--neutral-gray)" }}>Customer Portal</p>
                <p className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>Self-service portal for invoice history & payment methods</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleOpenInvoicingApp}
          className="flex-1 px-4 py-2 text-sm font-bold rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          style={{
            background: "var(--win95-highlight)",
            color: "var(--win95-titlebar-text)",
            border: "2px solid var(--win95-border)",
          }}
        >
          <Building2 size={16} />
          Open Invoicing App
        </button>
        <button
          onClick={handleOpenInvoicingSettings}
          className="px-4 py-2 text-sm font-bold rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          style={{
            background: "var(--win95-bg)",
            color: "var(--win95-text)",
            border: "2px solid var(--win95-border)",
          }}
        >
          <Settings size={16} />
          Settings
        </button>
      </div>

      {/* Without Stripe vs With Stripe comparison */}
      <div className="text-xs space-y-2" style={{ color: "var(--neutral-gray)" }}>
        <p className="font-bold" style={{ color: "var(--win95-text)" }}>
          Internal vs Stripe Invoicing:
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-2 rounded" style={{ background: "var(--win95-bg)", border: "1px solid var(--win95-border)" }}>
            <p className="font-semibold mb-1" style={{ color: "var(--win95-text)" }}>Without Stripe</p>
            <ul className="space-y-0.5 text-[10px]">
              <li>• PDF invoice generation</li>
              <li>• Manual payment tracking</li>
              <li>• Email invoices yourself</li>
              <li>• Accept bank transfers manually</li>
            </ul>
          </div>
          <div className="p-2 rounded" style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid var(--success)" }}>
            <p className="font-semibold mb-1" style={{ color: "var(--success)" }}>With Stripe</p>
            <ul className="space-y-0.5 text-[10px]">
              <li>• Hosted payment page</li>
              <li>• Card & bank payments</li>
              <li>• Automatic status sync</li>
              <li>• Payment reminders (coming)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
