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

import React from "react";
import { CheckoutProduct } from "@/templates/checkout/types";
import { Id } from "../../../../convex/_generated/dataModel";
import { type PaymentRulesResult } from "../../../../convex/paymentRulesEngine";
import { ArrowLeft, FileText, CheckCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useTranslation } from "@/contexts/translation-context";

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
  const { t } = useTranslation();

  // Extract employer ID (even if we might return early)
  const employerOrgId = rulesResult.enforcementDetails?.employerName;

  // Fetch organization name from CRM using the org ID (must call hook unconditionally)
  const crmOrganization = useQuery(
    api.crmOntology.getPublicCrmOrganizationBilling,
    employerOrgId && employerOrgId.length > 20
      ? { crmOrganizationId: employerOrgId as Id<"objects"> }
      : "skip"
  );

  // Use organization name from CRM, fallback to ID if not loaded, or empty string for type safety
  const employerName = crmOrganization?.name || employerOrgId || "";

  // Get currency from first product (calculate early for hook)
  const currency = linkedProducts.find((p) => p._id === selectedProducts[0]?.productId)?.currency || "EUR";

  // Define formatPrice hook before any conditional returns
  const formatPrice = React.useCallback((amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }, [currency]);

  // Check for enforcement after all hooks are called
  if (!rulesResult.enforceInvoice || !rulesResult.enforcementDetails) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-600">{t("ui.checkout.invoice_enforcement.errors.details_unavailable")}</p>
      </div>
    );
  }

  // Now TypeScript knows enforcementDetails exists - extract the required fields
  const { paymentTerms: confirmedPaymentTerms } = rulesResult.enforcementDetails;

  // Calculate totals
  const baseTotal = selectedProducts.reduce((sum, sp) => sum + sp.price * sp.quantity, 0);
  const formAddons = formResponses.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0);
  const subtotal = baseTotal + formAddons;
  const total = taxCalculation?.total || subtotal;

  const paymentTermsText = {
    net30: t("ui.checkout.invoice_enforcement.notice.payment_terms_net30"),
    net60: t("ui.checkout.invoice_enforcement.notice.payment_terms_net60"),
    net90: t("ui.checkout.invoice_enforcement.notice.payment_terms_net90"),
  }[confirmedPaymentTerms];

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <FileText size={24} />
          {t("ui.checkout.invoice_enforcement.headers.title")}
        </h2>
        <p className="text-gray-600">
          {t("ui.checkout.invoice_enforcement.headers.description")}
        </p>
      </div>

      {/* Enforcement Notice */}
      <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckCircle size={20} className="text-purple-600" />
          {t("ui.checkout.invoice_enforcement.notice.title")}
        </h3>
        <div className="bg-white border border-purple-200 rounded p-4 mb-3">
          <p className="text-2xl font-bold text-purple-900">{employerName}</p>
        </div>
        <div className="text-sm space-y-1">
          <p>
            <strong>{t("ui.checkout.invoice_enforcement.notice.payment_terms_label")}</strong> {paymentTermsText}
          </p>
          <p>
            <strong>{t("ui.checkout.invoice_enforcement.notice.invoice_amount_label")}</strong> {formatPrice(total)}
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">{t("ui.checkout.invoice_enforcement.workflow.section_title")}</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
              1
            </span>
            <div>
              <p className="font-semibold">{t("ui.checkout.invoice_enforcement.workflow.step1_title")}</p>
              <p className="text-gray-600">{t("ui.checkout.invoice_enforcement.workflow.step1_description")}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
              2
            </span>
            <div>
              <p className="font-semibold">{t("ui.checkout.invoice_enforcement.workflow.step2_title", { employerName })}</p>
              <p className="text-gray-600">
                {t("ui.checkout.invoice_enforcement.workflow.step2_description", { amount: formatPrice(total) })}
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">
              3
            </span>
            <div>
              <p className="font-semibold">{t("ui.checkout.invoice_enforcement.workflow.step3_title")}</p>
              <p className="text-gray-600">{t("ui.checkout.invoice_enforcement.workflow.step3_description", { days: confirmedPaymentTerms.replace("net", "") })}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
              4
            </span>
            <div>
              <p className="font-semibold">{t("ui.checkout.invoice_enforcement.workflow.step4_title")}</p>
              <p className="text-gray-600">
                {t("ui.checkout.invoice_enforcement.workflow.step4_description", { email: customerInfo.email })}
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Order Summary */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-md font-semibold mb-4">{t("ui.checkout.invoice_enforcement.order_summary.title")}</h3>

        {/* Products */}
        <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
          {selectedProducts.map((sp) => {
            const product = linkedProducts.find((p) => p._id === sp.productId);
            return (
              <div key={sp.productId} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{product?.name}</p>
                  <p className="text-xs text-gray-600">{t("ui.checkout.invoice_enforcement.order_summary.quantity_label", { quantity: sp.quantity })}</p>
                </div>
                <p className="font-medium">{formatPrice(sp.price * sp.quantity)}</p>
              </div>
            );
          })}
        </div>

        {/* Form Addons */}
        {formAddons > 0 && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-sm font-medium mb-2">{t("ui.checkout.invoice_enforcement.order_summary.addons_label")}</p>
            {formResponses
              .filter((fr) => fr.addedCosts > 0)
              .map((fr) => (
                <div key={`addon-${fr.productId}-${fr.ticketNumber}`} className="flex justify-between text-sm text-gray-700 mb-1">
                  <p>{t("ui.checkout.invoice_enforcement.order_summary.ticket_extras", { ticketNumber: fr.ticketNumber })}</p>
                  <p>{formatPrice(fr.addedCosts)}</p>
                </div>
              ))}
          </div>
        )}

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <p className="text-gray-600">{t("ui.checkout.invoice_enforcement.totals.subtotal_label")}</p>
            <p className="font-medium">{formatPrice(subtotal)}</p>
          </div>
          {taxCalculation && taxCalculation.isTaxable && taxCalculation.taxAmount > 0 && (
            <div className="flex justify-between text-sm">
              <p className="text-gray-600">
                {t("ui.checkout.invoice_enforcement.tax.label", { rate: taxCalculation.taxRate.toFixed(1) })}
                <span className="text-xs ml-1 opacity-70">
                  {taxCalculation.taxBehavior === "inclusive"
                    ? t("ui.checkout.invoice_enforcement.tax.included_label")
                    : t("ui.checkout.invoice_enforcement.tax.added_label")}
                </span>
              </p>
              <p className="font-medium">{formatPrice(taxCalculation.taxAmount)}</p>
            </div>
          )}
          <div className="flex justify-between pt-2 mt-2 border-t-2 border-gray-400">
            <p className="text-lg font-bold">{t("ui.checkout.invoice_enforcement.totals.total_amount_label")}</p>
            <p className="text-lg font-bold text-purple-600">{formatPrice(total)}</p>
          </div>
        </div>
      </div>

      {/* Acknowledgment */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
        <h3 className="text-md font-semibold mb-3">{t("ui.checkout.invoice_enforcement.acknowledgment.title")}</h3>
        <p className="text-sm mb-3">{t("ui.checkout.invoice_enforcement.acknowledgment.intro")}</p>
        <ul className="text-sm space-y-2 list-disc pl-5">
          <li dangerouslySetInnerHTML={{ __html: t("ui.checkout.invoice_enforcement.acknowledgment.item1", { amount: `<strong>${formatPrice(total)}</strong>` }) }} />
          <li dangerouslySetInnerHTML={{ __html: t("ui.checkout.invoice_enforcement.acknowledgment.item2", { employerName: `<strong>${employerName}</strong>` }) }} />
          <li dangerouslySetInnerHTML={{ __html: t("ui.checkout.invoice_enforcement.acknowledgment.item3", { days: `<strong>${confirmedPaymentTerms.replace("net", "")} days</strong>` }) }} />
          <li>{t("ui.checkout.invoice_enforcement.acknowledgment.item4")}</li>
          <li dangerouslySetInnerHTML={{ __html: t("ui.checkout.invoice_enforcement.acknowledgment.item5", { email: `<strong>${customerInfo.email}</strong>` }) }} />
          <li>{t("ui.checkout.invoice_enforcement.acknowledgment.item6")}</li>
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
          {t("ui.checkout.invoice_enforcement.buttons.back")}
        </button>

        <button
          type="button"
          onClick={onComplete}
          className="flex-1 px-6 py-3 text-base font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          {t("ui.checkout.invoice_enforcement.buttons.continue")}
        </button>
      </div>

      {/* Info Badge */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
          {t("ui.checkout.invoice_enforcement.info_badge.message", { employerName })}
        </p>
      </div>
    </div>
  );
}
