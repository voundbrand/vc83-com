"use client";

/**
 * STEP 6: CONFIRMATION (Success Page)
 *
 * Show order confirmation and display behavior results.
 */

import { StepProps } from "../types";
import { CheckCircle, Mail, Download, Loader2 } from "lucide-react";
import { getInvoiceMappingFromResults, getAddonsFromResults } from "@/lib/behaviors/adapters/checkout-integration";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { useTranslation } from "@/contexts/translation-context";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

export function ConfirmationStep({ checkoutData, products }: StepProps) {
  const { locale } = useTranslation(); // For locale management only
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.checkout_template.behavior_driven");
  const [isDownloadingTickets, setIsDownloadingTickets] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  const selectedProducts = checkoutData.selectedProducts || [];
  const behaviorResults = checkoutData.behaviorResults;
  const invoiceInfo = behaviorResults ? getInvoiceMappingFromResults(behaviorResults) : null;
  const isInvoiceCheckout = invoiceInfo?.shouldInvoice || false;

  // PDF generation actions
  const generateTicketPDF = useAction(api.pdfGeneration.generateTicketPDF);
  const getTicketIdsFromCheckout = useAction(api.pdfGeneration.getTicketIdsFromCheckout);
  const generateInvoicePDF = useAction(api.pdfGeneration.generateInvoicePDF);

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

  // Download tickets handler
  const handleDownloadTickets = async () => {
    const checkoutSessionId = checkoutData.paymentResult?.checkoutSessionId;
    if (!checkoutSessionId) {
      alert("Checkout session not found. Please refresh the page.");
      return;
    }

    setIsDownloadingTickets(true);
    try {
      const ticketIds = await getTicketIdsFromCheckout({ checkoutSessionId: checkoutSessionId as Id<"objects"> });

      if (ticketIds.length === 0) {
        alert("No tickets found. Please contact support.");
        return;
      }

      for (const ticketId of ticketIds) {
        const pdf = await generateTicketPDF({
          ticketId,
          checkoutSessionId: checkoutSessionId as Id<"objects">,
        });
        if (pdf) {
          const link = document.createElement("a");
          link.href = `data:${pdf.contentType};base64,${pdf.content}`;
          link.download = pdf.filename;
          link.click();

          // Add small delay between downloads if multiple tickets
          if (ticketIds.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }
    } catch (error) {
      console.error("Failed to download tickets:", error);
      alert("Failed to download tickets. Please try again.");
    } finally {
      setIsDownloadingTickets(false);
    }
  };

  // Download invoice/receipt handler
  const handleDownloadReceipt = async () => {
    const checkoutSessionId = checkoutData.paymentResult?.checkoutSessionId;
    if (!checkoutSessionId) {
      alert("Checkout session not found. Please refresh the page.");
      return;
    }

    setIsDownloadingReceipt(true);
    try {
      // Generate invoice PDF (works for both B2C receipts and B2B invoices)
      const pdf = await generateInvoicePDF({
        checkoutSessionId: checkoutSessionId as Id<"objects">,
      });

      if (pdf) {
        const link = document.createElement("a");
        link.href = `data:${pdf.contentType};base64,${pdf.content}`;
        link.download = pdf.filename;
        link.click();
      } else {
        alert("Invoice PDF not available. Please check your email or contact support.");
      }
    } catch (error) {
      console.error("Failed to download invoice/receipt:", error);
      alert("Failed to download invoice/receipt. Please try again or check your email.");
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Success Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
          <CheckCircle size={64} className="text-green-600" />
        </div>
        <h2 className="text-4xl font-bold mb-3">
          {isInvoiceCheckout
            ? t('ui.checkout_template.behavior_driven.confirmation.headers.title_invoice')
            : t('ui.checkout_template.behavior_driven.confirmation.headers.title')}
        </h2>
        <p className="text-xl text-gray-600">
          {isInvoiceCheckout
            ? t('ui.checkout_template.behavior_driven.confirmation.headers.subtitle_invoice')
            : t('ui.checkout_template.behavior_driven.confirmation.headers.subtitle')}
        </p>
      </div>

      {/* Invoice Notice */}
      {isInvoiceCheckout && invoiceInfo && (
        <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">{t('ui.checkout_template.behavior_driven.confirmation.invoice.title')}</h3>
          <div className="text-blue-900 space-y-2 text-sm">
            <p>
              <strong>{t('ui.checkout_template.behavior_driven.confirmation.invoice.employer')}</strong> {employerName}
            </p>
            <p>
              <strong>{t('ui.checkout_template.behavior_driven.confirmation.invoice.payment_terms')}</strong> {t('ui.checkout_template.behavior_driven.confirmation.invoice.net_days', { days: invoiceInfo.paymentTerms?.replace("net", "") || "30" })}
            </p>
            <p className="mt-3 pt-3 border-t border-blue-300 italic">
              {t('ui.checkout_template.behavior_driven.confirmation.invoice.notice')}
              <br />
              {t('ui.checkout_template.behavior_driven.confirmation.invoice.tickets_confirmed')}
            </p>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">{t('ui.checkout_template.behavior_driven.confirmation.sections.order_summary')}</h3>

        {/* Transaction ID */}
        <div className="mb-4 pb-4 border-b border-gray-300">
          <p className="text-sm">
            <strong>{t('ui.checkout_template.behavior_driven.confirmation.labels.transaction_id')}</strong> {checkoutData.paymentResult?.transactionId || t('ui.checkout_template.behavior_driven.confirmation.labels.pending')}
          </p>
          <p className="text-sm">
            <strong>{t('ui.checkout_template.behavior_driven.confirmation.labels.email')}</strong> {checkoutData.customerInfo?.email}
          </p>
        </div>

        {/* Products */}
        <div className="space-y-2 mb-4 pb-4 border-b border-gray-300">
          {selectedProducts.map((sp) => {
            const product = products.find((p) => p._id === sp.productId);
            return (
              <div key={sp.productId} className="flex justify-between text-sm">
                <span>
                  {product?.name} × {sp.quantity}
                </span>
                <span className="font-medium">{formatPrice(sp.price * sp.quantity, currency)}</span>
              </div>
            );
          })}

          {/* Add-ons from behavior system */}
          {addonsInfo && addonsInfo.lineItems.map((addon) => (
            <div key={addon.id} className="flex justify-between text-purple-700 text-sm">
              <span>{addon.icon} {addon.name} × {addon.quantity}</span>
              <span className="font-medium">{formatPrice(addon.totalPrice, currency)}</span>
            </div>
          ))}
        </div>

        {/* Totals with Tax Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-700">
            <span>{t('ui.checkout_template.behavior_driven.confirmation.labels.subtotal')}</span>
            <span className="font-medium">{formatPrice(subtotal, currency)}</span>
          </div>

          {taxCalculation && taxCalculation.isTaxable && taxCalculation.taxAmount > 0 && (() => {
            // Calculate effective tax rate from actual amounts
            const effectiveTaxRate = taxCalculation.subtotal > 0
              ? (taxCalculation.taxAmount / taxCalculation.subtotal) * 100
              : 0;

            return (
              <div className="flex justify-between text-sm text-gray-700">
                <span>{t('ui.checkout_template.behavior_driven.confirmation.labels.tax')} ({effectiveTaxRate.toFixed(1)}%):</span>
                <span className="font-medium">{formatPrice(taxCalculation.taxAmount, currency)}</span>
              </div>
            );
          })()}

          <div className="flex justify-between pt-3 mt-3 border-t-2 border-gray-400">
            <span className="text-lg font-bold">{t('ui.checkout_template.behavior_driven.confirmation.labels.total')}</span>
            <span className="text-lg font-bold text-purple-600">{formatPrice(total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Email Confirmation */}
      <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <Mail size={32} className="text-purple-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold mb-2">{t('ui.checkout_template.behavior_driven.confirmation.email.title')}</h3>
            <p className="text-sm text-gray-700">
              {isInvoiceCheckout
                ? t('ui.checkout_template.behavior_driven.confirmation.email.sent_invoice', { email: checkoutData.customerInfo?.email || '' })
                : t('ui.checkout_template.behavior_driven.confirmation.email.sent_payment', { email: checkoutData.customerInfo?.email || '' })}
            </p>
            {checkoutData.formResponses && checkoutData.formResponses.length > 1 && (
              <p className="text-sm text-gray-700 mt-2">
                {t('ui.checkout_template.behavior_driven.confirmation.email.multiple_tickets')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Download Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          type="button"
          onClick={handleDownloadTickets}
          disabled={isDownloadingTickets}
          className="px-6 py-3 border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloadingTickets ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              {t('ui.checkout_template.behavior_driven.confirmation.downloads.downloading')}
            </>
          ) : (
            <>
              <Download size={20} />
              {t('ui.checkout_template.behavior_driven.confirmation.downloads.download_tickets')}
            </>
          )}
        </button>

        {!isInvoiceCheckout && (
          <button
            type="button"
            onClick={handleDownloadReceipt}
            disabled={isDownloadingReceipt}
            className="px-6 py-3 border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloadingReceipt ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {t('ui.checkout_template.behavior_driven.confirmation.downloads.downloading')}
              </>
            ) : (
              <>
                <Download size={20} />
                {t('ui.checkout_template.behavior_driven.confirmation.downloads.download_receipt')}
              </>
            )}
          </button>
        )}
      </div>

      {/* Behavior Results Summary - Hidden in production */}

      {/* Support Info */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          {t('ui.checkout_template.behavior_driven.confirmation.support.text')}{" "}
          <a href="mailto:support@example.com" className="text-purple-600 hover:underline">
            support@example.com
          </a>
        </p>
      </div>
    </div>
  );
}
