"use client";

/**
 * CHECKOUT PAGE CLIENT COMPONENT
 *
 * Public checkout page with Stripe integration
 */

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { CheckoutForm } from "@/components/checkout/checkout-form";
// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";

type CheckoutPageClientProps = {
  orgSlug: string;
  productSlug: string;
};

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

export function CheckoutPageClient({ orgSlug, productSlug }: CheckoutPageClientProps) {
  const [clientSecret] = useState<string | null>(null);
  const [error] = useState<string | null>(null);

  // TODO: Fetch organization by slug (use orgSlug)
  // TODO: Fetch product by slug (use productSlug)
  // TODO: Create Stripe PaymentIntent
  console.log("Loading checkout for:", orgSlug, productSlug);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-purple-900">
            L4YERCAK3 Checkout
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Product Info */}
            <div className="p-8 border-b">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Product Name
              </h2>
              <p className="text-gray-600 mb-4">
                Product description goes here
              </p>
              <div className="text-4xl font-bold text-purple-600">
                $49.00
              </div>
            </div>

            {/* Checkout Form */}
            <div className="p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm />
                </Elements>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">Loading checkout...</p>
                  <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              🔒 Secured by Stripe | Your payment info is encrypted
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
          Powered by <span className="font-semibold text-purple-600">L4YERCAK3</span>
        </div>
      </footer>
    </div>
  );
}
