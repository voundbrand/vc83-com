"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Package, Mail, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

export function CheckoutSuccessWindow() {
  const { t, isLoading } = useNamespaceTranslations("ui.checkout_success");
  const [showConfetti, setShowConfetti] = useState(true);

  // MUST call useEffect before any early returns to maintain hook order
  useEffect(() => {
    // Only run confetti if not loading
    if (isLoading) return;
    // Trigger confetti animation on mount
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        setShowConfetti(false);
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Launch confetti from different positions
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isLoading]); // Include isLoading in dependencies

  // Show loading state while translations load (AFTER all hooks)
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div style={{ color: "var(--win95-text)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-8">
        {/* Success Icon with Animation */}
        <div className="flex justify-center mb-6">
          <div
            className="relative"
            style={{
              animation: showConfetti ? "bounce 1s ease-in-out" : "none"
            }}
          >
            <div
              className="rounded-full p-6 inline-block"
              style={{
                backgroundColor: "var(--success)",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
              }}
            >
              <CheckCircle size={64} style={{ color: "white" }} />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold mb-3"
            style={{ color: "var(--success)" }}
          >
            {t("ui.checkout_success.title")}
          </h1>
          <p
            className="text-lg mb-2"
            style={{ color: "var(--win95-text)" }}
          >
            {t("ui.checkout_success.thank_you")}
          </p>
          <p
            className="text-sm"
            style={{ color: "var(--neutral-gray)" }}
          >
            {t("ui.checkout_success.subtitle")}
          </p>
        </div>

        {/* Info Cards */}
        <div className="space-y-4 max-w-md mx-auto">
          {/* Order Confirmation */}
          <div
            className="p-4 border-2 flex items-start gap-3"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)"
            }}
          >
            <Package
              size={24}
              style={{ color: "var(--win95-highlight)", flexShrink: 0 }}
            />
            <div className="flex-1">
              <h3
                className="font-bold text-sm mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                {t("ui.checkout_success.order_confirmed_title")}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--neutral-gray)" }}
              >
                {t("ui.checkout_success.order_confirmed_message")}
              </p>
            </div>
          </div>

          {/* Email Confirmation */}
          <div
            className="p-4 border-2 flex items-start gap-3"
            style={{
              backgroundColor: "var(--win95-bg-light)",
              borderColor: "var(--win95-border)"
            }}
          >
            <Mail
              size={24}
              style={{ color: "var(--win95-highlight)", flexShrink: 0 }}
            />
            <div className="flex-1">
              <h3
                className="font-bold text-sm mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                {t("ui.checkout_success.email_title")}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--neutral-gray)" }}
              >
                {t("ui.checkout_success.email_message")}
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
            <ArrowRight
              size={24}
              style={{ color: "var(--win95-highlight)", flexShrink: 0 }}
            />
            <div className="flex-1">
              <h3
                className="font-bold text-sm mb-1"
                style={{ color: "var(--win95-text)" }}
              >
                {t("ui.checkout_success.next_steps_title")}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--neutral-gray)" }}
              >
                {t("ui.checkout_success.next_steps_message")}
              </p>
            </div>
          </div>
        </div>

        {/* Thank You Message */}
        <div className="text-center mt-8">
          <p
            className="text-sm font-bold mb-2"
            style={{ color: "var(--win95-text)" }}
          >
            {t("ui.checkout_success.footer_title")}
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--neutral-gray)" }}
          >
            {t("ui.checkout_success.footer_message")}
          </p>
        </div>
      </div>

      {/* Inline bounce animation */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}
