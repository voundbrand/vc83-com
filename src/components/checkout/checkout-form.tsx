"use client";

/**
 * STRIPE CHECKOUT FORM
 *
 * Stripe Elements payment form for checkout pages
 */

import { useState, FormEvent } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { usePostHog } from "posthog-js/react";

export function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const posthog = usePostHog();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    if (error) {
      setMessage(error.message || "An error occurred");
      setIsProcessing(false);

      // Track payment failure
      posthog?.capture("payment_failed", {
        error_code: error.code,
        error_message: error.message,
        error_type: error.type,
        payment_method: error.payment_method?.type,
      });

      posthog?.capture("$exception", {
        error_type: "stripe_payment_failed",
        error_message: error.message || "Payment failed",
        error_code: error.code,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {message && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{message}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-4 px-6 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
}
