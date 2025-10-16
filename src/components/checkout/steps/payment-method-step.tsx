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
  onComplete: (provider: string) => void;
  onBack: () => void;
}

export function PaymentMethodStep({
  paymentProviders,
  initialSelection,
  onComplete,
  onBack,
}: PaymentMethodStepProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(
    initialSelection || null
  );

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
      </div>

      {/* Payment Providers */}
      <div className={styles.paymentOptions}>
        {paymentProviders.map((providerCode) => {
          const info = getProviderInfo(providerCode);
          const isSelected = selectedProvider === providerCode;

          return (
            <button
              key={providerCode}
              type="button"
              onClick={() => setSelectedProvider(providerCode)}
              className={`${styles.paymentOption} ${isSelected ? styles.paymentOptionSelected : ""}`}
            >
              <div className={styles.paymentOptionContent}>
                {/* Icon */}
                <div className={styles.paymentIcon}>{info.icon}</div>

                {/* Info */}
                <div className={styles.paymentInfo}>
                  <h3 className={styles.paymentName}>{info.name}</h3>
                  <p className={styles.paymentDescription}>{info.description}</p>
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
