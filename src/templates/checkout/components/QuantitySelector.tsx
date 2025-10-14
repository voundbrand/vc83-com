/**
 * QUANTITY SELECTOR COMPONENT
 *
 * Reusable component for selecting quantity with increment/decrement controls.
 */

import React from "react";
import { Minus, Plus } from "lucide-react";
import { Theme } from "@/templates/types";

export interface QuantitySelectorProps {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
  theme?: Theme;
  size?: "small" | "medium" | "large";
  variant?: "inline" | "stacked";
  className?: string;
}

/**
 * Quantity selector with increment/decrement buttons.
 */
export function QuantitySelector({
  quantity,
  onChange,
  min = 1,
  max = 99,
  label = "Quantity",
  disabled = false,
  theme,
  size = "medium",
  variant = "inline",
  className,
}: QuantitySelectorProps) {
  const handleIncrement = () => {
    if (quantity < max) {
      onChange(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > min) {
      onChange(quantity - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= min && value <= max) {
      onChange(value);
    }
  };

  // Size configurations
  const sizeConfig = {
    small: {
      buttonSize: "1.75rem",
      inputWidth: "3rem",
      fontSize: "0.875rem",
      iconSize: 14,
    },
    medium: {
      buttonSize: "2.25rem",
      inputWidth: "4rem",
      fontSize: "1rem",
      iconSize: 16,
    },
    large: {
      buttonSize: "2.75rem",
      inputWidth: "5rem",
      fontSize: "1.125rem",
      iconSize: 20,
    },
  };

  const config = sizeConfig[size];

  // Theme colors
  const colors = theme
    ? {
        border: theme.colors.border,
        text: theme.colors.text,
        label: theme.colors.textLight,
        buttonBg: theme.colors.surface,
        buttonHover: theme.colors.primary,
        buttonDisabled: theme.colors.border,
        inputBg: theme.colors.background,
      }
    : {
        border: "#E5E7EB",
        text: "#111827",
        label: "#6B7280",
        buttonBg: "#F9FAFB",
        buttonHover: "#6B46C1",
        buttonDisabled: "#E5E7EB",
        inputBg: "#FFFFFF",
      };

  const buttonStyle: React.CSSProperties = {
    width: config.buttonSize,
    height: config.buttonSize,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.buttonBg,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.2s",
    borderRadius: "0.25rem",
  };

  const inputStyle: React.CSSProperties = {
    width: config.inputWidth,
    height: config.buttonSize,
    textAlign: "center",
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.inputBg,
    fontSize: config.fontSize,
    color: colors.text,
    borderRadius: "0.25rem",
  };

  if (variant === "stacked") {
    return (
      <div className={className}>
        {label && (
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontSize: "0.875rem",
              color: colors.label,
              fontWeight: 500,
            }}
          >
            {label}
          </label>
        )}
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || quantity <= min}
            style={buttonStyle}
            aria-label="Decrease quantity"
          >
            <Minus size={config.iconSize} />
          </button>

          <input
            type="number"
            value={quantity}
            onChange={handleInputChange}
            disabled={disabled}
            min={min}
            max={max}
            style={inputStyle}
            aria-label="Quantity"
          />

          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || quantity >= max}
            style={buttonStyle}
            aria-label="Increase quantity"
          >
            <Plus size={config.iconSize} />
          </button>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      {label && (
        <label
          style={{
            fontSize: "0.875rem",
            color: colors.label,
            fontWeight: 500,
          }}
        >
          {label}
        </label>
      )}

      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || quantity <= min}
          style={buttonStyle}
          aria-label="Decrease quantity"
        >
          <Minus size={config.iconSize} />
        </button>

        <input
          type="number"
          value={quantity}
          onChange={handleInputChange}
          disabled={disabled}
          min={min}
          max={max}
          style={inputStyle}
          aria-label="Quantity"
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || quantity >= max}
          style={buttonStyle}
          aria-label="Increase quantity"
        >
          <Plus size={config.iconSize} />
        </button>
      </div>
    </div>
  );
}

/**
 * Bulk quantity selector for group bookings.
 */
export interface BulkQuantitySelectorProps {
  quantities: { label: string; value: number; max?: number }[];
  onChange: (index: number, quantity: number) => void;
  theme?: Theme;
  className?: string;
}

export function BulkQuantitySelector({
  quantities,
  onChange,
  theme,
  className,
}: BulkQuantitySelectorProps) {
  return (
    <div className={className}>
      {quantities.map((item, index) => (
        <QuantitySelector
          key={index}
          quantity={item.value}
          onChange={(q) => onChange(index, q)}
          max={item.max}
          label={item.label}
          theme={theme}
          size="small"
          variant="inline"
        />
      ))}
    </div>
  );
}