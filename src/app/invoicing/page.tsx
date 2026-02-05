"use client";

/**
 * INVOICING PAGE - Full-screen invoicing management
 *
 * Renders the InvoicingWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { InvoicingWindow } from "@/components/window-content/invoicing-window";

export default function InvoicingPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <InvoicingWindow fullScreen />
    </div>
  );
}
