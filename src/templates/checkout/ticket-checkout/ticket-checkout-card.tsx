/**
 * TICKET CHECKOUT CARD - Simplified Component
 *
 * Flattened component structure without CheckoutCore wrapper.
 * Renders directly as a card for sticky sidebar usage.
 */

"use client";

import React, { useState, useMemo } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { Theme } from "@/templates/types";
import { CheckoutItem } from "../core/types";
import { QuantitySelector } from "../components/QuantitySelector";
import styles from "./styles.module.css";

export interface TicketCheckoutCardProps {
  // Event information
  eventId: Id<"objects">;
  eventName: string;
  eventDate: Date;
  venue?: string;

  // Ticket options
  tickets: CheckoutItem[];

  // Configuration
  organizationId: Id<"organizations">;
  theme: Theme;

  // Callbacks
  onCheckout?: (ticketId: Id<"objects">, quantity: number) => void;

  // Optional customization
  maxTicketsPerOrder?: number;
}

export function TicketCheckoutCard({
  tickets,
  theme,
  maxTicketsPerOrder = 10,
}: TicketCheckoutCardProps) {
  // Track quantities for each ticket type
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Calculate line items for tickets with quantity > 0
  const lineItems = useMemo(() => {
    return tickets
      .filter(ticket => (quantities[ticket.id] || 0) > 0)
      .map(ticket => ({
        ticket,
        quantity: quantities[ticket.id] || 0,
        subtotal: ticket.price * (quantities[ticket.id] || 0),
        savings: ticket.originalPrice
          ? (ticket.originalPrice - ticket.price) * (quantities[ticket.id] || 0)
          : 0,
      }));
  }, [tickets, quantities]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [lineItems]);

  const savings = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.savings, 0);
  }, [lineItems]);

  const total = subtotal;

  const currency = tickets[0]?.currency || 'USD';

  const handleCheckout = React.useCallback(() => {
    if (lineItems.length === 0) return;

    // For now, redirect to first ticket's checkout URL with quantities as query params
    const firstItem = lineItems[0];
    const checkoutUrl = firstItem.ticket.customProperties?.checkoutUrl as string;
    if (checkoutUrl) {
      // TODO: Pass multiple ticket quantities to checkout
      window.location.href = checkoutUrl;
    }
  }, [lineItems]);

  if (tickets.length === 0) {
    return null;
  }

  return (
    <div className={styles.checkoutCard}>
      {/* Ticket Selection with Quantities */}
      <div className={styles.ticketSelection}>
        <label className={styles.sectionLabel}>Select Tickets</label>
        <div className={styles.ticketOptions}>
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`${styles.ticketOption} ${
                (quantities[ticket.id] || 0) > 0 ? styles.ticketOptionSelected : ""
              }`}
            >
              <div className={styles.ticketOptionContent}>
                <div className={styles.ticketOptionInfo}>
                  <div className={styles.ticketOptionName}>{ticket.name}</div>
                  <div className={styles.ticketOptionDesc}>{ticket.description}</div>
                  <div className={styles.ticketOptionPricing}>
                    <div className={styles.ticketCurrentPrice}>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: ticket.currency || 'USD',
                      }).format(ticket.price)}
                    </div>
                    {ticket.originalPrice && (
                      <div className={styles.ticketOriginalPrice}>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: ticket.currency || 'USD',
                        }).format(ticket.originalPrice)}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.ticketQuantityControl}>
                  <QuantitySelector
                    quantity={quantities[ticket.id] || 0}
                    onChange={(newQty) => setQuantities(prev => ({ ...prev, [ticket.id]: newQty }))}
                    theme={theme}
                    min={0}
                    max={maxTicketsPerOrder}
                    size="small"
                    variant="stacked"
                    label=""
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Summary with Line Items */}
      {lineItems.length > 0 && (
        <div className={styles.priceSummary}>
          {/* Line Items */}
          {lineItems.map((item) => (
            <div key={item.ticket.id} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                {item.ticket.name} × {item.quantity}
              </span>
              <span className={styles.summaryValue}>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currency,
                }).format(item.subtotal)}
              </span>
            </div>
          ))}

          {/* Savings */}
          {savings > 0 && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Early Bird Savings</span>
              <span className={styles.summarySavings}>
                -{new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currency,
                }).format(savings)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className={styles.summaryTotal}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalValue}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
              }).format(total)}
            </span>
          </div>
        </div>
      )}

      {/* Checkout Button */}
      <button
        className={styles.checkoutButton}
        onClick={handleCheckout}
        disabled={lineItems.length === 0}
      >
        🛒 PROCEED TO CHECKOUT
      </button>

      {/* Security Text */}
      <p className={styles.securityText}>
        Secure checkout powered by Stripe
      </p>
    </div>
  );
}
