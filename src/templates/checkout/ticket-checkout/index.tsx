/**
 * TICKET CHECKOUT TEMPLATE
 *
 * Specialized checkout template for event tickets.
 * Handles ticket tiers, attendee info, and event-specific features.
 */

import React from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { Theme } from "@/templates/types";
import { CheckoutCore, useCheckout } from "../core/checkout-core";
import { CheckoutItem, CheckoutCallbacks } from "../core/types";
import { QuantitySelector } from "../components/QuantitySelector";
import styles from "./styles.module.css";

export interface TicketCheckoutProps {
  // Event information
  eventId: Id<"objects">;
  eventName: string;
  eventDate: Date;
  venue?: string;

  // Ticket options
  tickets: CheckoutItem[];
  addOns?: CheckoutItem[];

  // Configuration
  organizationId: Id<"organizations">;
  theme: Theme;
  callbacks?: CheckoutCallbacks;

  // Optional customization
  showEventInfo?: boolean;
  showVenueDetails?: boolean;
  maxTicketsPerOrder?: number;
}

/**
 * Ticket checkout content component.
 * Uses useCheckout hook to access shared checkout state.
 */
function TicketCheckoutContent({
  showEventInfo = true,
  showVenueDetails = true,
}: Pick<TicketCheckoutProps, "eventName" | "eventDate" | "venue" | "showEventInfo" | "showVenueDetails">) {
  const {
    items,
    selectedItemIndex,
    quantities,
    priceCalculation,
    theme,
    isProcessing,
    handleItemSelect,
    handleQuantityChange,
    handleCheckout,
  } = useCheckout();

  const selectedTicket = items[selectedItemIndex];

  return (
    <div className={styles.checkoutCard}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Get Your Ticket</h2>
        <p className={styles.cardSubtitle}>Early bird pricing ends soon!</p>
      </div>

      {/* Ticket Selection */}
      <div className={styles.ticketSelection}>
        <label className={styles.sectionLabel}>Select Ticket Type</label>
        <div className={styles.ticketOptions}>
          {items.map((ticket, index) => (
            <label
              key={ticket.id}
              className={`${styles.ticketOption} ${
                index === selectedItemIndex ? styles.ticketOptionSelected : ""
              }`}
            >
              <input
                type="radio"
                name="ticket"
                value={index}
                checked={index === selectedItemIndex}
                onChange={() => handleItemSelect(index)}
                className={styles.radioInput}
              />
              <div className={styles.ticketOptionContent}>
                <div className={styles.ticketOptionInfo}>
                  <div className={styles.ticketOptionName}>{ticket.name}</div>
                  <div className={styles.ticketOptionDesc}>{ticket.description}</div>
                </div>
                <div className={styles.ticketOptionPricing}>
                  <div className={styles.ticketCurrentPrice}>
                    ${ticket.price}
                  </div>
                  {ticket.originalPrice && (
                    <div className={styles.ticketOriginalPrice}>
                      ${ticket.originalPrice}
                    </div>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* What's Included */}
      {selectedTicket && selectedTicket.features && selectedTicket.features.length > 0 && (
        <div className={styles.featuresSection}>
          <label className={styles.sectionLabel}>What&apos;s Included</label>
          <ul className={styles.featuresList}>
            {selectedTicket.features.map((feature, i) => (
              <li key={i} className={styles.featureItem}>
                ✓ {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quantity Selector */}
      <div className={styles.quantitySection}>
        <label className={styles.sectionLabel}>Quantity</label>
        <QuantitySelector
          quantity={quantities[selectedItemIndex]}
          onChange={(qty) => handleQuantityChange(selectedItemIndex, qty)}
          theme={theme}
        />
      </div>

      {/* Price Summary */}
      {priceCalculation && (
        <div className={styles.priceSummary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Subtotal</span>
            <span className={styles.summaryValue}>
              ${priceCalculation.subtotal.toFixed(2)}
            </span>
          </div>
          {priceCalculation.discount > 0 && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Early Bird Savings</span>
              <span className={styles.summarySavings}>
                -${priceCalculation.discount.toFixed(2)}
              </span>
            </div>
          )}
          <div className={styles.summaryTotal}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalValue}>
              ${priceCalculation.total.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Checkout Button */}
      <button
        className={styles.checkoutButton}
        onClick={handleCheckout}
        disabled={isProcessing}
      >
        🛒 {isProcessing ? "Processing..." : "PROCEED TO CHECKOUT"}
      </button>

      {/* Security Text */}
      <p className={styles.securityText}>
        Secure checkout powered by Stripe
      </p>
    </div>
  );
}

/**
 * Main ticket checkout template component.
 */
export function TicketCheckoutTemplate(props: TicketCheckoutProps) {
  const {
    tickets,
    organizationId,
    theme,
    callbacks,
    maxTicketsPerOrder = 10,
    ...contentProps
  } = props;

  return (
    <CheckoutCore
      items={tickets}
      organizationId={organizationId}
      theme={theme}
      callbacks={callbacks}
      config={{
        showImages: false,
        showDescriptions: true,
        showFeatures: true,
        allowQuantity: true,
        maxQuantity: maxTicketsPerOrder,
        minQuantity: 1,
        layout: "sidebar",
      }}
    >
      <TicketCheckoutContent {...contentProps} />
    </CheckoutCore>
  );
}

export default TicketCheckoutTemplate;
