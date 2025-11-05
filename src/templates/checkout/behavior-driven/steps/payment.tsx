"use client";

/**
 * STEP 5: PAYMENT
 *
 * Payment UI - shows payment method selection based on behaviors.
 * If invoice payment behavior detected employer billing, shows "Pay Later" option.
 * Otherwise shows available payment providers (Stripe, etc.)
 *
 * IMPLEMENTATION:
 * - Invoice: Creates invoice + tickets via initiateInvoicePayment
 * - Stripe: Creates payment intent, shows card form, confirms payment, creates tickets
 */

import { useState, useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { StepProps } from "../types";
import { CreditCard, ArrowLeft, FileText, Loader2 } from "lucide-react";
import { getInvoiceMappingFromResults } from "@/lib/behaviors/adapters/checkout-integration";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { loadStripe, Stripe, StripeElements, StripeCardElement } from "@stripe/stripe-js";
import { useTranslation } from "@/contexts/translation-context";

export interface PaymentStepProps extends StepProps {
  checkoutSessionId: string | null;
}

export function PaymentStep({
  organizationId,
  sessionId = "public",
  checkoutData,
  checkoutSessionId,
  onComplete,
  onBack
}: PaymentStepProps) {
  const { t } = useTranslation();

  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"invoice" | "stripe" | null>(null);

  // Stripe State
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [cardElement, setCardElement] = useState<StripeCardElement | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [cardMountNode, setCardMountNode] = useState<HTMLDivElement | null>(null);
  const initializationAttempted = useRef(false);

  // Actions for payment processing
  const initiateInvoice = useAction(api.paymentProviders.invoice.initiateInvoicePayment);
  const createPaymentIntent = useAction(api.checkoutSessions.createPaymentIntentForSession);
  const completeCheckout = useAction(api.checkoutSessions.completeCheckoutAndFulfill);

  // Check if invoice checkout via behaviors
  const behaviorResults = checkoutData.behaviorResults;
  const invoiceInfo = behaviorResults ? getInvoiceMappingFromResults(behaviorResults) : null;
  const isInvoiceCheckout = invoiceInfo?.shouldInvoice || false;

  // Calculate correct total including all costs (products + form addons + behavior addons)
  const selectedProducts = checkoutData.selectedProducts || [];
  const productsSubtotal = selectedProducts.reduce((sum, sp) => sum + sp.price * sp.quantity, 0);
  const formAddonsSubtotal = (checkoutData.formResponses || []).reduce((sum, fr) => sum + (fr.addedCosts || 0), 0);
  const subtotal = productsSubtotal + formAddonsSubtotal;

  // Use tax calculation total if available, otherwise use subtotal
  const taxCalculation = checkoutData.taxCalculation;
  const totalAmount = taxCalculation && taxCalculation.isTaxable && taxCalculation.total > 0
    ? subtotal + taxCalculation.taxAmount  // subtotal + tax
    : subtotal; // no tax or tax-inclusive

  // Get currency from selected products (should match organization's currency)
  const currency = selectedProducts[0]
    ? (selectedProducts.find(sp => {
        const productId = typeof sp.productId === 'string' ? sp.productId : sp.productId;
        return productId;
      }))
    : undefined;

  // Helper to format currency
  const formatCurrency = (amountInCents: number) => {
    // TODO: Get actual currency from products/organization settings
    // For now, default to EUR as that's the organization's currency
    const currencyCode = "EUR"; // Placeholder - should come from product/org
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
    }).format(amountInCents / 100);
  };

  /**
   * Initialize Stripe when user selects Stripe payment
   * Creates payment intent and loads Stripe.js
   */
  useEffect(() => {
    const initializeStripe = async () => {
      if (selectedMethod !== "stripe" || initializationAttempted.current) return;
      if (!checkoutSessionId) {
        setError("Checkout session not found. Please start checkout again.");
        return;
      }

      initializationAttempted.current = true;

      try {
        // Check Stripe key
        const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!stripeKey || stripeKey.includes("YOUR_")) {
          setError(
            "Stripe is not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env.local file."
          );
          return;
        }

        // Create payment intent
        const result = await createPaymentIntent({
          checkoutSessionId: checkoutSessionId as Id<"objects">,
        });

        setClientSecret(result.clientSecret || null);
        setPaymentIntentId(result.paymentIntentId || null);

        // Load Stripe.js with connected account
        const stripeInstance = await loadStripe(stripeKey, {
          stripeAccount: result.connectedAccountId || undefined,
        });

        if (!stripeInstance) {
          setError("Failed to load Stripe. Please check your configuration.");
          return;
        }

        setStripe(stripeInstance);

        // Create Elements
        if (stripeInstance && result.clientSecret) {
          const elementsInstance = stripeInstance.elements({
            clientSecret: result.clientSecret,
          });
          setElements(elementsInstance);
        }
      } catch (err) {
        console.error("Failed to initialize Stripe:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize Stripe");
        initializationAttempted.current = false;
      }
    };

    initializeStripe();
  }, [selectedMethod, checkoutSessionId, createPaymentIntent]);

  /**
   * Mount Stripe Card Element when ready
   */
  useEffect(() => {
    if (!elements || !cardMountNode || selectedMethod !== "stripe") return;

    const card = elements.create("card", {
      style: {
        base: {
          fontSize: "16px",
          color: "#424770",
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          "::placeholder": { color: "#aab7c4" },
        },
        invalid: { color: "#9e2146", iconColor: "#9e2146" },
      },
    });

    card.mount(cardMountNode);
    setCardElement(card);

    card.on("change", (event) => {
      setIsCardComplete(event.complete);
      setError(event.error ? event.error.message : null);
    });

    return () => {
      card.unmount();
    };
  }, [elements, cardMountNode, selectedMethod]);

  /**
   * Handle Invoice Payment
   * Creates invoice + tickets through backend
   */
  const handleInvoicePayment = async () => {
    // Validate we have a checkout session
    if (!checkoutSessionId) {
      setError("Checkout session not initialized. Please try again.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Initiate invoice payment (creates invoice + tickets)
      const result = await initiateInvoice({
        sessionId,
        checkoutSessionId: checkoutSessionId as Id<"objects">,
        organizationId,
      });

      if (!result.success) {
        setError(result.error || "Failed to create invoice");
        setIsProcessing(false);
        return;
      }

      // Complete checkout flow
      onComplete({
        selectedPaymentProvider: "invoice",
        paymentResult: {
          success: true,
          transactionId: result.invoiceId || "invoice_pending",
          receiptUrl: result.pdfUrl || undefined,
          purchasedItemIds: checkoutData.selectedProducts?.map((sp) => sp.productId as string) || [],
          checkoutSessionId: checkoutSessionId,
        },
      });
    } catch (err) {
      console.error("Failed to create invoice:", err);
      setError(err instanceof Error ? err.message : "Failed to create invoice");
      setIsProcessing(false);
    }
  };

  /**
   * Handle Stripe Payment
   * Confirms payment with Stripe, then creates tickets via backend
   */
  const handleStripePayment = async () => {
    if (!stripe || !cardElement || !clientSecret || !paymentIntentId) {
      setError("Payment not initialized. Please try again.");
      return;
    }

    if (!checkoutSessionId) {
      setError("Checkout session not found. Please try again.");
      return;
    }

    if (!isCardComplete) {
      setError("Please enter complete card details.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log("💳 [Payment] Starting Stripe payment...");
      console.log("💳 [Payment] Checkout session ID:", checkoutSessionId);
      console.log("💳 [Payment] Selected products:", checkoutData.selectedProducts);
      console.log("💳 [Payment] Form responses:", checkoutData.formResponses);
      console.log("💳 [Payment] Customer info:", checkoutData.customerInfo);

      // Confirm card payment with Stripe
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: checkoutData.customerInfo?.name || "",
            email: checkoutData.customerInfo?.email || "",
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        throw new Error("Payment was not successful. Please try again.");
      }

      console.log("✅ [Payment] Stripe payment confirmed, calling completeCheckout...");

      // Complete checkout - creates tickets and CRM records
      const result = await completeCheckout({
        sessionId,
        checkoutSessionId: checkoutSessionId as Id<"objects">,
        paymentIntentId,
      });

      console.log("✅ [Payment] completeCheckout result:", result);

      // Complete checkout flow
      onComplete({
        selectedPaymentProvider: "stripe",
        paymentResult: {
          success: result.success,
          transactionId: result.paymentId,
          receiptUrl: "#",
          purchasedItemIds: result.purchasedItemIds,
          checkoutSessionId: checkoutSessionId,
        },
      });
    } catch (err) {
      console.error("Stripe payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
      setIsProcessing(false);
    }
  };

  /**
   * Route to appropriate payment handler
   */
  const handlePayment = async (method: "invoice" | "stripe") => {
    if (method === "invoice") {
      await handleInvoicePayment();
    } else if (method === "stripe") {
      setSelectedMethod("stripe");
      // Stripe form will show and user will click "Pay Now" button
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <CreditCard size={32} />
          {selectedMethod === "stripe"
            ? t('ui.checkout_template.behavior_driven.payment.headers.title_card', 'Payment Details')
            : t('ui.checkout_template.behavior_driven.payment.headers.title', 'Payment Method')}
        </h2>
        <p className="text-gray-600">
          {selectedMethod === "stripe"
            ? t('ui.checkout_template.behavior_driven.payment.headers.subtitle_card', 'Enter your card details to complete payment')
            : t('ui.checkout_template.behavior_driven.payment.headers.subtitle', 'Choose how you want to pay')}
        </p>
      </div>

      {/* Payment Method Selection - Show only if no method selected */}
      {!selectedMethod && (
        <div className="space-y-4 mb-6">
          {/* Invoice Payment (B2B) - Only show if behavior detected employer */}
          {isInvoiceCheckout && invoiceInfo && (
            <button
              type="button"
              onClick={() => handlePayment("invoice")}
              disabled={isProcessing}
              className="w-full p-6 bg-blue-50 border-2 border-blue-400 rounded-lg hover:bg-blue-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                {isProcessing ? (
                  <Loader2 size={32} className="text-blue-600 animate-spin" />
                ) : (
                  <FileText size={32} className="text-blue-600" />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900">
                    {isProcessing
                      ? t('ui.checkout_template.behavior_driven.payment.invoice.creating', 'Creating Invoice...')
                      : t('ui.checkout_template.behavior_driven.payment.invoice.title', 'Invoice Payment (Pay Later)')}
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {t('ui.checkout_template.behavior_driven.payment.invoice.sent_to', 'An invoice will be sent to:')} <strong>{invoiceInfo.employerOrgId || "your employer"}</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    {t('ui.checkout_template.behavior_driven.payment.invoice.payment_terms', 'Payment terms:')} {invoiceInfo.paymentTerms
                      ? t('ui.checkout_template.behavior_driven.payment.invoice.net_days', { terms: invoiceInfo.paymentTerms.replace("net", "Net ") })
                      : t('ui.checkout_template.behavior_driven.payment.invoice.net_days_default')}
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Credit Card Payment (Stripe) */}
          <button
            type="button"
            onClick={() => handlePayment("stripe")}
            disabled={isProcessing}
            className="w-full p-6 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <CreditCard size={32} className="text-purple-600" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">{t('ui.checkout_template.behavior_driven.payment.credit_card.title', 'Credit Card')}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('ui.checkout_template.behavior_driven.payment.credit_card.subtitle', 'Pay securely with Visa, Mastercard, or American Express')}
                </p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Stripe Payment Form - Show when Stripe selected */}
      {selectedMethod === "stripe" && (
        <div className="space-y-6 mb-6">
          {/* Order Summary */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">{t('ui.checkout_template.behavior_driven.payment.order_summary.title', 'Order Summary')}</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('ui.checkout_template.behavior_driven.payment.order_summary.total_amount', 'Total Amount:')}</span>
              <span className="text-2xl font-bold text-purple-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Card Details Form */}
          <div className="border-2 border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">{t('ui.checkout_template.behavior_driven.payment.card_details.title', 'Card Details')}</h3>
            <div
              ref={setCardMountNode}
              className="border-2 border-gray-300 rounded p-3 bg-white min-h-[44px]"
            />
            {!stripe && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                {t('ui.checkout_template.behavior_driven.payment.card_details.loading', 'Loading payment form...')}
              </div>
            )}
            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded mt-4">
              {t('ui.checkout_template.behavior_driven.payment.security.notice', '🔒 Your payment information is encrypted and secure. We never store your card details.')}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        {onBack && (
          <button
            type="button"
            onClick={() => {
              if (selectedMethod === "stripe") {
                setSelectedMethod(null);
                setError(null);
              } else {
                onBack();
              }
            }}
            disabled={isProcessing}
            className="px-6 py-3 text-lg font-bold border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={20} />
            {t('ui.checkout_template.behavior_driven.payment.buttons.back', 'Back')}
          </button>
        )}

        {/* Pay Now Button - Only show when Stripe form is displayed */}
        {selectedMethod === "stripe" && (
          <button
            type="button"
            onClick={handleStripePayment}
            disabled={isProcessing || !stripe || !isCardComplete}
            className="flex-1 px-6 py-3 text-lg font-bold border-2 border-green-600 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {t('ui.checkout_template.behavior_driven.payment.buttons.processing', 'Processing Payment...')}
              </>
            ) : (
              <>
                {t('ui.checkout_template.behavior_driven.payment.buttons.complete_payment', 'Complete Payment')} {formatCurrency(totalAmount)}
              </>
            )}
          </button>
        )}
      </div>

      {/* Security Notice */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
          {t('ui.checkout_template.behavior_driven.payment.security.notice_footer', '🔒 Your payment information is encrypted and secure')}
        </p>
      </div>
    </div>
  );
}
