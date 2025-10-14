/**
 * CHECKOUT SUMMARY COMPONENT
 *
 * Displays the checkout price breakdown including subtotal, discounts,
 * taxes, shipping, and total.
 */

import React from "react";
import { formatCurrency } from "../core/utils";
import { PriceCalculation } from "../core/types";
import { Theme } from "@/templates/types";

export interface CheckoutSummaryProps {
  calculation: PriceCalculation;
  locale?: string;
  showBreakdown?: boolean;
  theme?: Theme;
  className?: string;
}

/**
 * Display checkout price summary.
 */
export function CheckoutSummary({
  calculation,
  locale = "en-US",
  showBreakdown = true,
  theme,
  className,
}: CheckoutSummaryProps) {
  const colors = theme
    ? {
        text: theme.colors.text,
        label: theme.colors.textLight,
        discount: theme.colors.success,
        total: theme.colors.textDark,
        border: theme.colors.border,
      }
    : {
        text: "#111827",
        label: "#6B7280",
        discount: "#10B981",
        total: "#111827",
        border: "#E5E7EB",
      };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    color: colors.label,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    color: colors.text,
    fontWeight: 500,
  };

  const totalRowStyle: React.CSSProperties = {
    ...rowStyle,
    borderTop: `1px solid ${colors.border}`,
    marginTop: "0.5rem",
    paddingTop: "0.75rem",
  };

  const totalLabelStyle: React.CSSProperties = {
    fontSize: "1rem",
    color: colors.total,
    fontWeight: 600,
  };

  const totalValueStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    color: colors.total,
    fontWeight: 700,
  };

  return (
    <div className={className}>
      {showBreakdown && (
        <>
          {/* Subtotal */}
          <div style={rowStyle}>
            <span style={labelStyle}>Subtotal</span>
            <span style={valueStyle}>
              {formatCurrency(calculation.subtotal, calculation.currency, locale)}
            </span>
          </div>

          {/* Discount */}
          {calculation.discount > 0 && (
            <div style={rowStyle}>
              <span style={labelStyle}>Discount</span>
              <span style={{ ...valueStyle, color: colors.discount }}>
                -{formatCurrency(calculation.discount, calculation.currency, locale)}
              </span>
            </div>
          )}

          {/* Tax */}
          {calculation.tax > 0 && (
            <div style={rowStyle}>
              <span style={labelStyle}>Tax</span>
              <span style={valueStyle}>
                {formatCurrency(calculation.tax, calculation.currency, locale)}
              </span>
            </div>
          )}

          {/* Shipping */}
          {calculation.shipping > 0 && (
            <div style={rowStyle}>
              <span style={labelStyle}>Shipping</span>
              <span style={valueStyle}>
                {formatCurrency(calculation.shipping, calculation.currency, locale)}
              </span>
            </div>
          )}
        </>
      )}

      {/* Total */}
      <div style={totalRowStyle}>
        <span style={totalLabelStyle}>Total</span>
        <span style={totalValueStyle}>
          {formatCurrency(calculation.total, calculation.currency, locale)}
        </span>
      </div>
    </div>
  );
}

/**
 * Mini summary for compact displays.
 */
export interface CheckoutSummaryMiniProps {
  subtotal: number;
  total: number;
  currency?: string;
  locale?: string;
  savings?: number;
  theme?: Theme;
  className?: string;
}

export function CheckoutSummaryMini({
  subtotal,
  total,
  currency = "USD",
  locale = "en-US",
  savings = 0,
  theme,
  className,
}: CheckoutSummaryMiniProps) {
  const colors = theme
    ? {
        text: theme.colors.text,
        savings: theme.colors.success,
      }
    : {
        text: "#111827",
        savings: "#10B981",
      };

  const hasSavings = savings > 0;

  return (
    <div className={className}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {formatCurrency(total, currency, locale)}
        </span>

        {hasSavings && (
          <>
            <span
              style={{
                fontSize: "0.875rem",
                color: colors.text,
                textDecoration: "line-through",
                opacity: 0.6,
              }}
            >
              {formatCurrency(subtotal, currency, locale)}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: colors.savings,
                fontWeight: 500,
              }}
            >
              Save {formatCurrency(savings, currency, locale)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}