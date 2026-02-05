"use client";

/**
 * PAYMENTS PAGE - Full-screen payment management
 *
 * Renders the PaymentsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { PaymentsWindow } from "@/components/window-content/payments-window";

export default function PaymentsPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <PaymentsWindow fullScreen />
    </div>
  );
}
