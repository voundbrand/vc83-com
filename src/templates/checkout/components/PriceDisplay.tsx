/**
 * PRICE DISPLAY COMPONENT
 *
 * Reusable component for displaying prices with formatting,
 * currency, discounts, and savings.
 */

import React from "react";
import { formatCurrency } from "../core/utils";
import { Theme } from "@/templates/types";

export interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  locale?: string;
  label?: string;
  showSavings?: boolean;
  savingsLabel?: string;
  size?: "small" | "medium" | "large";
  theme?: Theme;
  className?: string;
}

/**
 * Display a price with optional original price and savings.
 */
export function PriceDisplay({
  price,
  originalPrice,
  currency = "USD",
  locale = "en-US",
  label,
  showSavings = true,
  savingsLabel = "Save",
  size = "medium",
  theme,
  className,
}: PriceDisplayProps) {
  const hasDiscount = originalPrice && originalPrice > price;
  const savings = hasDiscount ? originalPrice - price : 0;
  const savingsPercent = hasDiscount
    ? Math.round((savings / originalPrice) * 100)
    : 0;

  // Size styles
  const sizeStyles = {
    small: { fontSize: "0.875rem", lineHeight: "1.25rem" },
    medium: { fontSize: "1rem", lineHeight: "1.5rem" },
    large: { fontSize: "1.25rem", lineHeight: "1.75rem" },
  };

  const currentStyle = sizeStyles[size];

  // Theme-based colors
  const colors = theme
    ? {
        price: theme.colors.text,
        originalPrice: theme.colors.textLight,
        savings: theme.colors.success,
        label: theme.colors.textLight,
      }
    : {
        price: "#111827",
        originalPrice: "#6B7280",
        savings: "#10B981",
        label: "#6B7280",
      };

  return (
    <div className={className}>
      {label && (
        <span
          style={{
            fontSize: "0.75rem",
            color: colors.label,
            display: "block",
            marginBottom: "0.25rem",
          }}
        >
          {label}
        </span>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
        {/* Current Price */}
        <span
          style={{
            ...currentStyle,
            color: colors.price,
            fontWeight: 600,
          }}
        >
          {formatCurrency(price, currency, locale)}
        </span>

        {/* Original Price (strikethrough) */}
        {hasDiscount && (
          <span
            style={{
              fontSize: `calc(${currentStyle.fontSize} * 0.85)`,
              color: colors.originalPrice,
              textDecoration: "line-through",
            }}
          >
            {formatCurrency(originalPrice, currency, locale)}
          </span>
        )}

        {/* Savings Badge */}
        {hasDiscount && showSavings && (
          <span
            style={{
              fontSize: "0.75rem",
              color: colors.savings,
              backgroundColor: `${colors.savings}15`,
              padding: "0.125rem 0.375rem",
              borderRadius: "0.25rem",
              fontWeight: 500,
            }}
          >
            {savingsLabel} {savingsPercent}%
          </span>
        )}
      </div>

      {/* Total Savings Amount */}
      {hasDiscount && showSavings && savings > 0 && (
        <div
          style={{
            fontSize: "0.75rem",
            color: colors.savings,
            marginTop: "0.25rem",
          }}
        >
          You save {formatCurrency(savings, currency, locale)}
        </div>
      )}
    </div>
  );
}

/**
 * Display a price range (for variable pricing).
 */
export interface PriceRangeDisplayProps {
  minPrice: number;
  maxPrice: number;
  currency?: string;
  locale?: string;
  label?: string;
  theme?: Theme;
  className?: string;
}

export function PriceRangeDisplay({
  minPrice,
  maxPrice,
  currency = "USD",
  locale = "en-US",
  label = "Starting from",
  theme,
  className,
}: PriceRangeDisplayProps) {
  const colors = theme
    ? {
        text: theme.colors.text,
        label: theme.colors.textLight,
      }
    : {
        text: "#111827",
        label: "#6B7280",
      };

  return (
    <div className={className}>
      {label && (
        <span
          style={{
            fontSize: "0.75rem",
            color: colors.label,
            display: "block",
            marginBottom: "0.25rem",
          }}
        >
          {label}
        </span>
      )}

      <span style={{ color: colors.text, fontWeight: 600 }}>
        {formatCurrency(minPrice, currency, locale)}
        {minPrice !== maxPrice && (
          <>
            {" - "}
            {formatCurrency(maxPrice, currency, locale)}
          </>
        )}
      </span>
    </div>
  );
}