"use client";

/**
 * STEP 3: PAYMENT METHOD SELECTION (CONDITIONAL)
 *
 * Only shown if multiple payment providers are available.
 * Allows customer to choose preferred payment method.
 */

import { useState } from "react";
import { CreditCard, ArrowLeft } from "lucide-react";
import styles from "../styles/multi-step.module.css";

interface PaymentMethodStepProps {
  paymentProviders: string[];
  initialSelection?: string;
  currency?: string; // Product currency (e.g., "USD", "EUR")
  totalAmount?: number; // Total amount in cents for display
  onComplete: (provider: string) => void;
  onBack: () => void;
}

export function PaymentMethodStep({
  paymentProviders,
  initialSelection,
  currency = "EUR", // Changed from USD to EUR to match organization's currency
  totalAmount = 0,
  onComplete,
  onBack,
}: PaymentMethodStepProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(
    initialSelection || null
  );

  /**
   * Check if provider supports this currency
   */
  const supportsCurrency = (providerCode: string, curr: string): boolean => {
    switch (providerCode) {
      case "stripe-connect":
      case "stripe":
        // Stripe supports 135+ currencies
        return true;

      case "invoice":
        // Invoice supports all currencies (it's just a bill)
        return true;

      case "paypal":
        // PayPal supports 25+ major currencies
        const paypalCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "ILS", "MXN", "BRL", "MYR", "PHP", "TWD", "THB", "SGD", "HKD", "NZD", "TRY", "INR"];
        return paypalCurrencies.includes(curr.toUpperCase());

      case "square":
        // Square primarily supports USD, CAD, GBP, AUD, JPY
        const squareCurrencies = ["USD", "CAD", "GBP", "AUD", "JPY"];
        return squareCurrencies.includes(curr.toUpperCase());

      default:
        // Unknown provider - assume it supports the currency
        return true;
    }
  };

  /**
   * Format amount for display
   */
  const formatAmount = (amountCents: number, curr: string): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
    }).format(amountCents / 100);
  };

  /**
   * Get display info for payment provider
   */
  const getProviderInfo = (code: string) => {
    switch (code) {
      case "stripe-connect":
        return {
          name: "Credit/Debit Card",
          icon: "💳",
          description: "Pay securely with Visa, Mastercard, or American Express",
        };
      case "paypal":
        return {
          name: "PayPal",
          icon: "🅿️",
          description: "Pay with your PayPal account",
        };
      case "square":
        return {
          name: "Square",
          icon: "◼️",
          description: "Pay with Square payment processing",
        };
      case "manual":
        return {
          name: "Manual Payment",
          icon: "📄",
          description: "Pay via wire transfer or invoice",
        };
      case "invoice":
        return {
          name: "Invoice (Pay Later)",
          icon: "📄",
          description: "An invoice will be sent to your employer for payment",
        };
      default:
        return {
          name: code,
          icon: "💰",
          description: "Secure payment processing",
        };
    }
  };

  const handleContinue = () => {
    if (selectedProvider) {
      onComplete(selectedProvider);
    }
  };

  return (
    <div className={styles.stepContainer}>
      {/* Header */}
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          <CreditCard size={24} />
          Choose Payment Method
        </h2>
        <p className={styles.stepSubtitle}>
          Select your preferred way to pay. All methods are secure.
        </p>
        {totalAmount > 0 && (
          <div style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#f3f4f6",
            border: "2px solid #d1d5db",
            borderRadius: "4px",
            textAlign: "center",
          }}>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Amount: </span>
            <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#6B46C1" }}>
              {formatAmount(totalAmount, currency)}
            </span>
          </div>
        )}
      </div>

      {/* Payment Providers */}
      <div className={styles.paymentOptions}>
        {paymentProviders.map((providerCode) => {
          const info = getProviderInfo(providerCode);
          const isSelected = selectedProvider === providerCode;
          const currencySupported = supportsCurrency(providerCode, currency);

          return (
            <button
              key={providerCode}
              type="button"
              onClick={() => currencySupported && setSelectedProvider(providerCode)}
              disabled={!currencySupported}
              className={`${styles.paymentOption} ${isSelected ? styles.paymentOptionSelected : ""}`}
              style={{
                opacity: currencySupported ? 1 : 0.5,
                cursor: currencySupported ? "pointer" : "not-allowed",
              }}
            >
              <div className={styles.paymentOptionContent}>
                {/* Icon */}
                <div className={styles.paymentIcon}>{info.icon}</div>

                {/* Info */}
                <div className={styles.paymentInfo}>
                  <h3 className={styles.paymentName}>{info.name}</h3>
                  <p className={styles.paymentDescription}>
                    {currencySupported
                      ? info.description
                      : `Not available for ${currency} currency`}
                  </p>
                </div>

                {/* Radio Button */}
                <div className={`${styles.radioButton} ${isSelected ? styles.radioButtonChecked : ""}`}>
                  {isSelected && <div className={styles.radioButtonInner} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className={styles.actionButtons}>
        <button
          type="button"
          onClick={onBack}
          className={styles.secondaryButton}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedProvider}
          className={styles.primaryButton}
        >
          Continue to Payment →
        </button>
      </div>
    </div>
  );
}
