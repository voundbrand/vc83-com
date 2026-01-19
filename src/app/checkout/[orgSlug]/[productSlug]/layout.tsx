/**
 * Checkout Page Layout
 *
 * Ensures proper viewport containment for checkout pages on mobile.
 * The overflow-x-hidden on html/body prevents horizontal scroll
 * caused by any content that might overflow.
 */

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your purchase",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="checkout-layout"
      style={{
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}
