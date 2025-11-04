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
import { useTranslation } from "@/contexts/translation-context";

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
  const { t } = useTranslation();

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
            {t('ui.checkout.payment_form.provider_not_implemented', { provider: props.paymentProvider })}
          </p>
          <button onClick={props.onBack} style={{ padding: "0.5rem 1rem" }}>
            {t('ui.checkout.payment_form.go_back')}
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
  const { t } = useTranslation();
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
  const completeCheckout = useAction(api.checkoutSessions.completeCheckoutAndFulfill);

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
          setError(t('ui.checkout.payment_form.stripe.config_error'));
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
          setError(t('ui.checkout.payment_form.stripe.load_failed'));
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
            : t('ui.checkout.payment_form.stripe.init_failed')
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
      setError(t('ui.checkout.payment_form.errors.payment_not_initialized'));
      return;
    }

    if (!checkoutSessionId) {
      setError(t('ui.checkout.payment_form.errors.session_not_found'));
      return;
    }

    if (!isCardComplete) {
      setError(t('ui.checkout.payment_form.errors.card_incomplete'));
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
        throw new Error(t('ui.checkout.payment_form.errors.payment_not_successful'));
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
      setError(err instanceof Error ? err.message : t('ui.checkout.payment_form.errors.payment_failed'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="payment-form-step max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <CreditCard size={24} />
          {t('ui.checkout.payment_form.headers.payment')}
        </h2>
        <p className="text-gray-600">
          {t('ui.checkout.payment_form.headers.subtitle')}
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">{t('ui.checkout.payment_form.headers.order_summary')}</h3>

        {/* Customer Info */}
        <div className="mb-4 pb-4 border-b border-gray-300">
          <p className="text-sm text-gray-600">
            <strong>{t('ui.checkout.payment_form.order_summary.email')}</strong> {customerInfo.email}
          </p>
          <p className="text-sm text-gray-600">
            <strong>{t('ui.checkout.payment_form.order_summary.name')}</strong> {customerInfo.name}
          </p>
          {customerInfo.phone && (
            <p className="text-sm text-gray-600">
              <strong>{t('ui.checkout.payment_form.order_summary.phone')}</strong> {customerInfo.phone}
            </p>
          )}
        </div>

        {/* Products - Line Items */}
        <div className="mb-4 pb-4 border-b border-gray-300">
          <p className="text-sm font-bold mb-2">{t('ui.checkout.payment_form.order_summary.items')}</p>
          {selectedProducts.map((sp, idx) => {
            const fullProduct = linkedProducts.find((p) => p._id === sp.productId);
            return (
              <div key={idx} className="flex justify-between text-sm text-gray-700 mb-1">
                <span>{fullProduct?.name || t('ui.checkout.payment_form.order_summary.product_fallback', { number: idx + 1 })} × {sp.quantity}</span>
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
                        {` ${t('ui.checkout.payment_form.order_summary.ticket_addon', { number: fr.ticketNumber })}`}
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
              {t('ui.checkout.payment_form.order_summary.subtotal', {
                count: selectedProducts.reduce((sum, sp) => sum + sp.quantity, 0),
                itemText: selectedProducts.reduce((sum, sp) => sum + sp.quantity, 0) === 1
                  ? t('ui.checkout.payment_form.order_summary.item_singular')
                  : t('ui.checkout.payment_form.order_summary.item_plural')
              })}
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
                    {t('ui.checkout.payment_form.order_summary.tax_rate', { rate: rateStr })}
                    <span className="text-xs ml-1 opacity-70">
                      {taxCalculation.taxBehavior === "inclusive"
                        ? t('ui.checkout.payment_form.order_summary.tax_inclusive')
                        : t('ui.checkout.payment_form.order_summary.tax_exclusive')}
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
                      {t('ui.checkout.payment_form.order_summary.tax_rate', { rate: rateStr })}
                      {count > 1 && (
                        <span className="text-xs ml-1 opacity-70">
                          {t('ui.checkout.payment_form.order_summary.tax_items_count', { count })}
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
            <span className="text-xl font-bold">{t('ui.checkout.payment_form.order_summary.total')}</span>
            <span className="text-2xl font-bold text-purple-600">
              {formatPrice(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="border-2 border-gray-300 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">{t('ui.checkout.payment_form.headers.payment_details')}</h3>

        {(paymentProvider === "stripe-connect" || paymentProvider === "stripe") && (
          <div className="space-y-4">
            {/* Stripe Card Element */}
            <div>
              <label className="block text-sm font-bold mb-2">
                {t('ui.checkout.payment_form.stripe.card_details_label')}
              </label>
              <div
                ref={setCardMountNode}
                className="border-2 border-gray-300 rounded p-3 bg-white min-h-[44px]"
              />
              {!stripe && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  {t('ui.checkout.payment_form.stripe.loading_payment_form')}
                </div>
              )}
            </div>

            {/* Security notice */}
            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
              {t('ui.checkout.payment_form.stripe.security_notice')}
            </div>
          </div>
        )}

        {paymentProvider === "paypal" && (
          <div className="text-sm text-gray-600">
            <p className="mb-4">{t('ui.checkout.payment_form.paypal.button_description')}</p>
            <div className="bg-gray-100 p-4 rounded text-center">
              {t('ui.checkout.payment_form.paypal.button_placeholder')}
            </div>
          </div>
        )}

        {paymentProvider === "manual" && (
          <div className="text-sm text-gray-600">
            <p className="mb-4">
              {t('ui.checkout.payment_form.manual.transfer_instructions')}
            </p>
            <div className="bg-gray-100 p-4 rounded">
              <p><strong>{t('ui.checkout.payment_form.manual.bank_label')}</strong> {t('ui.checkout.payment_form.manual.bank_example')}</p>
              <p><strong>{t('ui.checkout.payment_form.manual.account_label')}</strong> 123456789</p>
              <p><strong>{t('ui.checkout.payment_form.manual.reference_label')}</strong> {t('ui.checkout.payment_form.manual.reference_prefix')}{Date.now()}</p>
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
          {t('ui.checkout.payment_form.buttons.back')}
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
              {t('ui.checkout.payment_form.buttons.processing')}
            </>
          ) : (
            <>
              {t('ui.checkout.payment_form.buttons.complete_purchase', { amount: formatPrice(totalAmount) })}
            </>
          )}
        </button>
      </div>

      {/* Security Badge */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
          {t('ui.checkout.payment_form.badges.secure_payment', { provider: paymentProvider })}
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
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Actions
  const initiateInvoice = useAction(api.paymentProviders.invoice.initiateInvoicePayment);

  // Get currency from first product
  const currency = linkedProducts.find((p) => p._id === selectedProducts[0]?.productId)?.currency || "USD";

  const handleCompleteRegistration = async () => {
    if (!checkoutSessionId) {
      setError(t('ui.checkout.payment_form.errors.invoice_not_initialized'));
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
        setError(result.error || t('ui.checkout.payment_form.errors.invoice_creation_failed'));
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
      setError(err instanceof Error ? err.message : t('ui.checkout.payment_form.errors.invoice_creation_failed'));
      setIsProcessing(false);
    }
  };

  // Check if we have employer-specific details from rules engine
  const employerOrgId = rulesResult?.enforcementDetails?.employerName;

  // Fetch organization name from CRM using the org ID
  const crmOrganization = useQuery(
    api.crmOntology.getPublicCrmOrganizationBilling,
    employerOrgId && employerOrgId.length > 20
      ? { crmOrganizationId: employerOrgId as Id<"objects"> }
      : "skip"
  );

  // Use organization name from CRM, fallback to ID if not loaded
  const employerName = crmOrganization?.name || employerOrgId;

  const paymentTerms = rulesResult?.enforcementDetails?.paymentTerms || "net30";
  const paymentTermsText = paymentTerms === "net30"
    ? t('ui.checkout.payment_form.invoice.payment_terms.net30')
    : paymentTerms === "net60"
    ? t('ui.checkout.payment_form.invoice.payment_terms.net60')
    : t('ui.checkout.payment_form.invoice.payment_terms.net90');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">{t('ui.checkout.payment_form.headers.invoice_payment')}</h2>

      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3">{t('ui.checkout.payment_form.invoice.how_it_works.title')}</h3>
        <ol className="space-y-2 text-sm">
          <li>{t('ui.checkout.payment_form.invoice.how_it_works.step1')}</li>
          <li>{t('ui.checkout.payment_form.invoice.how_it_works.step2', { employer: employerName || t('ui.checkout.payment_form.invoice.employer_fallback') })}</li>
          <li>{t('ui.checkout.payment_form.invoice.how_it_works.step3', { employer: employerName || t('ui.checkout.payment_form.invoice.employer_fallback'), terms: paymentTermsText })}</li>
          <li>{t('ui.checkout.payment_form.invoice.how_it_works.step4')}</li>
        </ol>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">{t('ui.checkout.payment_form.headers.order_summary')}</h3>

        {/* Products */}
        {selectedProducts.map((sp) => {
          const product = linkedProducts.find((p) => p._id === sp.productId);
          return (
            <div key={sp.productId} className="flex justify-between py-2 border-b">
              <div>
                <p className="font-medium">{product?.name}</p>
                <p className="text-sm text-gray-600">{t('ui.checkout.payment_form.invoice.order_summary.quantity', { count: sp.quantity })}</p>
              </div>
              <p className="font-medium">{formatPrice(sp.price * sp.quantity, currency)}</p>
            </div>
          );
        })}

        {/* Form Addons */}
        {formResponses && formResponses.some(fr => fr.addedCosts > 0) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">{t('ui.checkout.payment_form.invoice.order_summary.addons')}</p>
            {formResponses
              .filter((fr) => fr.addedCosts > 0)
              .map((fr) => (
                <div key={`invoice-addon-${fr.productId}-${fr.ticketNumber}`} className="flex justify-between py-1 text-sm">
                  <p className="text-gray-600">{t('ui.checkout.payment_form.invoice.order_summary.ticket_extras', { number: fr.ticketNumber })}</p>
                  <p>{formatPrice(fr.addedCosts, currency)}</p>
                </div>
              ))}
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between pt-4 mt-4 border-t-2 border-gray-400">
          <p className="text-lg font-bold">{t('ui.checkout.payment_form.invoice.order_summary.total_amount')}</p>
          <p className="text-lg font-bold">{formatPrice(totalAmount, currency)}</p>
        </div>

        <p className="text-xs text-gray-600 mt-2">
          {t('ui.checkout.payment_form.invoice.order_summary.invoiced_note')}
        </p>
      </div>

      {/* Acknowledgment */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-md font-semibold mb-3">{t('ui.checkout.payment_form.invoice.acknowledgment.title')}</h3>
        <div className="text-sm space-y-2">
          <p>{t('ui.checkout.payment_form.invoice.acknowledgment.intro')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('ui.checkout.payment_form.invoice.acknowledgment.bullet1', { amount: formatPrice(totalAmount, currency) })}</li>
            <li>{t('ui.checkout.payment_form.invoice.acknowledgment.bullet2', { employer: employerName || t('ui.checkout.payment_form.invoice.acknowledgment.bullet2_fallback') })}</li>
            <li>{t('ui.checkout.payment_form.invoice.acknowledgment.bullet3', { days: paymentTerms.replace("net", ""), terms: paymentTermsText })}</li>
            <li>{t('ui.checkout.payment_form.invoice.acknowledgment.bullet4')}</li>
            <li>{t('ui.checkout.payment_form.invoice.acknowledgment.bullet5', { email: customerInfo.email })}</li>
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
          {t('ui.checkout.payment_form.buttons.back')}
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
              {t('ui.checkout.payment_form.buttons.creating_invoice')}
            </>
          ) : (
            <>
              {t('ui.checkout.payment_form.buttons.complete_registration')}
            </>
          )}
        </button>
      </div>

      {/* Info Badge */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
          {t('ui.checkout.payment_form.badges.invoice_to_employer', { employer: employerName || t('ui.checkout.payment_form.invoice.employer_fallback') })}
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
