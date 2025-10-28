"use client";

/**
 * INVOICE ENFORCEMENT STEP
 *
 * Shown when payment rules engine enforces invoice payment based on employer selection.
 * This is a confirmation step that explains:
 * - Which employer will be invoiced
 * - Payment terms (Net 30/60/90)
 * - What happens next
 * - User acknowledgment
 *
 * Appears between registration-form and payment-form when enforceInvoice === true
 */

import { CheckoutProduct } from "@/templates/checkout/types";
import { Id } from "../../../../convex/_generated/dataModel";
import { type PaymentRulesResult } from "../../../../convex/paymentRulesEngine";
import { ArrowLeft, FileText, CheckCircle } from "lucide-react";

interface InvoiceEnforcementStepProps {
  rulesResult: PaymentRulesResult;
  selectedProducts: Array<{
    productId: Id<"objects">;
    quantity: number;
    price: number;
  }>;
  linkedProducts: CheckoutProduct[];
  formResponses: Array<{
    productId: Id<"objects">;
    ticketNumber: number;
    formId: string;
    responses: Record<string, unknown>;
    addedCosts: number;
    submittedAt: number;
  }>;
  customerInfo: {
    email: string;
    name: string;
    phone?: string;
  };
  taxCalculation?: {
    subtotal: number;
    taxAmount: number;
    total: number;
    taxRate: number;
    isTaxable: boolean;
    taxBehavior: "exclusive" | "inclusive" | "automatic";
  };
  onComplete: () => void;
  onBack: () => void;
}

export function InvoiceEnforcementStep({
  rulesResult,
  selectedProducts,
  linkedProducts,
  formResponses,
  customerInfo,
  taxCalculation,
  onComplete,
  onBack,
}: InvoiceEnforcementStepProps) {
  if (!rulesResult.enforceInvoice || !rulesResult.enforcementDetails) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-600">Error: Invoice enforcement details not available</p>
      </div>
    );
  }

  const { employerName, paymentTerms } = rulesResult.enforcementDetails;

  // Calculate totals
  const baseTotal = selectedProducts.reduce((sum, sp) => sum + sp.price * sp.quantity, 0);
  const formAddons = formResponses.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0);
  const subtotal = baseTotal + formAddons;
  const total = taxCalculation?.total || subtotal;

  // Get currency from first product
  const currency = linkedProducts.find((p) => p._id === selectedProducts[0]?.productId)?.currency || "USD";

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const paymentTermsText = {
    net30: "Net 30 (payment due within 30 days)",
    net60: "Net 60 (payment due within 60 days)",
    net90: "Net 90 (payment due within 90 days)",
  }[paymentTerms];

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <FileText size={24} />
          Invoice Payment Confirmation
        </h2>
        <p className="text-gray-600">
          Based on your employer selection, this registration will be invoiced.
        </p>
      </div>

      {/* Enforcement Notice */}
      <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckCircle size={20} className="text-purple-600" />
          Invoice Will Be Sent To
        </h3>
        <div className="bg-white border border-purple-200 rounded p-4 mb-3">
          <p className="text-2xl font-bold text-purple-900">{employerName}</p>
        </div>
        <div className="text-sm space-y-1">
          <p>
            <strong>Payment Terms:</strong> {paymentTermsText}
          </p>
          <p>
            <strong>Invoice Amount:</strong> {formatPrice(total)}
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">How This Works</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
              1
            </span>
            <div>
              <p className="font-semibold">Complete Your Registration</p>
              <p className="text-gray-600">You&apos;ll confirm your registration in the next step</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
              2
            </span>
            <div>
              <p className="font-semibold">Invoice Sent to {employerName}</p>
              <p className="text-gray-600">
                An invoice for {formatPrice(total)} will be generated and sent to your employer
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">
              3
            </span>
            <div>
              <p className="font-semibold">Employer Pays Invoice</p>
              <p className="text-gray-600">Payment due within {paymentTerms.replace("net", "")} days of invoice date</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
              4
            </span>
            <div>
              <p className="font-semibold">Receive Your Tickets</p>
              <p className="text-gray-600">
                Tickets will be delivered to <strong>{customerInfo.email}</strong> after invoice acceptance
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Order Summary */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-md font-semibold mb-4">Order Summary</h3>

        {/* Products */}
        <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
          {selectedProducts.map((sp) => {
            const product = linkedProducts.find((p) => p._id === sp.productId);
            return (
              <div key={sp.productId} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{product?.name}</p>
                  <p className="text-xs text-gray-600">Quantity: {sp.quantity}</p>
                </div>
                <p className="font-medium">{formatPrice(sp.price * sp.quantity)}</p>
              </div>
            );
          })}
        </div>

        {/* Form Addons */}
        {formAddons > 0 && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-sm font-medium mb-2">Add-ons:</p>
            {formResponses
              .filter((fr) => fr.addedCosts > 0)
              .map((fr) => (
                <div key={`addon-${fr.productId}-${fr.ticketNumber}`} className="flex justify-between text-sm text-gray-700 mb-1">
                  <p>Ticket {fr.ticketNumber} extras</p>
                  <p>{formatPrice(fr.addedCosts)}</p>
                </div>
              ))}
          </div>
        )}

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <p className="text-gray-600">Subtotal:</p>
            <p className="font-medium">{formatPrice(subtotal)}</p>
          </div>
          {taxCalculation && taxCalculation.isTaxable && taxCalculation.taxAmount > 0 && (
            <div className="flex justify-between text-sm">
              <p className="text-gray-600">
                Tax ({taxCalculation.taxRate.toFixed(1)}%)
                <span className="text-xs ml-1 opacity-70">
                  {taxCalculation.taxBehavior === "inclusive" ? "💶 included" : "💵 added"}
                </span>
              </p>
              <p className="font-medium">{formatPrice(taxCalculation.taxAmount)}</p>
            </div>
          )}
          <div className="flex justify-between pt-2 mt-2 border-t-2 border-gray-400">
            <p className="text-lg font-bold">Total Amount:</p>
            <p className="text-lg font-bold text-purple-600">{formatPrice(total)}</p>
          </div>
        </div>
      </div>

      {/* Acknowledgment */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
        <h3 className="text-md font-semibold mb-3">Acknowledgment</h3>
        <p className="text-sm mb-3">By continuing, you acknowledge that:</p>
        <ul className="text-sm space-y-2 list-disc pl-5">
          <li>An invoice for <strong>{formatPrice(total)}</strong> will be generated</li>
          <li>The invoice will be sent to <strong>{employerName}</strong></li>
          <li>Payment is due within <strong>{paymentTerms.replace("net", "")} days</strong> of invoice date</li>
          <li>Your registration will be confirmed upon invoice acceptance</li>
          <li>Tickets will be delivered to: <strong>{customerInfo.email}</strong></li>
          <li>You have authorization from your employer to make this purchase</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 text-base font-bold border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          type="button"
          onClick={onComplete}
          className="flex-1 px-6 py-3 text-base font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          Continue to Invoice Payment →
        </button>
      </div>

      {/* Info Badge */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
          📄 No immediate payment required - Invoice will be sent to {employerName}
        </p>
      </div>
    </div>
  );
}
