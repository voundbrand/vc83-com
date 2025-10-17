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

import { useState } from "react";
import { CheckCircle, Download, Mail, Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { CheckoutStepData } from "../multi-step-checkout";
import { CheckoutProduct } from "@/templates/checkout/types";
import { Id } from "../../../../convex/_generated/dataModel";
import styles from "../styles/multi-step.module.css";

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
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [isDownloadingTicket, setIsDownloadingTicket] = useState(false);

  // Actions for PDF generation
  const generateInvoicePDF = useAction(api.pdfGeneration.generateInvoicePDF);
  const generateTicketPDF = useAction(api.pdfGeneration.generateTicketPDF);
  const getTicketIdsFromCheckout = useAction(api.pdfGeneration.getTicketIdsFromCheckout);

  // Get checkoutSessionId from either prop OR paymentResult (fallback)
  const sessionId = checkoutSessionId ||
    (checkoutData.paymentResult?.checkoutSessionId as Id<"objects"> | undefined);

  /**
   * Format price for display
   * Uses the currency from the first product (assumes all products use same currency)
   */
  const formatPrice = (amount: number) => {
    const currency = linkedProducts[0]?.currency || "USD";
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
      alert("Checkout session not found. Please refresh the page.");
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
      }
    } catch (error) {
      console.error("Failed to download receipt:", error);
      alert("Failed to download receipt. Please try again.");
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  /**
   * Download ALL ticket PDFs (downloads separately or zips if multiple)
   */
  const handleDownloadTicket = async () => {
    if (!sessionId) {
      alert("Checkout session not found. Please refresh the page.");
      return;
    }

    setIsDownloadingTicket(true);
    try {
      // Fetch actual ticket IDs from purchase items
      const ticketIds = await getTicketIdsFromCheckout({ checkoutSessionId: sessionId });

      if (ticketIds.length === 0) {
        alert("No tickets found. Please contact support.");
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
    } catch (error) {
      console.error("Failed to download tickets:", error);
      alert("Failed to download tickets. Please try again.");
    } finally {
      setIsDownloadingTicket(false);
    }
  };

  const totalAmount =
    (checkoutData.totalPrice || 0) +
    (checkoutData.formResponses?.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0) || 0);

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

  return (
    <div className={styles.stepContainer}>
      {/* Success Header */}
      <div className={styles.confirmationHeader}>
        <div className={styles.successIcon}>
          <CheckCircle size={48} />
        </div>
        <h2 className={styles.confirmationTitle}>
          Payment Successful!
        </h2>
        <p className={styles.confirmationSubtitle}>
          {hasTicketProducts
            ? "Your tickets have been sent to your email with QR codes."
            : "Your order has been confirmed."}
        </p>
      </div>

      {/* Order Details */}
      <div className={styles.orderSummary}>
        <h3 className={styles.sectionTitle}>Order Details</h3>

        {/* Transaction ID */}
        <div className={styles.summarySection}>
          <p className={styles.summaryText}>
            <strong>Transaction ID:</strong>{" "}
            {checkoutData.paymentResult?.transactionId || "N/A"}
          </p>
          <p className={styles.summaryText}>
            <strong>Email:</strong> {checkoutData.customerInfo?.email}
          </p>
        </div>

        {/* Products */}
        <div className={styles.summarySection}>
          <p className={styles.summaryLabel}>Items Purchased:</p>
          {checkoutData.selectedProducts?.map((sp, idx) => {
            const product = linkedProducts.find((p) => p._id === sp.productId);
            return (
              <div key={idx} className={styles.summaryItem}>
                <span>
                  {product?.name || "Product"} × {sp.quantity}
                </span>
                <span>{formatPrice(sp.price * sp.quantity)}</span>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className={styles.summaryTotal}>
          <span className={styles.totalLabel}>Total Paid:</span>
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
            Confirmation Email Sent
          </p>
          <p className={styles.infoBoxText}>
            {hasTicketProducts ? (
              <>
                We&apos;ve sent your tickets (with QR codes) and receipt to{" "}
                <strong>{checkoutData.customerInfo?.email}</strong>
              </>
            ) : (
              <>
                We&apos;ve sent a confirmation email with your receipt to{" "}
                <strong>{checkoutData.customerInfo?.email}</strong>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Download Actions */}
      <div className={styles.downloadButtons}>
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
          {isDownloadingReceipt ? "Downloading..." : "Download Receipt"}
        </button>

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
              ? "Downloading..."
              : `Download Ticket${(checkoutData.paymentResult?.purchasedItemIds?.length || 0) > 1 ? 's' : ''}`
            }
          </button>
        )}
      </div>

      {/* Support Info */}
      <div className={styles.supportInfo}>
        <p>
          Questions? Contact us at{" "}
          <a
            href="mailto:support@example.com"
            className={styles.link}
          >
            support@example.com
          </a>
        </p>
      </div>
    </div>
  );
}
