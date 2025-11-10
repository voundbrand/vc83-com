"use client";

/**
 * STRIPE INVOICE SETTINGS SECTION
 *
 * Shows Stripe Invoicing capability status and allows enabling it.
 * Similar pattern to Stripe Tax Section.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Info,
  FileText,
  Receipt,
  Send,
  CreditCard,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface StripeInvoiceSectionProps {
  organizationId: Id<"organizations">;
  organization?: Doc<"organizations"> | null;
}

export function StripeInvoiceSection({ organizationId, organization }: StripeInvoiceSectionProps) {
  const { sessionId } = useAuth();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.payments.invoicing");
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Get organization invoice settings
  const invoiceSettings = useQuery(
    api.organizationInvoiceSettings.getInvoiceSettings,
    sessionId && organizationId
      ? { sessionId, organizationId }
      : "skip"
  );

  // Mutation to request invoicing capability
  const requestInvoicing = useMutation(api.stripeConnect.triggerInvoicingCapabilityRequest);

  // Get Stripe Connect account
  const stripeProvider = organization?.paymentProviders?.find(
    (p) => p.providerCode === "stripe-connect"
  );

  // Organization's Stripe account ID (e.g., acct_1HbNLqEEbynvhkix)
  const orgStripeAccountId = stripeProvider?.accountId;
  const isTestMode = stripeProvider?.isTestMode ?? false;

  // Handler to request invoicing capability
  const handleRequestInvoicing = async () => {
    if (!sessionId || !organizationId) {
      setRequestError("Session or organization not found");
      return;
    }

    setIsRequesting(true);
    setRequestError(null);
    setRequestSuccess(false);

    try {
      await requestInvoicing({ sessionId, organizationId });
      setRequestSuccess(true);
      // Success message will show for 5 seconds
      setTimeout(() => setRequestSuccess(false), 5000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to request invoicing capability";
      setRequestError(errorMessage);
    } finally {
      setIsRequesting(false);
    }
  };

  // Check if invoicing is enabled
  const invoicingEnabled = invoiceSettings?.invoicingEnabled ?? false;

  // Show loading state while translations load
  if (translationsLoading) {
    return <div className="p-4" style={{ color: "var(--win95-text)" }}>Loading...</div>;
  }

  // Not connected to Stripe
  if (!orgStripeAccountId) {
    return (
      <div className="space-y-4">
        <div
          className="p-4 border-2 flex items-start gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--info-light)",
          }}
        >
          <Info size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--info)" }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--win95-text)" }}>
              {t("ui.payments.invoicing.connection_required.title")}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.invoicing.connection_required.description")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Invoicing not enabled
  if (!invoicingEnabled) {
    return (
      <div className="space-y-4">
        <div
          className="p-4 border-2 flex items-start gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--warning-light)",
          }}
        >
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--warning)" }} />
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: "var(--win95-text)" }}>
              {t("ui.payments.invoicing.not_setup.title")}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.invoicing.not_setup.description")}
            </p>

            {/* What's needed */}
            <div className="mt-3 p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                {t("ui.payments.invoicing.requirements.title")}
              </p>
              <ul className="text-xs space-y-1" style={{ color: "var(--neutral-gray)" }}>
                <li className="flex items-center gap-2">
                  <span style={{ color: "var(--success)" }}>✓</span>
                  {t("ui.payments.invoicing.requirements.stripe_connected")}
                </li>
                <li className="flex items-center gap-2">
                  <span style={{ color: "var(--success)" }}>✓</span>
                  {t("ui.payments.invoicing.requirements.business_profile")}
                </li>
              </ul>
            </div>

            {/* Success message */}
            {requestSuccess && (
              <div className="mt-3 p-3 border-2" style={{ borderColor: "var(--success)", background: "var(--success-light)" }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                  <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                    {t("ui.payments.invoicing.success.title")}
                  </p>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  {t("ui.payments.invoicing.success.description")}
                </p>
              </div>
            )}

            {/* Error message */}
            {requestError && (
              <div className="mt-3 p-3 border-2" style={{ borderColor: "var(--danger)", background: "var(--danger-light)" }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} style={{ color: "var(--error)" }} />
                  <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                    {t("ui.payments.invoicing.error.title")}
                  </p>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  {requestError}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleRequestInvoicing}
                disabled={isRequesting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "white",
                  border: "2px solid",
                  borderTopColor: "var(--win95-button-light)",
                  borderLeftColor: "var(--win95-button-light)",
                  borderBottomColor: "var(--win95-button-dark)",
                  borderRightColor: "var(--win95-button-dark)",
                }}
              >
                {isRequesting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t("ui.payments.invoicing.buttons.enabling")}
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    {t("ui.payments.invoicing.buttons.enable")}
                  </>
                )}
              </button>

              <a
                href={`https://dashboard.stripe.com/${orgStripeAccountId}/invoices`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                style={{
                  backgroundColor: "var(--win95-bg)",
                  color: "var(--win95-text)",
                  border: "2px solid",
                  borderTopColor: "var(--win95-button-light)",
                  borderLeftColor: "var(--win95-button-light)",
                  borderBottomColor: "var(--win95-button-dark)",
                  borderRightColor: "var(--win95-button-dark)",
                  textDecoration: "none",
                }}
              >
                <ExternalLink size={14} />
                {t("ui.payments.invoicing.buttons.dashboard")}
              </a>
            </div>

            <p className="text-xs mt-3" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.invoicing.how_to.note")}
            </p>
          </div>
        </div>

        {/* How to enable instructions */}
        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Info size={14} />
            {t("ui.payments.invoicing.how_to.title")}
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
            <li>{t("ui.payments.invoicing.how_to.step1")}</li>
            <li>{t("ui.payments.invoicing.how_to.step2")}</li>
            <li>{t("ui.payments.invoicing.how_to.step3")}</li>
            <li>{t("ui.payments.invoicing.how_to.step4")}</li>
            <li>{t("ui.payments.invoicing.how_to.step5")}</li>
          </ol>
        </div>
      </div>
    );
  }

  // Invoicing enabled - show configuration
  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div
        className="p-4 border-2"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--success-light)",
        }}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 style={{ color: "var(--success)" }} className="flex-shrink-0" size={20} />
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
              {t("ui.payments.invoicing.status.enabled.title")}
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              {t("ui.payments.invoicing.status.enabled.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Details */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
          {t("ui.payments.invoicing.config.title")}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.invoicing.config.invoicing")}</span>
            <span className="font-semibold" style={{ color: "var(--success)" }}>
              {t("ui.payments.invoicing.config.enabled")}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.invoicing.config.collection_method")}</span>
            <span className="font-mono" style={{ color: "var(--win95-text)" }}>
              {invoiceSettings?.collectionMethod || "send_invoice"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.invoicing.config.payment_terms")}</span>
            <span className="font-mono" style={{ color: "var(--win95-text)" }}>
              {invoiceSettings?.paymentTerms || "net_30"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.invoicing.config.days_until_due")}</span>
            <span className="font-mono" style={{ color: "var(--win95-text)" }}>
              {invoiceSettings?.daysUntilDue || 30}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.invoicing.config.auto_advance")}</span>
            <span className="font-semibold" style={{
              color: invoiceSettings?.autoAdvance ? "var(--success)" : "var(--neutral-gray)"
            }}>
              {invoiceSettings?.autoAdvance ? t("ui.payments.invoicing.config.yes") : t("ui.payments.invoicing.config.no")}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>{t("ui.payments.invoicing.config.stripe_mode")}</span>
            <span className="font-semibold" style={{ color: isTestMode ? "var(--warning)" : "var(--success)" }}>
              {isTestMode ? t("ui.payments.invoicing.config.test_mode") : t("ui.payments.invoicing.config.live_mode")}
            </span>
          </div>
        </div>
      </div>

      {/* Stripe Invoicing Features */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
          {t("ui.payments.invoicing.features.title")}
        </h3>
        <ul className="space-y-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
          <li className="flex items-start gap-2">
            <FileText size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>{t("ui.payments.invoicing.features.branding")}</span>
          </li>
          <li className="flex items-start gap-2">
            <Send size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>{t("ui.payments.invoicing.features.auto_send")}</span>
          </li>
          <li className="flex items-start gap-2">
            <CreditCard size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>{t("ui.payments.invoicing.features.online_payment")}</span>
          </li>
          <li className="flex items-start gap-2">
            <Receipt size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>{t("ui.payments.invoicing.features.tracking")}</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>{t("ui.payments.invoicing.features.tax_integration")}</span>
          </li>
        </ul>
      </div>

      {/* Manage in Stripe Dashboard */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
          {t("ui.payments.invoicing.manage.title")}
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.payments.invoicing.manage.description")}
        </p>

        <div className="flex gap-2">
          <a
            href={`https://dashboard.stripe.com/${orgStripeAccountId}/invoices`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2"
            style={{
              backgroundColor: "var(--primary)",
              color: "white",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
              textDecoration: "none",
            }}
          >
            <FileText size={14} />
            {t("ui.payments.invoicing.buttons.view_invoices")}
          </a>

          <a
            href={`https://dashboard.stripe.com/${orgStripeAccountId}/invoices/create`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold flex items-center gap-2"
            style={{
              backgroundColor: "var(--win95-button-face)",
              color: "var(--win95-text)",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={14} />
            {t("ui.payments.invoicing.buttons.create_invoice")}
          </a>
        </div>
      </div>

      {/* Important Notes */}
      <div
        className="p-3 border-2 text-xs"
        style={{
          borderColor: "var(--win95-border)",
          background: "var(--info-light)",
          color: "var(--win95-text)",
        }}
      >
        <p className="font-semibold mb-2 flex items-center gap-2">
          <Info size={14} />
          {t("ui.payments.invoicing.notes.title")}
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>{t("ui.payments.invoicing.notes.send_auto_manual")}</li>
          <li>{t("ui.payments.invoicing.notes.online_payment")}</li>
          <li>{t("ui.payments.invoicing.notes.tax_integration")}</li>
          <li>{t("ui.payments.invoicing.notes.custom_terms")}</li>
          <li>{t("ui.payments.invoicing.notes.auto_collection")}</li>
        </ul>
      </div>
    </div>
  );
}
