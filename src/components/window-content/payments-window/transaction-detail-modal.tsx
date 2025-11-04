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
  transactionId: Id<"objects">;
  sessionId: string;
  onClose: () => void;
}

export function TransactionDetailModal({
  transactionId,
  sessionId,
  onClose,
}: TransactionDetailModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

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

  const formatCurrency = (cents: number, currency: string = "eur") => {
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

  // TODO: Implement invoice generation for new transaction system
  const handleDownloadInvoice = async () => {
    alert("Invoice generation coming soon!");
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
                Product Details
              </h3>
            </div>
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
                    {formatCurrency((transaction.customProperties?.unitPriceInCents as number) || 0, (transaction.customProperties?.currency as string) || "EUR")}
                  </p>
                </div>
              </div>
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
                <span style={{ color: "var(--neutral-gray)" }}>Amount</span>
                <span style={{ color: "var(--win95-text)" }}>
                  {formatCurrency((transaction.customProperties?.amountInCents as number) || 0, (transaction.customProperties?.currency as string) || "EUR")}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--neutral-gray)" }}>
                  Tax ({((transaction.customProperties?.taxRatePercent as number) || 0)}%)
                </span>
                <span style={{ color: "var(--win95-text)" }}>
                  {formatCurrency((transaction.customProperties?.taxAmountInCents as number) || 0, (transaction.customProperties?.currency as string) || "EUR")}
                </span>
              </div>

              <div
                className="flex justify-between text-base font-bold pt-2 border-t-2"
                style={{ borderColor: "var(--win95-border)" }}
              >
                <span style={{ color: "var(--win95-text)" }}>Total</span>
                <span style={{ color: "var(--primary)" }}>
                  {formatCurrency((transaction.customProperties?.totalPriceInCents as number) || 0, (transaction.customProperties?.currency as string) || "EUR")}
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
                          : "var(--warning-light)",
                      color:
                        transaction.customProperties?.paymentStatus === "paid"
                          ? "var(--success)"
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
          </div>
          <div className="flex gap-2">
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
