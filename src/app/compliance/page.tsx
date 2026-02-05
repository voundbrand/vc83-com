"use client";

/**
 * COMPLIANCE PAGE - Full-screen compliance management
 *
 * Renders the ComplianceWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { ComplianceWindow } from "@/components/window-content/compliance-window";

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-zinc-900">
      <ComplianceWindow fullScreen />
    </div>
  );
}
