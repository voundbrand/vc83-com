"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useOrganizationCurrency } from "@/hooks/use-organization-currency";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import {
  X,
  User,
  Building2,
  Package,
  Receipt,
  CreditCard,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface TransactionDetailModalProps {
  transactionId: Id<"objects">;
  sessionId: string;
  onClose: () => void;
}

export function TransactionDetailModal({
  transactionId,
  sessionId,
  onClose,
}: TransactionDetailModalProps) {
  // State for refund process
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState(false);

  // Get full transaction details (NEW: using actual transaction object)
  const transaction = useQuery(
    api.transactionOntology.getTransaction,
    sessionId && transactionId
      ? {
          sessionId,
          transactionId,
        }
      : "skip"
  );

  // Refund action
  const processRefund = useAction(api.stripeRefunds.processStripeRefund);

  // Get organization currency settings (SINGLE SOURCE OF TRUTH)
  const { currency: orgCurrency } = useOrganizationCurrency();

  // Currency formatting hook (uses organization's currency)
  const { formatCurrency } = useFormatCurrency({
    currency: orgCurrency,
  });

  // Check if transaction uses NEW format (lineItems array) or LEGACY format
  const hasLineItems = transaction?.customProperties?.lineItems &&
    Array.isArray(transaction.customProperties.lineItems) &&
    transaction.customProperties.lineItems.length > 0;

  // Calculate totals from lineItems if NEW format
  const totals = hasLineItems && transaction?.customProperties?.lineItems
    ? {
        subtotal: (transaction.customProperties.lineItems as Array<{
          unitPriceInCents: number;
          quantity: number;
        }>).reduce((sum, item) => sum + (item.unitPriceInCents * item.quantity), 0),
        tax: (transaction.customProperties.lineItems as Array<{
          taxAmountInCents: number;
        }>).reduce((sum, item) => sum + item.taxAmountInCents, 0),
        total: (transaction.customProperties.lineItems as Array<{
          totalPriceInCents: number;
        }>).reduce((sum, item) => sum + item.totalPriceInCents, 0),
      }
    : {
        subtotal: (transaction?.customProperties?.amountInCents as number) || 0,
        tax: (transaction?.customProperties?.taxAmountInCents as number) || 0,
        total: (transaction?.customProperties?.totalPriceInCents as number) || 0,
      };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  };

  // Handle refund button click
  const handleRefund = async () => {
    if (!transaction || !sessionId) return;

    // Confirm refund (use calculated total for both NEW and LEGACY formats)
    const confirmed = window.confirm(
      `Are you sure you want to refund ${formatCurrency(totals.total)}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsRefunding(true);
    setRefundError(null);

    try {
      const result = await processRefund({
        sessionId,
        transactionId,
        reason: "requested_by_customer",
      });

      if (result.success) {
        setRefundSuccess(true);
        // Optionally close modal after success
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error("Refund error:", error);
      setRefundError(error instanceof Error ? error.message : "Failed to process refund");
    } finally {
      setIsRefunding(false);
    }
  };

  // Check if transaction can be refunded
  const canRefund = () => {
    if (!transaction) return false;

    const paymentStatus = transaction.customProperties?.paymentStatus as string;
    const stripePaymentIntentId = transaction.customProperties?.stripePaymentIntentId as string | undefined;

    // Can only refund paid transactions with Stripe payment intent
    return (
      stripePaymentIntentId &&
      (paymentStatus === "paid" || paymentStatus === "partially_refunded")
    );
  };

  if (!transaction) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="border-4 max-w-4xl w-full max-h-[90vh] overflow-hidden"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin" size={48} style={{ color: "var(--primary)" }} />
          </div>
        </div>
      </div>
    );
  }

  // TODO: Implement invoice generation for new transaction system
  // const handleDownloadInvoice = async () => {
  //   alert("Invoice generation coming soon!");
  // };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="border-4 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2 flex items-center justify-between"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-bg-light)",
          }}
        >
          <div className="flex items-center gap-3">
            <Receipt size={20} style={{ color: "var(--win95-text)" }} />
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                Transaction Details
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {formatDate(transaction._creationTime)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 transition-colors"
            style={{ color: "var(--win95-text)" }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--win95-hover-light)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Customer Info */}
          <div
            className="border-2 p-4"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              {transaction.customProperties?.payerType === "organization" ? (
                <Building2 size={16} style={{ color: "var(--primary)" }} />
              ) : (
                <User size={16} style={{ color: "var(--primary)" }} />
              )}
              <h3 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                {transaction.customProperties?.payerType === "organization" ? "Business Customer" : "Customer Information"}
              </h3>
              {transaction.customProperties?.payerType === "organization" && (
                <span
                  className="px-2 py-0.5 text-[10px] font-bold rounded ml-auto"
                  style={{
                    backgroundColor: "var(--primary-light)",
                    color: "var(--primary)",
                  }}
                >
                  B2B
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Customer Name
                </p>
                <p style={{ color: "var(--win95-text)" }}>{transaction.customProperties?.customerName as string}</p>
              </div>
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Email
                </p>
                <p style={{ color: "var(--win95-text)" }}>{transaction.customProperties?.customerEmail as string}</p>
              </div>
              {transaction.customProperties?.customerPhone && (
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                    Phone
                  </p>
                  <p style={{ color: "var(--win95-text)" }}>{transaction.customProperties.customerPhone as string}</p>
                </div>
              )}
              {transaction.customProperties?.employerName && (
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                    Employer
                  </p>
                  <p style={{ color: "var(--win95-text)" }}>{transaction.customProperties.employerName as string}</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div
            className="border-2 p-4"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Package size={16} style={{ color: "var(--primary)" }} />
              <h3 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                {hasLineItems ? "Order Items" : "Product Details"}
              </h3>
              {hasLineItems && transaction?.customProperties?.lineItems && (
                <span
                  className="px-2 py-0.5 text-[10px] font-bold rounded ml-auto"
                  style={{
                    backgroundColor: "var(--primary-light)",
                    color: "var(--primary)",
                  }}
                >
                  {(transaction.customProperties.lineItems as Array<unknown>).length} items
                </span>
              )}
            </div>

            {hasLineItems && transaction?.customProperties?.lineItems ? (
              /* NEW FORMAT: Line Items Table */
              <div className="space-y-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b-2" style={{ borderColor: "var(--win95-border)" }}>
                        <th className="text-left pb-2 pr-2" style={{ color: "var(--neutral-gray)" }}>Product</th>
                        <th className="text-center pb-2 px-2" style={{ color: "var(--neutral-gray)" }}>Qty</th>
                        <th className="text-right pb-2 px-2" style={{ color: "var(--neutral-gray)" }}>Unit Price</th>
                        <th className="text-right pb-2 pl-2" style={{ color: "var(--neutral-gray)" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(transaction.customProperties.lineItems as Array<{
                        productName: string;
                        description?: string;
                        eventName?: string;
                        eventLocation?: string;
                        quantity: number;
                        unitPriceInCents: number;
                        totalPriceInCents: number;
                      }>).map((item, index) => (
                        <tr key={index} className="border-b" style={{ borderColor: "var(--win95-border)" }}>
                          <td className="py-2 pr-2">
                            <p className="font-semibold" style={{ color: "var(--win95-text)" }}>
                              {item.productName}
                            </p>
                            {item.description && (
                              <p className="text-[10px] mt-0.5" style={{ color: "var(--neutral-gray)" }}>
                                {item.description}
                              </p>
                            )}
                            {item.eventName && (
                              <p className="text-[10px] mt-0.5" style={{ color: "var(--neutral-gray)" }}>
                                📍 {item.eventName}
                              </p>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center" style={{ color: "var(--win95-text)" }}>
                            {item.quantity}
                          </td>
                          <td className="py-2 px-2 text-right" style={{ color: "var(--win95-text)" }}>
                            {formatCurrency(item.unitPriceInCents)}
                          </td>
                          <td className="py-2 pl-2 text-right font-semibold" style={{ color: "var(--win95-text)" }}>
                            {formatCurrency(item.totalPriceInCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* LEGACY FORMAT: Single Product */
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                    Product
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                    {transaction.customProperties?.productName as string}
                  </p>
                  {transaction.customProperties?.productDescription && (
                    <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      {transaction.customProperties.productDescription as string}
                    </p>
                  )}
                </div>

                {transaction.customProperties?.eventName && (
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                      Event
                    </p>
                    <p className="text-sm" style={{ color: "var(--win95-text)" }}>
                      {transaction.customProperties.eventName as string}
                    </p>
                    {transaction.customProperties?.eventLocation && (
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        {transaction.customProperties.eventLocation as string}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                      Quantity
                    </p>
                    <p style={{ color: "var(--win95-text)" }}>{transaction.customProperties?.quantity as number}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                      Unit Price
                    </p>
                    <p style={{ color: "var(--win95-text)" }}>
                      {formatCurrency((transaction.customProperties?.unitPriceInCents as number) || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div
            className="border-2 p-4"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={16} style={{ color: "var(--primary)" }} />
              <h3 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                Payment Summary
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--neutral-gray)" }}>Subtotal</span>
                <span style={{ color: "var(--win95-text)" }}>
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--neutral-gray)" }}>
                  Tax {hasLineItems ? "" : `(${((transaction.customProperties?.taxRatePercent as number) || 0)}%)`}
                </span>
                <span style={{ color: "var(--win95-text)" }}>
                  {formatCurrency(totals.tax)}
                </span>
              </div>

              <div
                className="flex justify-between text-base font-bold pt-2 border-t-2"
                style={{ borderColor: "var(--win95-border)" }}
              >
                <span style={{ color: "var(--win95-text)" }}>Total</span>
                <span style={{ color: "var(--primary)" }}>
                  {formatCurrency(totals.total)}
                </span>
              </div>

              {/* Payment Info */}
              <div className="pt-2 mt-2 border-t" style={{ borderColor: "var(--win95-border)" }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--neutral-gray)" }}>Payment Method</span>
                  <span style={{ color: "var(--win95-text)" }}>{(transaction.customProperties?.paymentMethod as string) || "Unknown"}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span style={{ color: "var(--neutral-gray)" }}>Payment Status</span>
                  <span
                    className="px-2 py-0.5 text-xs font-bold rounded"
                    style={{
                      backgroundColor:
                        transaction.customProperties?.paymentStatus === "paid"
                          ? "var(--success-light)"
                          : transaction.customProperties?.paymentStatus === "refunded"
                          ? "var(--neutral-light)"
                          : transaction.customProperties?.paymentStatus === "partially_refunded"
                          ? "var(--warning-light)"
                          : "var(--warning-light)",
                      color:
                        transaction.customProperties?.paymentStatus === "paid"
                          ? "var(--success)"
                          : transaction.customProperties?.paymentStatus === "refunded"
                          ? "var(--neutral-gray)"
                          : transaction.customProperties?.paymentStatus === "partially_refunded"
                          ? "var(--warning)"
                          : "var(--warning)",
                    }}
                  >
                    {transaction.customProperties?.paymentStatus as string}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span style={{ color: "var(--neutral-gray)" }}>Invoicing Status</span>
                  <span
                    className="px-2 py-0.5 text-xs font-bold rounded"
                    style={{
                      backgroundColor:
                        transaction.customProperties?.invoicingStatus === "invoiced"
                          ? "var(--success-light)"
                          : transaction.customProperties?.invoicingStatus === "on_draft_invoice"
                          ? "var(--info-light)"
                          : "var(--neutral-light)",
                      color:
                        transaction.customProperties?.invoicingStatus === "invoiced"
                          ? "var(--success)"
                          : transaction.customProperties?.invoicingStatus === "on_draft_invoice"
                          ? "var(--primary)"
                          : "var(--neutral-gray)",
                    }}
                  >
                    {transaction.customProperties?.invoicingStatus as string}
                  </span>
                </div>

                {/* Refund Information */}
                {(transaction.customProperties?.paymentStatus === "refunded" ||
                  transaction.customProperties?.paymentStatus === "partially_refunded") && (
                  <div className="pt-2 mt-2 border-t" style={{ borderColor: "var(--win95-border)" }}>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "var(--neutral-gray)" }}>Refund Amount</span>
                      <span style={{ color: "var(--error)" }}>
                        {formatCurrency((transaction.customProperties?.refundAmount as number) || 0)}
                      </span>
                    </div>
                    {transaction.customProperties?.refundDate && (
                      <div className="flex justify-between text-sm mt-1">
                        <span style={{ color: "var(--neutral-gray)" }}>Refund Date</span>
                        <span style={{ color: "var(--win95-text)" }}>
                          {formatDate(transaction.customProperties.refundDate as number)}
                        </span>
                      </div>
                    )}
                    {transaction.customProperties?.refundId && (
                      <div className="flex justify-between text-sm mt-1">
                        <span style={{ color: "var(--neutral-gray)" }}>Refund ID</span>
                        <span style={{ color: "var(--win95-text)", fontFamily: "monospace", fontSize: "0.75rem" }}>
                          {(transaction.customProperties.refundId as string).substring(0, 20)}...
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Refund Status Alert */}
        {refundError && (
          <div
            className="mx-4 mb-4 border-2 p-3 flex items-start gap-2"
            style={{
              borderColor: "var(--error)",
              background: "var(--error-light)",
            }}
          >
            <AlertCircle size={16} style={{ color: "var(--error)" }} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold" style={{ color: "var(--error)" }}>Refund Failed</p>
              <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{refundError}</p>
            </div>
          </div>
        )}
        {refundSuccess && (
          <div
            className="mx-4 mb-4 border-2 p-3"
            style={{
              borderColor: "var(--success)",
              background: "var(--success-light)",
            }}
          >
            <p className="text-xs font-bold" style={{ color: "var(--success)" }}>
              ✓ Refund processed successfully!
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div
          className="px-4 py-3 border-t-2 flex items-center justify-between"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <div className="flex items-center gap-2">
            {transaction.customProperties?.invoicingStatus === "invoiced" && (
              <p className="text-xs" style={{ color: "var(--success)" }}>
                ✓ Invoiced
              </p>
            )}
            {transaction.customProperties?.invoicingStatus === "on_draft_invoice" && (
              <p className="text-xs" style={{ color: "var(--primary)" }}>
                On Draft Invoice
              </p>
            )}
            {transaction.customProperties?.paymentStatus === "refunded" && (
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                ✓ Refunded
              </p>
            )}
            {transaction.customProperties?.paymentStatus === "partially_refunded" && (
              <p className="text-xs" style={{ color: "var(--warning)" }}>
                ⚠ Partially Refunded
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {canRefund() && !refundSuccess && (
              <button
                onClick={handleRefund}
                disabled={isRefunding}
                className="px-4 py-2 text-sm font-semibold flex items-center gap-2 hover:opacity-80 disabled:opacity-50"
                style={{
                  backgroundColor: "var(--error)",
                  color: "white",
                  border: "2px solid",
                  borderTopColor: "rgba(255, 255, 255, 0.4)",
                  borderLeftColor: "rgba(255, 255, 255, 0.4)",
                  borderBottomColor: "rgba(0, 0, 0, 0.4)",
                  borderRightColor: "rgba(0, 0, 0, 0.4)",
                }}
              >
                {isRefunding ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    Issue Refund
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--win95-button-face)",
                color: "var(--win95-text)",
                border: "2px solid",
                borderTopColor: "var(--win95-button-light)",
                borderLeftColor: "var(--win95-button-light)",
                borderBottomColor: "var(--win95-button-dark)",
                borderRightColor: "var(--win95-button-dark)",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
