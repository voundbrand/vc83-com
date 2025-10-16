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

import { CheckCircle, Download, Mail } from "lucide-react";
import { CheckoutStepData } from "../multi-step-checkout";
import { CheckoutProduct } from "@/templates/checkout/types";
import styles from "../styles/multi-step.module.css";

interface ConfirmationStepProps {
  checkoutData: CheckoutStepData;
  linkedProducts: CheckoutProduct[];
}

export function ConfirmationStep({
  checkoutData,
  linkedProducts,
}: ConfirmationStepProps) {
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

  const totalAmount =
    (checkoutData.totalPrice || 0) +
    (checkoutData.formResponses?.reduce((sum, fr) => sum + (fr.addedCosts || 0), 0) || 0);

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
          Your order has been confirmed.
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
            We&apos;ve sent a confirmation email with your receipt and ticket to{" "}
            <strong>{checkoutData.customerInfo?.email}</strong>
          </p>
        </div>
      </div>

      {/* Download Actions */}
      <div className={styles.downloadButtons}>
        <button
          type="button"
          onClick={() => {
            // TODO: Implement receipt download
            console.log("Download receipt");
          }}
          className={styles.secondaryButton}
        >
          <Download size={20} />
          Download Receipt
        </button>

        <button
          type="button"
          onClick={() => {
            // TODO: Implement ticket download
            console.log("Download ticket");
          }}
          className={styles.primaryButton}
        >
          <Download size={20} />
          Download Ticket
        </button>
      </div>

      {/* QR Code Placeholder */}
      <div className={styles.qrSection}>
        <div className={styles.qrContainer}>
          <div className={styles.qrPlaceholder}>
            <p>[QR Code]</p>
          </div>
          <p className={styles.qrText}>
            Scan this code at the event entrance
          </p>
        </div>
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
