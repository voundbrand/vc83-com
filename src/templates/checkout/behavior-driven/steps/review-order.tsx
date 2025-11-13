"use client";

/**
 * STEP 4: REVIEW ORDER (Behavior Results Displayed)
 *
 * Show order summary and behavior execution results.
 * This is where users see if employer billing was detected.
 */

import { StepProps } from "../types";
import { CheckCircle, FileText, ArrowLeft } from "lucide-react";
import { getInvoiceMappingFromResults, getAddonsFromResults } from "@/lib/behaviors/adapters/checkout-integration";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useTranslation } from "@/contexts/translation-context";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

export function ReviewOrderStep({ checkoutData, products, onComplete, onBack }: StepProps) {
  const { locale } = useTranslation(); // For locale management only
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.checkout_template.behavior_driven");
  const selectedProducts = checkoutData.selectedProducts || [];
  const behaviorResults = checkoutData.behaviorResults;

  // Check if invoice checkout via behaviors
  const invoiceInfo = behaviorResults ? getInvoiceMappingFromResults(behaviorResults) : null;
  const isInvoiceCheckout = invoiceInfo?.shouldInvoice || false;

  // Fetch organization name from CRM using the org ID
  const crmOrganization = useQuery(
    api.crmOntology.getPublicCrmOrganizationBilling,
    invoiceInfo?.employerOrgId && invoiceInfo.employerOrgId.length > 20
      ? { crmOrganizationId: invoiceInfo.employerOrgId as Id<"objects"> }
      : "skip"
  );

  // Use organization name from CRM, fallback to "your employer" if not loaded
  const employerName = crmOrganization?.name || "your employer";

  // Get add-ons from behavior results
  const addonsInfo = behaviorResults ? getAddonsFromResults(behaviorResults) : null;

  const formatPrice = (amount: number, currency: string) => {
    // Use locale based on currency for correct thousand/decimal separators
    // EUR, GBP, etc. → European format (1.000,00)
    // USD, CAD, etc. → US format (1,000.00)
    const locale = currency.toUpperCase() === "USD" ? "en-US" : "de-DE";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const currency = products[0]?.currency || "EUR";

  // Get tax calculation from checkout data
  const taxCalculation = checkoutData.taxCalculation;

  // For display purposes, use NET amounts from tax calculation
  // taxCalculation.subtotal = NET price (before tax) - correct for both inclusive and exclusive
  // taxCalculation.total = final total (NET + tax for exclusive, original price for inclusive)
  const subtotalForDisplay = taxCalculation?.subtotal || 0;
  const total = taxCalculation?.total || 0;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">{t('ui.checkout_template.behavior_driven.review_order.headers.title')}</h2>
        <p className="text-gray-600">{t('ui.checkout_template.behavior_driven.review_order.headers.subtitle')}</p>
      </div>

      {/* Employer Billing Notice */}
      {isInvoiceCheckout && invoiceInfo && (
        <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle size={24} className="text-blue-600" />
            <h3 className="text-lg font-bold text-blue-900">{t('ui.checkout_template.behavior_driven.review_order.employer_billing.title')}</h3>
          </div>
          <div className="text-blue-900">
            <p className="mb-2">
              <strong>{t('ui.checkout_template.behavior_driven.review_order.employer_billing.employer')}</strong> {employerName}
            </p>
            <p className="mb-2">
              <strong>{t('ui.checkout_template.behavior_driven.review_order.employer_billing.payment_terms')}</strong> {t('ui.checkout_template.behavior_driven.review_order.employer_billing.net_days', { days: invoiceInfo.paymentTerms?.replace("net", "") || "30" })}
            </p>
            <p className="text-sm mt-3 italic">
              {t('ui.checkout_template.behavior_driven.review_order.employer_billing.notice')}
            </p>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">{t('ui.checkout_template.behavior_driven.review_order.sections.order_summary')}</h3>

        {/* Products */}
        <div className="space-y-3 mb-4 pb-4 border-b border-gray-300">
          {selectedProducts.map((sp) => {
            const product = products.find((p) => p._id === sp.productId);
            return (
              <div key={sp.productId} className="flex justify-between">
                <div>
                  <p className="font-medium">{product?.name}</p>
                  <p className="text-sm text-gray-600">Quantity: {sp.quantity}</p>
                </div>
                <p className="font-bold">{formatPrice(sp.price * sp.quantity, currency)}</p>
              </div>
            );
          })}

          {/* Add-ons from behavior system */}
          {addonsInfo && addonsInfo.lineItems.map((addon) => (
            <div key={addon.id} className="flex justify-between text-purple-700">
              <div>
                <p className="font-medium">{addon.icon} {addon.name}</p>
                <p className="text-sm text-gray-600">Quantity: {addon.quantity}</p>
                {addon.description && (
                  <p className="text-xs text-gray-500 italic">{addon.description}</p>
                )}
              </div>
              <p className="font-bold">{formatPrice(addon.totalPrice, currency)}</p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-gray-700">
            <span>{t('ui.checkout_template.behavior_driven.review_order.labels.subtotal')}</span>
            <span className="font-medium">{formatPrice(subtotalForDisplay, currency)}</span>
          </div>

          {taxCalculation && taxCalculation.isTaxable && taxCalculation.taxAmount > 0 && taxCalculation.lineItems && (() => {
            // Group line items by tax rate
            const taxGroups = new Map<number, { subtotal: number; taxAmount: number }>();

            for (const item of taxCalculation.lineItems) {
              const rate = item.taxRate;
              const existing = taxGroups.get(rate) || { subtotal: 0, taxAmount: 0 };
              taxGroups.set(rate, {
                subtotal: existing.subtotal + item.subtotal,
                taxAmount: existing.taxAmount + item.taxAmount,
              });
            }

            // Sort by tax rate (0% first, then ascending)
            const sortedRates = Array.from(taxGroups.entries()).sort((a, b) => a[0] - b[0]);

            return (
              <>
                {sortedRates.map(([rate, amounts]) => (
                  <div key={rate} className="flex justify-between text-gray-700">
                    <span>{t('ui.checkout_template.behavior_driven.review_order.labels.tax')} ({rate.toFixed(1)}%):</span>
                    <span className="font-medium">{formatPrice(amounts.taxAmount, currency)}</span>
                  </div>
                ))}
              </>
            );
          })()}

          <div className="flex justify-between pt-3 mt-3 border-t-2 border-gray-400">
            <span className="text-xl font-bold">{t('ui.checkout_template.behavior_driven.review_order.labels.total')}</span>
            <span className="text-xl font-bold text-purple-600">{formatPrice(total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">{t('ui.checkout_template.behavior_driven.review_order.sections.your_information')}</h3>
        <div className="space-y-2 text-sm">
          <p>
            <strong>{t('ui.checkout_template.behavior_driven.review_order.labels.email')}</strong> {checkoutData.customerInfo?.email}
          </p>
          <p>
            <strong>{t('ui.checkout_template.behavior_driven.review_order.labels.name')}</strong> {checkoutData.customerInfo?.name}
          </p>
          {checkoutData.customerInfo?.phone && (
            <p>
              <strong>{t('ui.checkout_template.behavior_driven.review_order.labels.phone')}</strong> {checkoutData.customerInfo.phone}
            </p>
          )}
        </div>
      </div>

      {/* Registration Summary */}
      {checkoutData.formResponses && checkoutData.formResponses.length > 0 && (
        <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">{t('ui.checkout_template.behavior_driven.review_order.sections.registration_info')}</h3>
          <p className="text-sm text-gray-600">
            ✓ {checkoutData.formResponses.length} {checkoutData.formResponses.length > 1 ? t('ui.checkout_template.behavior_driven.review_order.labels.tickets_registered') : t('ui.checkout_template.behavior_driven.review_order.labels.ticket_registered')}
          </p>
        </div>
      )}

      {/* Behavior Results (Debug) - Hidden in production */}

      {/* Action Buttons */}
      <div className="flex gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 text-lg font-bold border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            {t('ui.checkout_template.behavior_driven.review_order.buttons.back')}
          </button>
        )}

        <button
          type="button"
          onClick={() => onComplete({})}
          className="flex-1 px-6 py-3 text-lg font-bold border-2 border-green-600 bg-green-600 text-white hover:bg-green-700 rounded transition-colors flex items-center justify-center gap-2"
        >
          {isInvoiceCheckout ? (
            <>
              <FileText size={20} />
              {t('ui.checkout_template.behavior_driven.review_order.buttons.continue_invoice')}
            </>
          ) : (
            <>{t('ui.checkout_template.behavior_driven.review_order.buttons.continue_payment')}</>
          )}
        </button>
      </div>
    </div>
  );
}
