"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  X,
  User,
  Building2,
  Package,
  Receipt,
  CreditCard,
  MapPin,
  FileText,
  Loader2,
  Download,
} from "lucide-react";

interface TransactionDetailModalProps {
  checkoutSessionId: Id<"objects">;
  sessionId: string;
  onClose: () => void;
}

export function TransactionDetailModal({
  checkoutSessionId,
  sessionId,
  onClose,
}: TransactionDetailModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Get full transaction details
  const transaction = useQuery(
    api.transactionOntology.getTransactionDetail,
    {
      sessionId,
      checkoutSessionId,
    }
  );

  // Get invoice URL if available (check cache)
  const invoiceCache = useQuery(
    api.transactionInvoicing.getTransactionInvoiceUrl,
    {
      sessionId,
      checkoutSessionId,
    }
  );

  // Generate invoice action (creates PDF on-demand)
  const generateInvoice = useAction(api.transactionInvoicing.generateTransactionInvoice);

  const formatCurrency = (cents: number, currency: string = "usd") => {
    const amount = cents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
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

  if (!transaction) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white border-4 max-w-4xl w-full max-h-[90vh] overflow-hidden"
          style={{ borderColor: "var(--win95-border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin" size={48} style={{ color: "var(--primary)" }} />
          </div>
        </div>
      </div>
    );
  }

  const handleDownloadInvoice = async () => {
    try {
      setIsGenerating(true);

      // Check if cached
      if (invoiceCache?.invoiceUrl) {
        // Cached - open instantly
        window.open(invoiceCache.invoiceUrl, "_blank");
        return;
      }

      // Generate PDF on-demand
      const result = await generateInvoice({
        sessionId,
        checkoutSessionId,
        forceRegenerate: false,
      });

      if (result?.invoiceUrl) {
        // Open generated PDF
        window.open(result.invoiceUrl, "_blank");
      } else {
        alert("Failed to generate invoice. Please try again.");
      }
    } catch (error) {
      console.error("Invoice generation error:", error);
      alert("Error generating invoice. Please contact support.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border-4 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ borderColor: "var(--win95-border)" }}
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
            className="p-1 hover:bg-gray-200"
            style={{ color: "var(--win95-text)" }}
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
              {transaction.transactionType === "B2B" ? (
                <Building2 size={16} style={{ color: "var(--primary)" }} />
              ) : (
                <User size={16} style={{ color: "var(--primary)" }} />
              )}
              <h3 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                {transaction.transactionType === "B2B" ? "Business Customer" : "Customer Information"}
              </h3>
              {transaction.transactionType === "B2B" && (
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
              {transaction.transactionType === "B2B" && transaction.companyName && (
                <>
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                      Company Name
                    </p>
                    <p style={{ color: "var(--win95-text)" }}>{transaction.companyName}</p>
                  </div>
                  {transaction.vatNumber && (
                    <div>
                      <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                        VAT Number
                      </p>
                      <p style={{ color: "var(--win95-text)" }}>{transaction.vatNumber}</p>
                    </div>
                  )}
                </>
              )}
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Contact Name
                </p>
                <p style={{ color: "var(--win95-text)" }}>{transaction.customerName}</p>
              </div>
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                  Email
                </p>
                <p style={{ color: "var(--win95-text)" }}>{transaction.customerEmail}</p>
              </div>
              {transaction.customerPhone && (
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--neutral-gray)" }}>
                    Phone
                  </p>
                  <p style={{ color: "var(--win95-text)" }}>{transaction.customerPhone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Billing Address (B2B) */}
          {transaction.transactionType === "B2B" && transaction.billingStreet && (
            <div
              className="border-2 p-4"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} style={{ color: "var(--primary)" }} />
                <h3 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                  Billing Address
                </h3>
              </div>
              <div className="text-sm space-y-1" style={{ color: "var(--win95-text)" }}>
                <p>{transaction.billingStreet}</p>
                <p>
                  {transaction.billingCity}
                  {transaction.billingState && `, ${transaction.billingState}`}{" "}
                  {transaction.billingPostalCode}
                </p>
                {transaction.billingCountry && <p>{transaction.billingCountry}</p>}
              </div>
            </div>
          )}

          {/* Products Purchased */}
          <div
            className="border-2 p-4"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Package size={16} style={{ color: "var(--primary)" }} />
              <h3 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                Products Purchased
              </h3>
            </div>
            <div className="space-y-2">
              {transaction.selectedProducts.map((product, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between pb-2 border-b last:border-b-0"
                  style={{ borderColor: "var(--win95-border)" }}
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                      {product.productName}
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      Quantity: {product.quantity} × {formatCurrency(product.pricePerUnit, transaction.currency)}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                    {formatCurrency(product.totalPrice, transaction.currency)}
                  </p>
                </div>
              ))}
            </div>
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
                  {formatCurrency(transaction.subtotal, transaction.currency)}
                </span>
              </div>

              {/* Tax Breakdown */}
              {transaction.taxDetails && transaction.taxDetails.length > 0 ? (
                <>
                  {transaction.taxDetails.map((tax, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span style={{ color: "var(--neutral-gray)" }}>
                        {tax.taxName} ({(tax.taxRate * 100).toFixed(2)}%)
                      </span>
                      <span style={{ color: "var(--win95-text)" }}>
                        {formatCurrency(tax.taxAmount, transaction.currency)}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--neutral-gray)" }}>Tax</span>
                  <span style={{ color: "var(--win95-text)" }}>
                    {formatCurrency(transaction.taxAmount, transaction.currency)}
                  </span>
                </div>
              )}

              <div
                className="flex justify-between text-base font-bold pt-2 border-t-2"
                style={{ borderColor: "var(--win95-border)" }}
              >
                <span style={{ color: "var(--win95-text)" }}>Total</span>
                <span style={{ color: "var(--primary)" }}>
                  {formatCurrency(transaction.totalAmount, transaction.currency)}
                </span>
              </div>

              {/* Payment Info */}
              <div className="pt-2 mt-2 border-t" style={{ borderColor: "var(--win95-border)" }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--neutral-gray)" }}>Payment Method</span>
                  <span style={{ color: "var(--win95-text)" }}>{transaction.paymentMethod || "Card"}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span style={{ color: "var(--neutral-gray)" }}>Status</span>
                  <span
                    className="px-2 py-0.5 text-xs font-bold rounded"
                    style={{
                      backgroundColor:
                        transaction.status === "completed"
                          ? "var(--success-light)"
                          : transaction.status === "pending"
                          ? "var(--warning-light)"
                          : "var(--error-light)",
                      color:
                        transaction.status === "completed"
                          ? "var(--success)"
                          : transaction.status === "pending"
                          ? "var(--warning)"
                          : "var(--error)",
                    }}
                  >
                    {transaction.status}
                  </span>
                </div>
                {transaction.paymentIntentId && (
                  <div className="flex justify-between text-sm mt-1">
                    <span style={{ color: "var(--neutral-gray)" }}>Transaction ID</span>
                    <span className="text-xs font-mono" style={{ color: "var(--win95-text)" }}>
                      {transaction.paymentIntentId.substring(0, 20)}...
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="px-4 py-3 border-t-2 flex items-center justify-between"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <div className="flex items-center gap-2">
            {transaction.purchasedItemIds && transaction.purchasedItemIds.length > 0 && (
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {transaction.purchasedItemIds.length} item(s) created
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {transaction.status === "completed" && (
              <button
                onClick={handleDownloadInvoice}
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    {invoiceCache?.cached ? <Download size={14} /> : <FileText size={14} />}
                    {invoiceCache?.cached ? "Download Invoice" : "Generate Invoice"}
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
