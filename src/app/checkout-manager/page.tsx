"use client";

/**
 * CHECKOUT MANAGER PAGE - Full-screen checkout management
 *
 * Renders the CheckoutWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 *
 * Note: This is the checkout manager, not the public checkout page.
 * Public checkout pages are at /checkout/[orgSlug]/[productSlug]
 */

import { CheckoutWindow } from "@/components/window-content/checkout-window";

export default function CheckoutManagerPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <CheckoutWindow fullScreen />
    </div>
  );
}
