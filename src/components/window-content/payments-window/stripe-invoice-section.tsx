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

interface StripeInvoiceSectionProps {
  organizationId: Id<"organizations">;
  organization?: Doc<"organizations"> | null;
}

export function StripeInvoiceSection({ organizationId, organization }: StripeInvoiceSectionProps) {
  const { sessionId } = useAuth();
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
              Stripe Connection Required
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Connect your Stripe account first to enable Stripe Invoicing.
              Go to the &quot;Stripe Connect&quot; tab to get started.
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
              Stripe Invoicing Not Set Up
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Stripe Invoicing is available for all accounts. Click below to set it up in your system.
            </p>

            {/* What's needed */}
            <div className="mt-3 p-3 border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                Requirements:
              </p>
              <ul className="text-xs space-y-1" style={{ color: "var(--neutral-gray)" }}>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Stripe account connected
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Business profile is set up
                </li>
              </ul>
            </div>

            {/* Success message */}
            {requestSuccess && (
              <div className="mt-3 p-3 border-2" style={{ borderColor: "var(--success)", background: "var(--success-light)" }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                    Invoicing enabled successfully!
                  </p>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  Stripe Invoicing is now active for your account. Click Refresh to update the UI.
                </p>
              </div>
            )}

            {/* Error message */}
            {requestError && (
              <div className="mt-3 p-3 border-2" style={{ borderColor: "var(--danger)", background: "var(--danger-light)" }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                    Failed to enable invoicing
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
                    Enabling...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Enable Invoicing
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
                Open Stripe Dashboard
              </a>
            </div>

            <p className="text-xs mt-3" style={{ color: "var(--neutral-gray)" }}>
              Click &quot;Enable Invoicing&quot; to set up invoicing in your account (requires business profile), or visit your Stripe Dashboard to create invoices. After enabling, click the Refresh button in the Stripe Connect section to update your status.
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
            How to Enable Stripe Invoicing
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
            <li>Go to your Stripe Dashboard (link above)</li>
            <li>Navigate to Settings → Business Settings → Capabilities</li>
            <li>Look for &quot;Invoicing&quot; capability and enable it</li>
            <li>Complete any required information (may require Stripe support approval)</li>
            <li>Return here and click Refresh to sync the new capability</li>
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
          <CheckCircle2 className="text-green-500 flex-shrink-0" size={20} />
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-1" style={{ color: "var(--win95-text)" }}>
              Stripe Invoicing: Enabled
            </h3>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              Your account is configured to create and manage invoices through Stripe
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
          Invoice Configuration
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Invoicing:</span>
            <span className="font-semibold" style={{ color: "var(--success)" }}>
              Enabled
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Collection Method:</span>
            <span className="font-mono" style={{ color: "var(--win95-text)" }}>
              {invoiceSettings?.collectionMethod || "send_invoice"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Payment Terms:</span>
            <span className="font-mono" style={{ color: "var(--win95-text)" }}>
              {invoiceSettings?.paymentTerms || "net_30"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Days Until Due:</span>
            <span className="font-mono" style={{ color: "var(--win95-text)" }}>
              {invoiceSettings?.daysUntilDue || 30}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Auto Advance:</span>
            <span className="font-semibold" style={{
              color: invoiceSettings?.autoAdvance ? "var(--success)" : "var(--neutral-gray)"
            }}>
              {invoiceSettings?.autoAdvance ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--neutral-gray)" }}>Stripe Account Mode:</span>
            <span className="font-semibold" style={{ color: isTestMode ? "var(--warning)" : "var(--success)" }}>
              {isTestMode ? "Test Mode" : "Live Mode"}
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
          What Stripe Invoicing Does
        </h3>
        <ul className="space-y-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
          <li className="flex items-start gap-2">
            <FileText size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>Create professional invoices with your branding</span>
          </li>
          <li className="flex items-start gap-2">
            <Send size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>Automatically send invoices to customers via email</span>
          </li>
          <li className="flex items-start gap-2">
            <CreditCard size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>Accept payments online with hosted invoice pages</span>
          </li>
          <li className="flex items-start gap-2">
            <Receipt size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>Track payment status and send automatic reminders</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--success)" }} />
            <span>Integrate with Stripe Tax for automatic tax calculation</span>
          </li>
        </ul>
      </div>

      {/* Manage in Stripe Dashboard */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="font-bold text-sm mb-3" style={{ color: "var(--win95-text)" }}>
          Manage Invoices
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
          Create, send, and manage invoices directly from your Stripe Dashboard.
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
            View Invoices
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
            Create Invoice
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
          Important Notes
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Invoices can be sent automatically or manually to customers</li>
          <li>Customers can pay invoices online via hosted payment pages</li>
          <li>Combine with Stripe Tax for automatic tax calculation on invoices</li>
          <li>Payment terms and due dates can be customized per invoice</li>
          <li>Stripe handles payment reminders and collection automatically</li>
        </ul>
      </div>
    </div>
  );
}
