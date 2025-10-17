"use client";

/**
 * STEP 4: PAYMENT FORM
 *
 * Provider-specific payment UI:
 * - Stripe Connect: Stripe Elements (card form)
 * - PayPal: PayPal button
 * - Square: Square payment form
 * - Manual: Instructions for wire transfer
 *
 * Shows order summary and final total.
 */

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { TaxBreakdown, calculateTaxFromItems, type TaxCalculation } from "../tax-breakdown";

interface PaymentFormStepProps {
  paymentProvider: string;
  totalAmount: number; // in cents (includes base + form costs)
  organizationId: Id<"organizations">;
  sessionId: string;
  checkoutSessionId?: Id<"objects">; // NEW: Optional checkout session ID (will be created in parent)
  customerInfo: {
    email: string;
    name: string;
    phone?: string;
  };
  selectedProducts: Array<{
    productId: Id<"objects">;
    quantity: number;
    price: number;
  }>;
  formResponses?: Array<{
    productId: Id<"objects">;
    ticketNumber: number;
    formId: string;
    responses: Record<string, unknown>;
    addedCosts: number;
    submittedAt: number;
  }>;
  onComplete: (result: {
    success: boolean;
    transactionId: string;
    receiptUrl?: string;
    purchasedItemIds?: string[]; // Changed from ticketIds to purchasedItemIds
  }) => void;
  onBack: () => void;
}

export function PaymentFormStep({
  paymentProvider,
  totalAmount,
  organizationId,
  sessionId,
  checkoutSessionId,
  customerInfo,
  selectedProducts,
  formResponses,
  onComplete,
  onBack,
}: PaymentFormStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action to complete checkout and create tickets
  const completeCheckout = useAction(api.checkoutSessions.completeCheckoutWithTickets);

  // Load tax settings
  const taxSettings = useQuery(api.organizationTaxSettings.getTaxSettings, {
    sessionId,
    organizationId,
  });

  // Calculate tax breakdown
  const taxCalculation: TaxCalculation | null = taxSettings
    ? calculateTaxFromItems(
        selectedProducts.map((sp) => ({ price: sp.price, taxable: true })),
        1,
        0.085, // TODO: Get actual tax rate from tax settings or Stripe Tax API
        taxSettings.customProperties?.defaultTaxBehavior || "exclusive"
      )
    : null;

  /**
   * Format price for display
   * Note: Currency should be passed through from product selection
   * For now, defaulting to USD - TODO: add currency prop
   */
  const formatPrice = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  /**
   * Handle payment submission
   */
  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Implement actual payment processing based on provider
      // For now, simulate payment success and generate mock payment intent
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const mockPaymentIntentId = `pi_${Date.now()}`;

      // Verify we have a checkout session
      if (!checkoutSessionId) {
        throw new Error("Checkout session not initialized. Please refresh and try again.");
      }

      // Complete checkout: reads ALL data from checkout_session!
      const result = await completeCheckout({
        sessionId,
        checkoutSessionId, // ✅ Using REAL checkout session ID
        paymentIntentId: mockPaymentIntentId,
      });

      onComplete({
        success: result.success,
        transactionId: result.paymentId,
        receiptUrl: "#", // TODO: Generate receipt URL
        purchasedItemIds: result.purchasedItemIds, // ✅ Generic purchased items
      });
    } catch (err) {
      console.error("Payment/Checkout error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
      setIsProcessing(false);
    }
  };

  return (
    <div className="payment-form-step max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <CreditCard size={24} />
          Payment
        </h2>
        <p className="text-gray-600">
          Complete your purchase securely.
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">Order Summary</h3>

        {/* Customer Info */}
        <div className="mb-4 pb-4 border-b border-gray-300">
          <p className="text-sm text-gray-600">
            <strong>Email:</strong> {customerInfo.email}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Name:</strong> {customerInfo.name}
          </p>
          {customerInfo.phone && (
            <p className="text-sm text-gray-600">
              <strong>Phone:</strong> {customerInfo.phone}
            </p>
          )}
        </div>

        {/* Products */}
        <div className="mb-4 pb-4 border-b border-gray-300">
          <p className="text-sm font-bold mb-2">Items:</p>
          {selectedProducts.map((sp, idx) => (
            <div key={idx} className="flex justify-between text-sm text-gray-700 mb-1">
              <span>Product {idx + 1} × {sp.quantity}</span>
              <span>{formatPrice(sp.price * sp.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Tax Breakdown */}
        {taxCalculation && taxSettings?.customProperties?.taxEnabled && (
          <div className="mb-4">
            <TaxBreakdown calculation={taxCalculation} showDetails={true} />
          </div>
        )}

        {/* Total (simple version if no tax) */}
        {(!taxCalculation || !taxSettings?.customProperties?.taxEnabled) && (
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold">Total:</span>
            <span className="text-2xl font-bold text-purple-600">
              {formatPrice(totalAmount)}
            </span>
          </div>
        )}
      </div>

      {/* Payment Form */}
      <div className="border-2 border-gray-300 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">Payment Details</h3>

        {paymentProvider === "stripe-connect" && (
          <div className="space-y-4">
            {/* TODO: Integrate Stripe Elements */}
            <div className="text-sm text-gray-600">
              <p className="mb-4">Stripe payment form will appear here.</p>
              <div className="bg-gray-100 p-4 rounded">
                [Stripe Elements Component]
              </div>
            </div>
          </div>
        )}

        {paymentProvider === "paypal" && (
          <div className="text-sm text-gray-600">
            <p className="mb-4">PayPal button will appear here.</p>
            <div className="bg-gray-100 p-4 rounded text-center">
              [PayPal Button]
            </div>
          </div>
        )}

        {paymentProvider === "manual" && (
          <div className="text-sm text-gray-600">
            <p className="mb-4">
              Please transfer the total amount to the following account:
            </p>
            <div className="bg-gray-100 p-4 rounded">
              <p><strong>Bank:</strong> Example Bank</p>
              <p><strong>Account:</strong> 123456789</p>
              <p><strong>Reference:</strong> ORDER-{Date.now()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="px-6 py-3 text-base font-bold border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          type="button"
          onClick={handlePayment}
          disabled={isProcessing}
          className="flex-1 px-6 py-3 text-base font-bold border-2 border-green-600 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Complete Purchase {formatPrice(totalAmount)}
            </>
          )}
        </button>
      </div>

      {/* Security Badge */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
          🔒 Secure payment powered by {paymentProvider}
        </p>
      </div>
    </div>
  );
}
