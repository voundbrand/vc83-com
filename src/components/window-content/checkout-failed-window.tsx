"use client";

import { useEffect, useState } from "react";
import { XCircle, CreditCard, RefreshCw, HelpCircle, ArrowLeft } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useWindowManager } from "@/hooks/use-window-manager";

interface CheckoutFailedWindowProps {
  reason?: string;
}

/**
 * CHECKOUT FAILED WINDOW
 *
 * Shows when a checkout is cancelled or fails.
 * Displays human-readable error messages and next steps.
 *
 * Failure reasons:
 * - cancel: User cancelled the checkout
 * - payment_failed: Payment was declined
 * - expired: Checkout session expired
 * - error: Generic error
 */
export function CheckoutFailedWindow({ reason = "cancel" }: CheckoutFailedWindowProps) {
  const { t, isLoading } = useNamespaceTranslations("ui.checkout_failed");
  const { closeWindow } = useWindowManager();
  const [showShake, setShowShake] = useState(true);

  // Brief shake animation on mount
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => setShowShake(false), 500);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Show loading state while translations load
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div style={{ color: "var(--win95-text)" }}>Loading...</div>
      </div>
    );
  }

  // Get human-readable error message based on reason
  const getErrorDetails = () => {
    switch (reason) {
      case "cancel":
        return {
          title: t("ui.checkout_failed.reason_cancel_title") || "Checkout Cancelled",
          message: t("ui.checkout_failed.reason_cancel_message") || "You cancelled the checkout process. No payment was taken.",
          icon: <ArrowLeft size={24} style={{ color: "var(--win95-highlight)" }} />,
        };
      case "payment_failed":
        return {
          title: t("ui.checkout_failed.reason_payment_title") || "Payment Declined",
          message: t("ui.checkout_failed.reason_payment_message") || "Your payment could not be processed. Please check your card details or try a different payment method.",
          icon: <CreditCard size={24} style={{ color: "var(--error)" }} />,
        };
      case "expired":
        return {
          title: t("ui.checkout_failed.reason_expired_title") || "Session Expired",
          message: t("ui.checkout_failed.reason_expired_message") || "Your checkout session has expired. Please start again from the store.",
          icon: <RefreshCw size={24} style={{ color: "var(--warning)" }} />,
        };
      case "error":
      default:
        return {
          title: t("ui.checkout_failed.reason_error_title") || "Something Went Wrong",
          message: t("ui.checkout_failed.reason_error_message") || "An unexpected error occurred during checkout. Please try again or contact support if the problem persists.",
          icon: <HelpCircle size={24} style={{ color: "var(--error)" }} />,
        };
    }
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-8">
        {/* Error Icon with Animation */}
        <div className="flex justify-center mb-6">
          <div
            className="relative"
            style={{
              animation: showShake ? "shake 0.5s ease-in-out" : "none"
            }}
          >
            <div
              className="rounded-full p-6 inline-block"
              style={{
                backgroundColor: "var(--error)",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
              }}
            >
              <XCircle size={64} style={{ color: "white" }} />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold mb-3"
            style={{ color: "var(--error)" }}
          >
            {t("ui.checkout_failed.title") || "Checkout Failed"}
          </h1>
          <p
            className="text-lg mb-2"
            style={{ color: "var(--win95-text)" }}
          >
            {errorDetails.title}
          </p>
          <p
            className="text-sm"
            style={{ color: "var(--neutral-gray)" }}
          >
            {errorDetails.message}
          </p>
        </div>

        {/* Info Cards */}
        <div className="space-y-4 max-w-md mx-auto">
          {/* What Happened */}
          <div
            className="p-4 border-2 flex items-start gap-3"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)"
            }}
          >
            {errorDetails.icon}
            <div className="flex-1">
              <h3
                className="font-bold text-sm mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                {t("ui.checkout_failed.what_happened_title") || "What Happened?"}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--neutral-gray)" }}
              >
                {errorDetails.message}
              </p>
            </div>
          </div>

          {/* No Charge */}
          <div
            className="p-4 border-2 flex items-start gap-3"
            style={{
              backgroundColor: "var(--success-bg, #f0fdf4)",
              borderColor: "var(--success)"
            }}
          >
            <CreditCard
              size={24}
              style={{ color: "var(--success)", flexShrink: 0 }}
            />
            <div className="flex-1">
              <h3
                className="font-bold text-sm mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                {t("ui.checkout_failed.no_charge_title") || "No Payment Taken"}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--neutral-gray)" }}
              >
                {t("ui.checkout_failed.no_charge_message") || "Don't worry - your card has not been charged. You can safely try again when you're ready."}
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div
            className="p-4 border-2 flex items-start gap-3"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)"
            }}
          >
            <RefreshCw
              size={24}
              style={{ color: "var(--win95-highlight)", flexShrink: 0 }}
            />
            <div className="flex-1">
              <h3
                className="font-bold text-sm mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                {t("ui.checkout_failed.next_steps_title") || "What Can I Do?"}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--neutral-gray)" }}
              >
                {t("ui.checkout_failed.next_steps_message") || "Close this window and visit the Store to try again. If you continue to have issues, please contact our support team."}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => closeWindow("checkout-failed")}
            className="px-6 py-2.5 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              border: "2px solid var(--win95-border)",
              color: "var(--win95-text)"
            }}
          >
            {t("ui.checkout_failed.close_button") || "Close"}
          </button>
        </div>

        {/* Support Message */}
        <div className="text-center mt-8">
          <p
            className="text-xs"
            style={{ color: "var(--neutral-gray)" }}
          >
            {t("ui.checkout_failed.support_message") || "Need help? Contact us at support@l4yercak3.com"}
          </p>
        </div>
      </div>

      {/* Inline shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-5px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(5px);
          }
        }
      `}</style>
    </div>
  );
}
