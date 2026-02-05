"use client";

/**
 * BENEFITS PAGE - Full-screen benefits management
 *
 * Renders the BenefitsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { BenefitsWindow } from "@/components/window-content/benefits-window";

export default function BenefitsPage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <BenefitsWindow fullScreen />
    </div>
  );
}
