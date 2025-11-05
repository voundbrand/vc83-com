"use client";

/**
 * STEP 5: CONFIRMATION
 *
 * Success page showing:
 * - Order confirmation
 * - Receipt/ticket download
 * - QR code (if ticket)
 * - Email confirmation sent notice
 */

import { useState, useEffect } from "react";
import { CheckCircle, Download, Mail, Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { CheckoutStepData } from "../multi-step-checkout";
import { CheckoutProduct } from "@/templates/checkout/types";
import { Id } from "../../../../convex/_generated/dataModel";
import { getAddonsFromResults } from "@/lib/behaviors/adapters/checkout-integration";
import { useTranslation } from "@/contexts/translation-context";
import styles from "../styles/multi-step.module.css";
import { usePostHog } from "posthog-js/react";

interface ConfirmationStepProps {
  checkoutData: CheckoutStepData;
  linkedProducts: CheckoutProduct[];
  checkoutSessionId?: Id<"objects">;
}

export function ConfirmationStep({
  checkoutData,
  linkedProducts,
  checkoutSessionId,
}: ConfirmationStepProps) {
  const { t } = useTranslation();
  const posthog = usePostHog();
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [isDownloadingTicket, setIsDownloadingTicket] = useState(false);

  // Actions for PDF generation
  const generateInvoicePDF = useAction(api.pdfGeneration.generateInvoicePDF);
  const generateTicketPDF = useAction(api.pdfGeneration.generateTicketPDF);
  const getTicketIdsFromCheckout = useAction(api.pdfGeneration.getTicketIdsFromCheckout);

  // Get checkoutSessionId from either prop OR paymentResult (fallback)
  const sessionId = checkoutSessionId ||
    (checkoutData.paymentResult?.checkoutSessionId as Id<"objects"> | undefined);

  // Track purchase completion when component mounts
  useEffect(() => {
    const subtotal = (checkoutData.totalPrice || 0) + (checkoutData.formResponses?.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0) || 0);
    const taxAmount = checkoutData.taxCalculation?.taxAmount || 0;
    const totalAmount = checkoutData.taxCalculation?.total || (subtotal + taxAmount);

    posthog?.capture("purchase_completed", {
      checkout_session_id: sessionId,
      transaction_id: checkoutData.paymentResult?.transactionId,
      revenue: totalAmount / 100, // Convert cents to dollars for revenue tracking
      currency: linkedProducts[0]?.currency || "EUR",
      products: checkoutData.selectedProducts?.map(p => ({
        product_id: p.productId,
        quantity: p.quantity,
        price: p.price / 100,
      })),
      product_count: checkoutData.selectedProducts?.length || 0,
      has_addons: (checkoutData.formResponses?.length || 0) > 0,
      payment_provider: checkoutData.selectedPaymentProvider,
      transaction_type: checkoutData.customerInfo?.transactionType,
    });
  }, [checkoutData, sessionId, linkedProducts, posthog]);

  /**
   * Format price for display
   * Uses the currency from the first product (assumes all products use same currency)
   */
  const formatPrice = (amount: number) => {
    const currency = linkedProducts[0]?.currency || "EUR";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  /**
   * Download invoice/receipt PDF
   */
  const handleDownloadReceipt = async () => {
    if (!sessionId) {
      alert(t("ui.checkout.confirmation.alerts.session_not_found"));
      return;
    }

    setIsDownloadingReceipt(true);
    try {
      const pdf = await generateInvoicePDF({ checkoutSessionId: sessionId });
      if (pdf) {
        // Create download link
        const link = document.createElement("a");
        link.href = `data:${pdf.contentType};base64,${pdf.content}`;
        link.download = pdf.filename;
        link.click();

        // Track receipt download
        posthog?.capture("receipt_downloaded", {
          checkout_session_id: sessionId,
          transaction_id: checkoutData.paymentResult?.transactionId,
          filename: pdf.filename,
        });
      }
    } catch (error) {
      console.error("Failed to download receipt:", error);
      alert(t("ui.checkout.confirmation.alerts.receipt_download_failed"));
      posthog?.capture("$exception", {
        error_type: "receipt_download_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        checkout_session_id: sessionId,
      });
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  /**
   * Download ALL ticket PDFs (downloads separately or zips if multiple)
   */
  const handleDownloadTicket = async () => {
    if (!sessionId) {
      alert(t("ui.checkout.confirmation.alerts.session_not_found"));
      return;
    }

    setIsDownloadingTicket(true);
    try {
      // Fetch actual ticket IDs from purchase items
      const ticketIds = await getTicketIdsFromCheckout({ checkoutSessionId: sessionId });

      if (ticketIds.length === 0) {
        alert(t("ui.checkout.confirmation.alerts.no_tickets_found"));
        return;
      }

      // Download each ticket PDF
      for (const ticketId of ticketIds) {
        const pdf = await generateTicketPDF({
          ticketId,
          checkoutSessionId: sessionId,
        });
        if (pdf) {
          // Create download link
          const link = document.createElement("a");
          link.href = `data:${pdf.contentType};base64,${pdf.content}`;
          link.download = pdf.filename;
          link.click();

          // Small delay between downloads to prevent browser blocking
          if (ticketIds.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      // Track ticket download
      posthog?.capture("ticket_downloaded", {
        checkout_session_id: sessionId,
        transaction_id: checkoutData.paymentResult?.transactionId,
        ticket_count: ticketIds.length,
        ticket_ids: ticketIds,
      });
    } catch (error) {
      console.error("Failed to download tickets:", error);
      alert(t("ui.checkout.confirmation.alerts.tickets_download_failed"));
      posthog?.capture("$exception", {
        error_type: "ticket_download_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        checkout_session_id: sessionId,
      });
    } finally {
      setIsDownloadingTicket(false);
    }
  };

  // Extract add-ons from behavior results if available (only in behavior-driven checkout)
  const behaviorResults = (checkoutData as { behaviorResults?: unknown }).behaviorResults;
  const addonsInfo = behaviorResults && typeof behaviorResults === "object" && "results" in behaviorResults
    ? getAddonsFromResults(behaviorResults as Parameters<typeof getAddonsFromResults>[0])
    : null;
  const behaviorAddonTotal = addonsInfo?.totalAddonCost || 0;

  // Fallback to form responses if behavior results don't have add-ons
  const formAddonTotal = checkoutData.formResponses?.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0) || 0;
  const addonTotal = behaviorAddonTotal > 0 ? behaviorAddonTotal : formAddonTotal;

  // Calculate total with tax (if tax calculation exists, use it; otherwise calculate manually)
  const subtotal = (checkoutData.totalPrice || 0) + addonTotal;
  const taxAmount = checkoutData.taxCalculation?.taxAmount || 0;
  const totalAmount = checkoutData.taxCalculation?.total || (subtotal + taxAmount);

  // Check if any products are tickets
  // Check multiple possible locations for ticket indicator
  const hasTicketProducts = linkedProducts.some((p) => {
    // Check subtype field (most common)
    if (p.subtype === "ticket") return true;

    // Fallback: check if customProperties has ticket-related fields
    const customProps = p.customProperties as Record<string, unknown> | undefined;
    if (customProps && "ticketTier" in customProps) return true; // Has ticket-specific property

    return false;
  });

  // Check if this is an invoice checkout (B2B employer paying)
  // In this case, employee gets tickets but no receipt (employer gets invoice)
  const isInvoiceCheckout = checkoutData.selectedPaymentProvider === "invoice";

  // DEBUG: Log product data to understand structure
  console.log("🎫 Confirmation Step Debug:");
  console.log("- linkedProducts:", linkedProducts);
  console.log("- linkedProducts FULL:", linkedProducts.map(p => ({
    _id: p._id,
    name: p.name,
    subtype: p.subtype,
    allKeys: Object.keys(p)
  })));
  console.log("- hasTicketProducts:", hasTicketProducts);
  console.log("- purchasedItemIds:", checkoutData.paymentResult?.purchasedItemIds);
  console.log("- sessionId:", sessionId);
  console.log("- isInvoiceCheckout:", isInvoiceCheckout);
  console.log("- taxCalculation:", checkoutData.taxCalculation);
  console.log("- taxCalculation FULL:", JSON.stringify(checkoutData.taxCalculation, null, 2));

  return (
    <div className={styles.stepContainer}>
      {/* Success Header */}
      <div className={styles.confirmationHeader}>
        <div className={styles.successIcon}>
          <CheckCircle size={48} />
        </div>
        <h2 className={styles.confirmationTitle}>
          {t("ui.checkout.confirmation.headers.success_title")}
        </h2>
        <p className={styles.confirmationSubtitle}>
          {isInvoiceCheckout
            ? t("ui.checkout.confirmation.headers.subtitle_invoice")
            : hasTicketProducts
            ? t("ui.checkout.confirmation.headers.subtitle_tickets")
            : t("ui.checkout.confirmation.headers.subtitle_order")}
        </p>
      </div>

      {/* Order Details */}
      <div className={styles.orderSummary}>
        <h3 className={styles.sectionTitle}>{t("ui.checkout.confirmation.order_details.section_title")}</h3>

        {/* Transaction ID */}
        <div className={styles.summarySection}>
          <p className={styles.summaryText}>
            <strong>{t("ui.checkout.confirmation.transaction.id_label")}</strong>{" "}
            {checkoutData.paymentResult?.transactionId || t("ui.checkout.confirmation.transaction.id_not_available")}
          </p>
          <p className={styles.summaryText}>
            <strong>{t("ui.checkout.confirmation.transaction.email_label")}</strong> {checkoutData.customerInfo?.email}
          </p>
        </div>

        {/* Products */}
        <div className={styles.summarySection}>
          <p className={styles.summaryLabel}>{t("ui.checkout.confirmation.order_details.items_label")}</p>
          {checkoutData.selectedProducts?.map((sp, idx) => {
            const product = linkedProducts.find((p) => p._id === sp.productId);
            return (
              <div key={idx} className={styles.summaryItem}>
                <span>
                  {product?.name || t("ui.checkout.confirmation.order_details.product_fallback")} × {sp.quantity}
                </span>
                <span>{formatPrice(sp.price * sp.quantity)}</span>
              </div>
            );
          })}

          {/* Add-ons from behavior results (preferred) or form responses (fallback) */}
          {addonsInfo && addonsInfo.lineItems.length > 0 ? (
            <>
              {addonsInfo.lineItems.map((lineItem) => (
                <div key={lineItem.id} className={`${styles.summaryItem} italic`}>
                  <span>
                    + {lineItem.name} {lineItem.quantity > 1 && `× ${lineItem.quantity}`}
                  </span>
                  <span>{formatPrice(lineItem.totalPrice)}</span>
                </div>
              ))}
            </>
          ) : checkoutData.formResponses?.some(fr => fr.addedCosts > 0) ? (
            <>
              {checkoutData.formResponses
                .filter((fr) => fr.addedCosts > 0)
                .map((fr) => (
                  <div key={`confirmation-addon-${fr.productId}-${fr.ticketNumber}`} className={`${styles.summaryItem} italic`}>
                    <span>+ {t("ui.checkout.confirmation.order_details.ticket_addons", { ticketNumber: fr.ticketNumber })}</span>
                    <span>{formatPrice(fr.addedCosts)}</span>
                  </div>
                ))}
            </>
          ) : null}
        </div>

        {/* Subtotal and Tax Breakdown */}
        <div className={styles.summarySection}>
          {/* Subtotal */}
          <div className={styles.summaryItem}>
            <span className="text-gray-600">{t("ui.checkout.confirmation.totals.subtotal_label")}</span>
            <span>
              {formatPrice(
                checkoutData.taxCalculation?.subtotal ||
                (checkoutData.selectedProducts?.reduce((sum, sp) => sum + (sp.price * sp.quantity), 0) || 0) +
                (checkoutData.formResponses?.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0) || 0)
              )}
            </span>
          </div>

          {/* Tax Lines - Show breakdown if available */}
          {checkoutData.taxCalculation?.isTaxable && checkoutData.taxCalculation.taxAmount > 0 && (() => {
            const lineItems = checkoutData.taxCalculation.lineItems;
            if (!lineItems || lineItems.length === 0) {
              // Fallback: Show single tax line with taxRate from calculation
              // If taxRate is 0 or undefined, calculate from taxAmount/subtotal
              const effectiveTaxRate = checkoutData.taxCalculation.taxRate ||
                (checkoutData.taxCalculation.subtotal > 0
                  ? (checkoutData.taxCalculation.taxAmount / checkoutData.taxCalculation.subtotal) * 100
                  : 0);

              return (
                <div className={styles.summaryItem}>
                  <span className="text-gray-600">
                    {t("ui.checkout.confirmation.tax.label", { rate: effectiveTaxRate.toFixed(1) })}
                    <span className="text-xs ml-1 opacity-70">
                      {checkoutData.taxCalculation.taxBehavior === "inclusive"
                        ? t("ui.checkout.confirmation.tax.included_label")
                        : t("ui.checkout.confirmation.tax.added_label")}
                    </span>
                  </span>
                  <span>{formatPrice(checkoutData.taxCalculation.taxAmount)}</span>
                </div>
              );
            }

            // Group line items by tax rate to show separate lines for each tax type
            const taxGroups = lineItems.reduce((groups, item) => {
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
                <div className={styles.summaryItem}>
                  <span className="text-gray-600">
                    {t("ui.checkout.confirmation.tax.label", { rate: rateStr })}
                    <span className="text-xs ml-1 opacity-70">
                      {checkoutData.taxCalculation.taxBehavior === "inclusive"
                        ? t("ui.checkout.confirmation.tax.included_label")
                        : t("ui.checkout.confirmation.tax.added_label")}
                    </span>
                  </span>
                  <span>{formatPrice(checkoutData.taxCalculation.taxAmount)}</span>
                </div>
              );
            }

            // Multiple tax rates - show breakdown with separate lines
            return (
              <>
                {taxEntries.map(([rateStr, { amount, count }]) => (
                  <div key={rateStr} className={styles.summaryItem}>
                    <span className="text-gray-600">
                      {t("ui.checkout.confirmation.tax.label", { rate: rateStr })}
                      {count > 1 && (
                        <span className="text-xs ml-1 opacity-70">
                          {t("ui.checkout.confirmation.tax.items_count", { count })}
                        </span>
                      )}
                    </span>
                    <span>{formatPrice(amount)}</span>
                  </div>
                ))}
              </>
            );
          })()}
        </div>

        {/* Total */}
        <div className={styles.summaryTotal}>
          <span className={styles.totalLabel}>{t("ui.checkout.confirmation.totals.total_paid_label")}</span>
          <span className={styles.totalAmount}>
            {formatPrice(totalAmount)}
          </span>
        </div>
      </div>

      {/* Email Confirmation Notice */}
      <div className={styles.infoBox}>
        <Mail size={24} className={styles.infoIcon} />
        <div>
          <p className={styles.infoBoxTitle}>
            {t("ui.checkout.confirmation.email_notice.title")}
          </p>
          <p className={styles.infoBoxText}>
            {isInvoiceCheckout
              ? t("ui.checkout.confirmation.email_notice.message_invoice", { email: checkoutData.customerInfo?.email || "" })
              : hasTicketProducts
              ? t("ui.checkout.confirmation.email_notice.message_tickets", { email: checkoutData.customerInfo?.email || "" })
              : t("ui.checkout.confirmation.email_notice.message_order", { email: checkoutData.customerInfo?.email || "" })
            }
          </p>
        </div>
      </div>

      {/* Download Actions */}
      <div className={styles.downloadButtons}>
        {/* Hide receipt button for invoice checkout (employer pays, not customer) */}
        {!isInvoiceCheckout && (
          <button
            type="button"
            onClick={handleDownloadReceipt}
            disabled={isDownloadingReceipt}
            className={styles.secondaryButton}
          >
            {isDownloadingReceipt ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Download size={20} />
            )}
            {isDownloadingReceipt
              ? t("ui.checkout.confirmation.downloads.receipt_downloading")
              : t("ui.checkout.confirmation.downloads.receipt_button")}
          </button>
        )}

        {hasTicketProducts && (
          <button
            type="button"
            onClick={handleDownloadTicket}
            disabled={isDownloadingTicket}
            className={styles.primaryButton}
          >
            {isDownloadingTicket ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Download size={20} />
            )}
            {isDownloadingTicket
              ? t("ui.checkout.confirmation.downloads.receipt_downloading")
              : (checkoutData.paymentResult?.purchasedItemIds?.length || 0) > 1
                ? t("ui.checkout.confirmation.downloads.tickets_button")
                : t("ui.checkout.confirmation.downloads.ticket_button")
            }
          </button>
        )}
      </div>

      {/* Support Info */}
      <div className={styles.supportInfo}>
        <p>
          {t("ui.checkout.confirmation.support.contact_text")}{" "}
          <a
            href={`mailto:${t("ui.checkout.confirmation.support.email")}`}
            className={styles.link}
          >
            {t("ui.checkout.confirmation.support.email")}
          </a>
        </p>
      </div>
    </div>
  );
}
