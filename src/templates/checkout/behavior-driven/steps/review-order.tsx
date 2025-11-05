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

export function ReviewOrderStep({ checkoutData, products, onComplete, onBack }: StepProps) {
  const { t } = useTranslation();
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const currency = products[0]?.currency || "EUR";

  // Calculate totals with add-ons AND form costs
  const productsSubtotal = selectedProducts.reduce((sum, sp) => sum + sp.price * sp.quantity, 0);
  const formAddonsSubtotal = (checkoutData.formResponses || []).reduce((sum, fr) => sum + (fr.addedCosts || 0), 0);
  const behaviorAddonsSubtotal = addonsInfo?.totalAddonCost || 0;
  const subtotal = productsSubtotal + formAddonsSubtotal + behaviorAddonsSubtotal;

  // Use tax calculation total if available (includes tax), otherwise use subtotal
  const taxCalculation = checkoutData.taxCalculation;
  const total = taxCalculation && taxCalculation.isTaxable && taxCalculation.total > 0
    ? subtotal + taxCalculation.taxAmount  // subtotal + tax
    : subtotal; // no tax or tax-inclusive

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">{t('ui.checkout_template.behavior_driven.review_order.headers.title', 'Review Your Order')}</h2>
        <p className="text-gray-600">{t('ui.checkout_template.behavior_driven.review_order.headers.subtitle', 'Please review your information before continuing')}</p>
      </div>

      {/* Employer Billing Notice */}
      {isInvoiceCheckout && invoiceInfo && (
        <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle size={24} className="text-blue-600" />
            <h3 className="text-lg font-bold text-blue-900">{t('ui.checkout_template.behavior_driven.review_order.employer_billing.title', 'Employer Billing Detected')}</h3>
          </div>
          <div className="text-blue-900">
            <p className="mb-2">
              <strong>{t('ui.checkout_template.behavior_driven.review_order.employer_billing.employer', 'Employer:')}</strong> {employerName}
            </p>
            <p className="mb-2">
              <strong>{t('ui.checkout_template.behavior_driven.review_order.employer_billing.payment_terms', 'Payment Terms:')}</strong> {t('ui.checkout_template.behavior_driven.review_order.employer_billing.net_days', { days: invoiceInfo.paymentTerms?.replace("net", "") || "30" })}
            </p>
            <p className="text-sm mt-3 italic">
              {t('ui.checkout_template.behavior_driven.review_order.employer_billing.notice', 'ℹ️ An invoice will be sent to your employer. No immediate payment required.')}
            </p>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">{t('ui.checkout_template.behavior_driven.review_order.sections.order_summary', 'Order Summary')}</h3>

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
            <span>{t('ui.checkout_template.behavior_driven.review_order.labels.subtotal', 'Subtotal:')}</span>
            <span className="font-medium">{formatPrice(subtotal, currency)}</span>
          </div>

          {taxCalculation && taxCalculation.isTaxable && taxCalculation.taxAmount > 0 && (() => {
            // Calculate effective tax rate from actual amounts
            const effectiveTaxRate = subtotal > 0
              ? (taxCalculation.taxAmount / subtotal) * 100
              : 0;

            return (
              <div className="flex justify-between text-gray-700">
                <span>{t('ui.checkout_template.behavior_driven.review_order.labels.tax', 'Tax')} ({effectiveTaxRate.toFixed(1)}%):</span>
                <span className="font-medium">{formatPrice(taxCalculation.taxAmount, currency)}</span>
              </div>
            );
          })()}

          <div className="flex justify-between pt-3 mt-3 border-t-2 border-gray-400">
            <span className="text-xl font-bold">{t('ui.checkout_template.behavior_driven.review_order.labels.total', 'Total:')}</span>
            <span className="text-xl font-bold text-purple-600">{formatPrice(total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">{t('ui.checkout_template.behavior_driven.review_order.sections.your_information', 'Your Information')}</h3>
        <div className="space-y-2 text-sm">
          <p>
            <strong>{t('ui.checkout_template.behavior_driven.review_order.labels.email', 'Email:')}</strong> {checkoutData.customerInfo?.email}
          </p>
          <p>
            <strong>{t('ui.checkout_template.behavior_driven.review_order.labels.name', 'Name:')}</strong> {checkoutData.customerInfo?.name}
          </p>
          {checkoutData.customerInfo?.phone && (
            <p>
              <strong>{t('ui.checkout_template.behavior_driven.review_order.labels.phone', 'Phone:')}</strong> {checkoutData.customerInfo.phone}
            </p>
          )}
        </div>
      </div>

      {/* Registration Summary */}
      {checkoutData.formResponses && checkoutData.formResponses.length > 0 && (
        <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">{t('ui.checkout_template.behavior_driven.review_order.sections.registration_info', 'Registration Information')}</h3>
          <p className="text-sm text-gray-600">
            ✓ {checkoutData.formResponses.length} {checkoutData.formResponses.length > 1 ? t('ui.checkout_template.behavior_driven.review_order.labels.tickets_registered', 'tickets registered') : t('ui.checkout_template.behavior_driven.review_order.labels.ticket_registered', 'ticket registered')}
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
            {t('ui.checkout_template.behavior_driven.review_order.buttons.back', 'Back')}
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
              {t('ui.checkout_template.behavior_driven.review_order.buttons.continue_invoice', 'Complete Registration (Invoice)')}
            </>
          ) : (
            <>{t('ui.checkout_template.behavior_driven.review_order.buttons.continue_payment', 'Continue to Payment →')}</>
          )}
        </button>
      </div>
    </div>
  );
}
