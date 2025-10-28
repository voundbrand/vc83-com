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

import { useState, useEffect, useRef } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { CheckoutProduct } from "@/templates/checkout/types";
import { calculateCheckoutTaxWithAddons, getTaxRateByCode, getDefaultTaxRate as getDefaultTaxRateByCountry } from "@/lib/tax-calculator";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import type { StripeElements, StripeCardElement } from "@stripe/stripe-js";
import { calculateAddonsFromResponses, type ProductAddon } from "@/types/product-addons";
import { type PaymentRulesResult } from "../../../../convex/paymentRulesEngine";

interface PaymentFormStepProps {
  paymentProvider: string;
  totalAmount: number; // in cents (includes base + form costs)
  organizationId: Id<"organizations">;
  sessionId: string;
  checkoutSessionId?: Id<"objects">; // NEW: Optional checkout session ID (will be created in parent)
  linkedProducts: CheckoutProduct[]; // Full product data for tax settings
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
  rulesResult?: PaymentRulesResult | null; // Payment rules result for employer-specific messaging
  onComplete: (result: {
    success: boolean;
    transactionId: string;
    receiptUrl?: string;
    purchasedItemIds?: string[]; // Changed from ticketIds to purchasedItemIds
    checkoutSessionId?: string; // Add checkoutSessionId to result
  }) => void;
  onBack: () => void;
}

export function PaymentFormStep(props: PaymentFormStepProps) {
  // Route to provider-specific component based on paymentProvider
  switch (props.paymentProvider) {
    case "stripe-connect":
    case "stripe":
      return <StripePaymentForm {...props} />;

    case "invoice":
      return <InvoicePaymentForm {...props} />;

    default:
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#666", marginBottom: "1rem" }}>
            Payment provider "{props.paymentProvider}" is not yet implemented.
          </p>
          <button onClick={props.onBack} style={{ padding: "0.5rem 1rem" }}>
            ← Go Back
          </button>
        </div>
      );
  }
}

/**
 * STRIPE PAYMENT FORM
 *
 * Handles Stripe Connect payment with Stripe Elements
 */
function StripePaymentForm({
  paymentProvider,
  totalAmount,
  organizationId,
  sessionId,
  checkoutSessionId,
  linkedProducts,
  customerInfo,
  selectedProducts,
  formResponses,
  onComplete,
  onBack,
}: PaymentFormStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [cardElement, setCardElement] = useState<StripeCardElement | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [cardMountNode, setCardMountNode] = useState<HTMLDivElement | null>(null);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);

  // Use ref to prevent double initialization in React Strict Mode
  const initializationAttempted = useRef(false);

  // Actions
  const createPaymentIntent = useAction(api.checkoutSessions.createPaymentIntentForSession);
  const completeCheckout = useAction(api.checkoutSessions.completeCheckoutWithTickets);

  // Load Stripe and create payment intent on mount
  useEffect(() => {
    const initializePayment = async () => {
      if (!checkoutSessionId || initializationAttempted.current) return;

      // Mark as attempted immediately to prevent race conditions
      initializationAttempted.current = true;

      try {
        // Check if Stripe publishable key is configured
        const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!stripeKey || stripeKey.includes("YOUR_")) {
          setError(
            "Stripe is not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env.local file. " +
            "Get your key from: https://dashboard.stripe.com/test/apikeys"
          );
          return;
        }

        // Create payment intent first (need connected account ID)
        const result = await createPaymentIntent({ checkoutSessionId });
        setClientSecret(result.clientSecret || null);
        setPaymentIntentId(result.paymentIntentId || null);
        setConnectedAccountId(result.connectedAccountId || null);

        // Load Stripe.js with publishable key AND connected account ID
        // This tells Stripe which connected account the payment intent belongs to
        const stripeInstance = await loadStripe(stripeKey, {
          stripeAccount: result.connectedAccountId || undefined,
        });
        if (!stripeInstance) {
          setError("Failed to load Stripe. Please check your publishable key.");
          return;
        }
        setStripe(stripeInstance);

        // Create Elements instance
        if (stripeInstance && result.clientSecret) {
          const elementsInstance = stripeInstance.elements({
            clientSecret: result.clientSecret,
          });
          setElements(elementsInstance);
        }
      } catch (err) {
        console.error("Failed to initialize payment:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize payment. Please refresh and try again."
        );
        // Reset flag on error so user can retry
        initializationAttempted.current = false;
      }
    };

    initializePayment();
  }, [checkoutSessionId, createPaymentIntent]);

  // Mount Stripe Card Element when elements and DOM node are ready
  useEffect(() => {
    if (!elements || !cardMountNode) {
      return;
    }

    const card = elements.create("card", {
      style: {
        base: {
          fontSize: "16px",
          color: "#424770",
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          "::placeholder": {
            color: "#aab7c4",
          },
        },
        invalid: {
          color: "#9e2146",
          iconColor: "#9e2146",
        },
      },
    });

    card.mount(cardMountNode);
    setCardElement(card);

    // Listen to card input changes
    card.on("change", (event) => {
      setIsCardComplete(event.complete);
      if (event.error) {
        setError(event.error.message);
      } else {
        setError(null);
      }
    });

    // Cleanup
    return () => {
      card.unmount();
    };
  }, [elements, cardMountNode]); // State-based dependency triggers properly

  // Load tax settings (using public query for anonymous checkout)
  const taxSettings = useQuery(api.organizationTaxSettings.getPublicTaxSettings, {
    organizationId,
  });

  // Get currency from first product (all products should have same currency)
  const currency = (() => {
    const firstProduct = linkedProducts.find((p) => p._id === selectedProducts[0]?.productId);
    return firstProduct?.currency || "USD";
  })();

  // Get default tax rate using the same logic as step 1
  const getDefaultTaxRate = () => {
    if (!taxSettings?.taxEnabled) return 0;

    // Try to find active custom rate for origin address
    const customRate = taxSettings.customRates?.find(
      (rate) => rate.active && rate.jurisdiction === taxSettings.originAddress?.country
    );
    if (customRate) {
      return customRate.rate;
    }

    // Use organization's default tax code if set
    if (taxSettings.defaultTaxCode) {
      return getTaxRateByCode(taxSettings.defaultTaxCode, 0);
    }

    // Fallback to country-level standard rates
    return getDefaultTaxRateByCountry(
      taxSettings.originAddress.country,
      taxSettings.originAddress.state
    );
  };

  const defaultTaxRate = getDefaultTaxRate();
  const defaultTaxBehavior = taxSettings?.defaultTaxBehavior || "exclusive";

  // Collect all addons from form responses
  const allAddons = (formResponses || []).flatMap((fr) => {
    const product = linkedProducts.find((p) => p._id === fr.productId);
    if (!product) {
      console.log("🔍 [PaymentStep] No product found for formResponse:", fr.productId);
      return [];
    }

    const productAddons = (product.customProperties as { addons?: ProductAddon[] } | undefined)?.addons;
    if (!productAddons) {
      console.log("🔍 [PaymentStep] No addons configured for product:", {
        productId: product._id,
        productName: product.name,
        customProperties: product.customProperties,
      });
      return [];
    }

    const calculated = calculateAddonsFromResponses(productAddons, fr.responses);
    console.log("🔍 [PaymentStep] Calculated addons:", {
      productId: product._id,
      productName: product.name,
      addonConfigCount: productAddons.length,
      formResponses: fr.responses,
      calculatedAddons: calculated,
    });

    return calculated;
  });

  console.log("🔍 [PaymentStep] All addons collected:", allAddons);

  // Calculate tax using the comprehensive calculator with addons support
  const taxCalculation = taxSettings?.taxEnabled
    ? calculateCheckoutTaxWithAddons(
        selectedProducts.map((sp) => {
          const fullProduct = linkedProducts.find((p) => p._id === sp.productId);
          return {
            product: fullProduct!,
            quantity: sp.quantity,
          };
        }),
        allAddons, // Include all calculated addons
        defaultTaxRate,
        defaultTaxBehavior
      )
    : null;

  /**
   * Format price for display using actual product currency
   */
  const formatPrice = (amount: number, currencyOverride?: string) => {
    const currencyToUse = (currencyOverride || currency).toUpperCase();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyToUse,
    }).format(amount / 100);
  };

  /**
   * Handle payment submission with real Stripe payment
   */
  const handlePayment = async () => {
    if (!stripe || !cardElement || !clientSecret || !paymentIntentId) {
      setError("Payment not initialized. Please refresh the page.");
      return;
    }

    if (!checkoutSessionId) {
      setError("Checkout session not found. Please refresh the page.");
      return;
    }

    if (!isCardComplete) {
      setError("Please enter complete card details.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm card payment with Stripe
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerInfo.name,
            email: customerInfo.email,
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        throw new Error("Payment was not successful. Please try again.");
      }

      // Complete checkout - this will verify payment with Stripe backend
      const result = await completeCheckout({
        sessionId,
        checkoutSessionId,
        paymentIntentId,
      });

      onComplete({
        success: result.success,
        transactionId: result.paymentId,
        receiptUrl: "#",
        purchasedItemIds: result.purchasedItemIds,
        checkoutSessionId: checkoutSessionId, // Include checkoutSessionId in result
      });
    } catch (err) {
      console.error("Payment error:", err);
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

        {/* Products - Line Items */}
        <div className="mb-4 pb-4 border-b border-gray-300">
          <p className="text-sm font-bold mb-2">Items:</p>
          {selectedProducts.map((sp, idx) => {
            const fullProduct = linkedProducts.find((p) => p._id === sp.productId);
            return (
              <div key={idx} className="flex justify-between text-sm text-gray-700 mb-1">
                <span>{fullProduct?.name || `Product ${idx + 1}`} × {sp.quantity}</span>
                <span>{formatPrice(sp.price * sp.quantity)}</span>
              </div>
            );
          })}

          {/* Form Add-ons (if any) - Using addon configuration */}
          {formResponses && formResponses.some(fr => fr.addedCosts > 0) && (
            <>
              {formResponses
                .filter((fr) => fr.addedCosts > 0)
                .map((fr) => {
                  // Get product for this form response
                  const product = linkedProducts.find((p) => p._id === fr.productId);
                  if (!product) return null;

                  // Get addon configuration from product
                  const productAddons = (product.customProperties as { addons?: ProductAddon[] } | undefined)?.addons;
                  if (!productAddons) return null;

                  // Calculate addons for this ticket
                  const calculatedAddons = calculateAddonsFromResponses(productAddons, fr.responses);

                  // Render each addon
                  return calculatedAddons.map((addon) => (
                    <div
                      key={`addon-${fr.productId}-${fr.ticketNumber}-${addon.addonId}`}
                      className="flex justify-between text-sm text-gray-700 mb-1 italic"
                    >
                      <span>
                        {addon.icon && `${addon.icon} `}
                        + {addon.name}
                        {addon.quantity > 1 && ` × ${addon.quantity}`}
                        {` (Ticket ${fr.ticketNumber})`}
                      </span>
                      <span>{formatPrice(addon.totalPrice, addon.currency)}</span>
                    </div>
                  ));
                })}
            </>
          )}
        </div>

        {/* Pricing Summary with Tax Breakdown */}
        <div className="space-y-2">
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Subtotal ({selectedProducts.reduce((sum, sp) => sum + sp.quantity, 0)}{" "}
              {selectedProducts.reduce((sum, sp) => sum + sp.quantity, 0) === 1 ? "item" : "items"})
            </span>
            <span className="font-medium">
              {formatPrice(
                selectedProducts.reduce((sum, sp) => sum + (sp.price * sp.quantity), 0) +
                (formResponses?.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0) || 0)
              )}
            </span>
          </div>

          {/* Tax Lines - Group by tax rate like step 1 */}
          {taxCalculation && taxSettings?.taxEnabled && taxCalculation.isTaxable && taxCalculation.taxAmount > 0 && (() => {
            // Group line items by tax rate to show separate lines for each tax type
            const taxGroups = taxCalculation.lineItems.reduce((groups, item) => {
              if (!item.taxable || item.taxAmount === 0) return groups;

              // Calculate effective rate for this item
              const effectiveRate = item.subtotal > 0
                ? (item.taxAmount / item.subtotal) * 100
                : 0;
              const rateKey = effectiveRate.toFixed(1);

              if (!groups[rateKey]) {
                groups[rateKey] = { rate: effectiveRate, amount: 0, count: 0 };
              }
              groups[rateKey].amount += item.taxAmount;
              groups[rateKey].count += 1;

              return groups;
            }, {} as Record<string, { rate: number; amount: number; count: number }>);

            const taxEntries = Object.entries(taxGroups);

            // If only one tax rate, show single line
            if (taxEntries.length === 1) {
              const [rateStr] = taxEntries[0];
              return (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Tax ({rateStr}%)
                    <span className="text-xs ml-1 opacity-70">
                      {taxCalculation.taxBehavior === "inclusive" ? "💶 included" : "💵 added"}
                    </span>
                  </span>
                  <span className="font-medium">{formatPrice(taxCalculation.taxAmount)}</span>
                </div>
              );
            }

            // Multiple tax rates - show breakdown with separate lines
            return (
              <>
                {taxEntries.map(([rateStr, { amount, count }]) => (
                  <div key={rateStr} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Tax ({rateStr}%)
                      {count > 1 && (
                        <span className="text-xs ml-1 opacity-70">
                          {count} items
                        </span>
                      )}
                    </span>
                    <span className="font-medium">{formatPrice(amount)}</span>
                  </div>
                ))}
              </>
            );
          })()}

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
            <span className="text-xl font-bold">Total:</span>
            <span className="text-2xl font-bold text-purple-600">
              {formatPrice(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="border-2 border-gray-300 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">Payment Details</h3>

        {(paymentProvider === "stripe-connect" || paymentProvider === "stripe") && (
          <div className="space-y-4">
            {/* Stripe Card Element */}
            <div>
              <label className="block text-sm font-bold mb-2">
                Card Details
              </label>
              <div
                ref={setCardMountNode}
                className="border-2 border-gray-300 rounded p-3 bg-white min-h-[44px]"
              />
              {!stripe && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  Loading payment form...
                </div>
              )}
            </div>

            {/* Security notice */}
            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
              🔒 Your payment information is encrypted and secure. We never store your card details.
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
          disabled={isProcessing || !stripe || !isCardComplete}
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

/**
 * INVOICE PAYMENT FORM
 *
 * For B2B invoicing - no immediate payment required.
 * Shows order summary and creates consolidated invoice for employer.
 */
function InvoicePaymentForm({
  totalAmount,
  organizationId,
  checkoutSessionId,
  linkedProducts,
  customerInfo,
  selectedProducts,
  formResponses,
  rulesResult,
  onComplete,
  onBack,
}: PaymentFormStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Actions
  const initiateInvoice = useAction(api.paymentProviders.invoice.initiateInvoicePayment);

  // Get currency from first product
  const currency = linkedProducts.find((p) => p._id === selectedProducts[0]?.productId)?.currency || "USD";

  const handleCompleteRegistration = async () => {
    if (!checkoutSessionId) {
      setError("Checkout session not initialized");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Initiate invoice payment (creates invoice + tickets)
      const result = await initiateInvoice({
        sessionId: "public",
        checkoutSessionId,
        organizationId,
      });

      if (!result.success) {
        setError(result.error || "Failed to create invoice");
        setIsProcessing(false);
        return;
      }

      // Complete checkout flow
      onComplete({
        success: true,
        transactionId: result.invoiceId || "invoice_pending",
        checkoutSessionId: checkoutSessionId,
      });
    } catch (err) {
      console.error("Failed to create invoice:", err);
      setError(err instanceof Error ? err.message : "Failed to create invoice");
      setIsProcessing(false);
    }
  };

  // Check if we have employer-specific details from rules engine
  const employerName = rulesResult?.enforcementDetails?.employerName;
  const paymentTerms = rulesResult?.enforcementDetails?.paymentTerms || "net30";
  const paymentTermsText = {
    net30: "Net 30",
    net60: "Net 60",
    net90: "Net 90",
  }[paymentTerms];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">📄 Invoice Payment</h2>

      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3">How This Works</h3>
        <ol className="space-y-2 text-sm">
          <li>✅ <strong>Step 1:</strong> Complete your registration now</li>
          <li>📧 <strong>Step 2:</strong> An invoice will be sent to {employerName || "your employer"}</li>
          <li>💳 <strong>Step 3:</strong> {employerName || "Your employer"} pays the invoice ({paymentTermsText} terms)</li>
          <li>🎫 <strong>Step 4:</strong> You receive your tickets immediately after invoice is accepted</li>
        </ol>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Order Summary</h3>

        {/* Products */}
        {selectedProducts.map((sp) => {
          const product = linkedProducts.find((p) => p._id === sp.productId);
          return (
            <div key={sp.productId} className="flex justify-between py-2 border-b">
              <div>
                <p className="font-medium">{product?.name}</p>
                <p className="text-sm text-gray-600">Quantity: {sp.quantity}</p>
              </div>
              <p className="font-medium">{formatPrice(sp.price * sp.quantity, currency)}</p>
            </div>
          );
        })}

        {/* Form Addons */}
        {formResponses && formResponses.some(fr => fr.addedCosts > 0) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Add-ons:</p>
            {formResponses
              .filter((fr) => fr.addedCosts > 0)
              .map((fr) => (
                <div key={`invoice-addon-${fr.productId}-${fr.ticketNumber}`} className="flex justify-between py-1 text-sm">
                  <p className="text-gray-600">Ticket {fr.ticketNumber} extras</p>
                  <p>{formatPrice(fr.addedCosts, currency)}</p>
                </div>
              ))}
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between pt-4 mt-4 border-t-2 border-gray-400">
          <p className="text-lg font-bold">Total Amount:</p>
          <p className="text-lg font-bold">{formatPrice(totalAmount, currency)}</p>
        </div>

        <p className="text-xs text-gray-600 mt-2">
          * This amount will be invoiced to your employer
        </p>
      </div>

      {/* Acknowledgment */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-md font-semibold mb-3">Acknowledgment</h3>
        <div className="text-sm space-y-2">
          <p>By clicking "Complete Registration", you acknowledge that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>An invoice for <strong>{formatPrice(totalAmount, currency)}</strong> will be generated</li>
            <li>The invoice will be sent to {employerName ? <strong>{employerName}</strong> : "your employer organization"}</li>
            <li>Payment is due within {paymentTerms.replace("net", "")} days of invoice date ({paymentTermsText} terms)</li>
            <li>Your registration will be confirmed upon invoice acceptance</li>
            <li>Tickets will be delivered to: <strong>{customerInfo.email}</strong></li>
          </ul>
        </div>
      </div>

      {/* Error Display */}
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
          onClick={handleCompleteRegistration}
          disabled={isProcessing}
          className="flex-1 px-6 py-3 text-base font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Creating Invoice...
            </>
          ) : (
            <>
              Complete Registration →
            </>
          )}
        </button>
      </div>

      {/* Info Badge */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
          📄 Invoice will be sent to {employerName || "your employer"} for payment
        </p>
      </div>
    </div>
  );
}

/**
 * Helper: Format price for display
 * NOTE: This is only used by InvoicePaymentForm component above.
 * It gets currency from the component's scope via closure.
 */
function formatPrice(amountInCents: number, currencyCode = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amountInCents / 100);
}
